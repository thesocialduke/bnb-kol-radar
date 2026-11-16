import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { snapshot } from "@/lib/db";
import { compact, full, langName, pct, shortDate } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { AnomalyPill, Delta, ScoreBar } from "@/components/bits";
import { GrowthChart } from "@/components/GrowthChart";
import { StarButton } from "@/components/shortlist";
import cfg from "@/config/scoring.json";

export const dynamicParams = false;

export function generateStaticParams() {
  return snapshot().ranked.map((a) => ({ handle: a.handle }));
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${handle}` };
}

const TIER_LABEL: Record<string, string> = Object.fromEntries(cfg.followerTiers.map((t) => [t.id, t.label]));

export default async function AccountPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const { byHandle, ts, posts, ranked } = snapshot();
  const a = byHandle.get(handle);
  if (!a || a.is_official || a.score == null) notFound();
  const series = ts.get(handle) ?? [];
  const all = posts.get(handle) ?? [];
  const bnbPosts = all.filter((p) => p.is_bnb).slice(0, 8);
  const w = cfg.weights;
  // LunarCrush pads some summaries with a stock sentence carrying older counts; keep only the description.
  const about = a.about ? a.about.split(/ They currently have /)[0].trim() : null;

  const components = [
    {
      key: "relevance",
      name: "Ecosystem relevance",
      weight: w.relevance,
      value: a.s_relevance,
      basis:
        a.relevance_share != null
          ? `${compact(a.bnb_engagements)} engagements on BNB Chain posts out of ${compact(a.interactions_30d)} on everything the account posted: ${(a.relevance_share * 100).toFixed(1)}%.` + ((a.relevance_confidence ?? 1) < 1 ? ` Scaled to ${Math.round((a.relevance_confidence ?? 1) * 100)}% because only ${a.bnb_posts} BNB Chain post${a.bnb_posts === 1 ? " is" : "s are"} in the data (${cfg.relevance.fullCreditPosts} needed for full credit).` : "")
          : "No 30-day engagement series for this account.",
    },
    {
      key: "engagement",
      name: "Engagement quality",
      weight: w.engagement,
      value: a.s_engagement,
      basis:
        a.eng_rate_pctile != null
          ? `${compact(a.eng_per_post)} engagements per post on ${compact(a.followers)} followers. Higher than ${a.eng_rate_pctile.toFixed(0)}% of the ${a.tier_peers} tracked accounts with ${TIER_LABEL[a.tier]} followers.`
          : "Not enough data to compare with accounts of similar size.",
    },
    {
      key: "growth",
      name: "Growth momentum",
      weight: w.growth,
      value: a.s_growth,
      basis:
        `Followers ${pct(a.follower_growth_pct)} over ${a.ts_days ?? 0} days` +
        (a.follower_growth_pctile != null ? ` (ahead of ${a.follower_growth_pctile.toFixed(0)}% of accounts)` : "") +
        `; engagement ${pct(a.eng_growth_pct, 0)} second half vs first` +
        (a.eng_growth_pctile != null ? ` (ahead of ${a.eng_growth_pctile.toFixed(0)}%).` : "."),
    },
    {
      key: "consistency",
      name: "Consistency",
      weight: w.consistency,
      value: a.s_consistency,
      basis: `A BNB Chain post in the daily top 100 on ${a.bnb_days} day${a.bnb_days === 1 ? "" : "s"} (${cfg.consistency.fullMarksBnbDays} earns full marks); posted on ${a.active_days ?? 0} of ${a.ts_days ?? 0} days overall.`,
    },
    {
      key: "authenticity",
      name: "Authenticity",
      weight: w.authenticity,
      value: a.s_authenticity,
      basis: a.anomaly_signals.length ? `100 minus ${a.anomaly_points} points from ${a.anomaly_signals.length} anomaly signal${a.anomaly_signals.length > 1 ? "s" : ""} below.` : "No anomaly signal triggered.",
    },
  ];
  const usedWeight = components.filter((c) => c.value != null).reduce((s, c) => s + c.weight, 0);

  return (
    <>
      <div className="pt-4 text-[12px]">
        <Link href="/leaderboard" className="text-mute hover:text-ink">← Leaderboard</Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4 border-b border-line pb-5 pt-3">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <Avatar src={a.avatar} handle={a.handle} size={56} />
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-semibold leading-tight tracking-tight">{a.name ?? a.handle}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-mute">
              <a href={`https://x.com/${a.handle}`} target="_blank" rel="noreferrer" className="num text-accent hover:underline">@{a.handle} ↗</a>
              <span>{langName(a.lang)}</span>
              <span>{TIER_LABEL[a.tier]} followers</span>
              {a.is_rising ? <span className="num rounded-sm bg-accent/15 px-1.5 py-px text-[10px] uppercase tracking-wide text-accent">Rising</span> : null}
            </div>
            {about ? (
              <p className="mt-2 max-w-[70ch] text-[13px] text-mute">
                {about}{/[.!?]$/.test(about) ? "" : "."} <span className="text-dim">(auto-generated summary)</span>
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="label">Quality score</div>
            <div className="num text-[40px] font-medium leading-none text-accent">{a.score.toFixed(1)}</div>
            <div className="num mt-1 text-[12px] text-mute">rank {a.rank} of {ranked.length}</div>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-line py-3">
        {[
          ["Followers", compact(a.followers)],
          ["30d follower growth", <Delta key="g" value={a.follower_growth_pct} />],
          ["Engagements, 30d", compact(a.interactions_30d)],
          ["Posts, 30d", full(a.posts_30d)],
          ["BNB Chain posts in top 100", full(a.bnb_posts)],
          ["Mindshare", `${a.mindshare_pct.toFixed(2)}%`],
        ].map(([l, v]) => (
          <div key={l as string}>
            <div className="label !text-[10px]">{l}</div>
            <div className="num text-[15px]">{v}</div>
          </div>
        ))}
        <div className="ml-auto"><StarButton handle={a.handle} withLabel /></div>
      </div>

      <div className="grid gap-x-8 lg:grid-cols-[3fr_2fr]">
        <section className="min-w-0 pt-6">
          <h2 className="mb-2 text-[15px] font-semibold">Score breakdown</h2>
          <div className="panel bg-panel">
            {components.map((c) => (
              <div key={c.key} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-b border-line/70 bg-panel px-3 py-2.5 last:border-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium">{c.name}</span>
                  <span className="num whitespace-nowrap text-[11px] text-dim">{c.weight}% weight</span>
                </div>
                <div className="num text-right">
                  {c.value != null ? (
                    <>
                      <span className="text-[15px] text-ink">{c.value.toFixed(1)}</span>
                      <span className="text-dim"> = {((c.value * c.weight) / usedWeight).toFixed(1)} pts</span>
                    </>
                  ) : (
                    <span className="text-dim">no data</span>
                  )}
                </div>
                <div className="col-span-2"><ScoreBar value={c.value} /></div>
                <p className="col-span-2 text-[12.5px] text-mute">{c.basis}</p>
              </div>
            ))}
          </div>
          {a.components_missing.length ? (
            <p className="mt-2 text-[12px] text-warn">
              {a.components_missing.join(", ")} could not be computed for this account. The other weights were rescaled to total 100; nothing was filled in.
            </p>
          ) : null}

          <h2 className="mb-2 mt-8 text-[15px] font-semibold">Followers and engagement, last {series.length} days</h2>
          <div className="panel bg-panel p-3">
            <GrowthChart data={series.map((r) => ({ date: r.date, followers: r.followers || null, interactions: r.interactions }))} />
          </div>
        </section>

        <section className="min-w-0 pt-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold">Engagement anomaly check</h2>
            <AnomalyPill level={a.anomaly_level} />
          </div>
          <div className="panel bg-panel p-3">
            <p className="text-[12.5px] text-mute">
              A heuristic estimate from public numbers. It shows where this account&apos;s pattern differs from accounts of similar size; it is not a finding about the account or the person behind it.
            </p>
            {a.anomaly_signals.length ? (
              <ul className="mt-3 flex flex-col gap-2.5">
                {a.anomaly_signals.map((s) => (
                  <li key={s.id} className="border-l-2 border-warn/60 pl-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13px] font-medium">{s.label}</span>
                      <span className="num text-[11px] text-dim">+{s.points}</span>
                    </div>
                    <p className="text-[12.5px] text-mute">{s.detail}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[13px]">None of the five signals triggered.</p>
            )}
            <dl className="num mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-line pt-3 text-[12px] text-mute">
              <dt>Eng/post vs expected</dt>
              <dd className="text-right text-ink">{a.eng_residual_z != null ? `${a.eng_residual_z > 0 ? "+" : ""}${a.eng_residual_z.toFixed(1)} sd` : "n/a"}</dd>
              <dt>Largest 1-day follower change</dt>
              <dd className="text-right text-ink">{pct(a.max_daily_follower_jump_pct)}</dd>
              <dt>Repetitive posts</dt>
              <dd className="text-right text-ink">{a.lc_repetitive_pct != null ? `${a.lc_repetitive_pct}%` : "n/a"}</dd>
              <dt>Spam-like posts</dt>
              <dd className="text-right text-ink">{a.lc_spam_pct != null ? `${a.lc_spam_pct}%` : "n/a"}</dd>
              <dt>Near-duplicate pairs</dt>
              <dd className="text-right text-ink">{a.dup_pairs ?? 0} in {a.posts_compared ?? 0} posts</dd>
            </dl>
          </div>

          <h2 className="mb-2 mt-8 text-[15px] font-semibold">Top BNB Chain posts</h2>
          {bnbPosts.length ? (
            <ul className="panel bg-panel">
              {bnbPosts.map((p) => (
                <li key={p.url} className="border-b border-line/70 bg-panel last:border-0">
                  <a href={p.url} target="_blank" rel="noreferrer" className="block px-3 py-2.5 hover:bg-raise">
                    <p className="line-clamp-3 text-[13px] text-ink">{p.text}</p>
                    <p className="num mt-1.5 flex justify-between text-[11.5px] text-dim">
                      <span>{shortDate(p.created)} · open on X ↗</span>
                      <span className="text-mute">{compact(p.engagements)} engagements</span>
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-mute">No BNB Chain posts held for this account.</p>
          )}
        </section>
      </div>
    </>
  );
}

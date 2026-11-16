import Link from "next/link";
import { snapshot } from "@/lib/db";
import { insights } from "@/lib/insights";
import { compact, full, longDate } from "@/lib/format";
import { Treemap } from "@/components/Treemap";
import { TopicChart } from "@/components/GrowthChart";
import { Avatar } from "@/components/Avatar";
import { Panel, Stat, StatGrid } from "@/components/bits";
import { extras, mediaSummary } from "@/lib/extras";

export default function Overview() {
  const { ranked, officials, topic, meta } = snapshot();
  const topicEng = topic.reduce((s, r) => s + r.interactions, 0);
  const sentiment = topic.length ? topic.reduce((s, r) => s + r.sentiment, 0) / topic.length : null;
  const latest = topic[topic.length - 1];
  const rankedEng = ranked.reduce((s, a) => s + a.bnb_engagements, 0);
  const tree = [...ranked]
    .sort((a, b) => b.bnb_engagements - a.bnb_engagements)
    .slice(0, 40)
    .map((a) => ({ handle: a.handle, name: a.name, value: a.bnb_engagements, share: (a.bnb_engagements / rankedEng) * 100 }));
  const ins = insights(ranked, officials);
  const top = ranked.slice(0, 5);
  const eco = extras.sov.filter((r) => r.kind === "ecosystem");
  const ecoMe = eco.find((r) => r.self);
  const ecoTotal = eco.reduce((t, r) => t + r.interactions, 0);
  const ecoRank = ecoMe ? [...eco].sort((a, b) => b.interactions - a.interactions).indexOf(ecoMe) + 1 : 0;
  const tick = extras.sov.filter((r) => r.kind === "ticker");
  const bnbT = tick.find((r) => r.self), solT = tick.find((r) => r.chain === "Solana"), suiT = tick.find((r) => r.chain === "Sui");
  const ms = mediaSummary();
  const lead = [
    ins[1],
    ecoMe
      ? {
          title: `BNB Chain holds ${((ecoMe.interactions / ecoTotal) * 100).toFixed(0)}% of conversation across ${eco.length} ecosystems, ranked ${ecoRank} of ${eco.length}`,
          body: `${compact(ecoMe.interactions)} engagements against ${eco.filter((r) => !r.self).sort((a, b) => b.interactions - a.interactions).map((r) => `${compact(r.interactions)} for ${r.chain}`).join(", ")}.${bnbT && solT && suiT && bnbT.sentiment != null ? ` On the coin alone, BNB sentiment is ${bnbT.sentiment}% positive against ${solT.sentiment}% for SOL and ${suiT.sentiment}% for SUI.` : ""}`,
          href: "/share-of-voice",
          cta: "Open share of voice",
        }
      : null,
    ms.total
      ? { title: `${ms.tier1} of ${ms.total} news articles came from established crypto press`, body: `${ms.aggregator} came from aggregators, data pages or syndication and ${ms.trade} from trade press, across ${ms.outlets} outlets in 30 days. Original reporting is the thin part of the coverage.`, href: "/media", cta: "Open media coverage" }
      : null,
  ].filter((x): x is NonNullable<typeof x> => !!x);
  const hero = lead.find((i) => i.href === "/rising") ?? null;
  const rest = [...lead.filter((i) => i !== hero), ins[0], ins[2]].filter(Boolean);
  const risers = ranked.filter((a) => a.is_rising && a.follower_growth_pct != null).sort((a, b) => b.follower_growth_pct! - a.follower_growth_pct!).slice(0, 5);
  const maxGrowth = Math.max(...risers.map((a) => a.follower_growth_pct!), 1);

  return (
    <>
      
      <Panel className="mt-4" title="What to act on" flush lead>
        <div className="grid gap-px bg-line lg:grid-cols-[5fr_4fr]">
          {hero ? (
            <article className="min-w-0 bg-panel p-5">
              <h2 className="max-w-[26ch] text-[22px] font-semibold leading-tight tracking-tight">{hero.title}</h2>
              <ul className="mt-5 flex max-w-[520px] flex-col">
                {risers.map((a) => (
                  <li key={a.handle} className="border-b border-line/70 last:border-0">
                    <Link href={`/account/${a.handle}`} className="grid grid-cols-[auto_minmax(0,1fr)_minmax(60px,120px)_56px] items-center gap-3 py-1.5 text-[13px] hover:bg-raise">
                      <Avatar src={a.avatar} handle={a.handle} size={24} />
                      <span className="truncate"><span className="font-medium">{a.name ?? a.handle}</span> <span className="num text-[11.5px] text-dim">{compact(a.followers)}</span></span>
                      <span className="block h-1.5 bg-raise"><span className="block h-full bg-accent" style={{ width: `${Math.max(2, (a.follower_growth_pct! / maxGrowth) * 100)}%` }} /></span>
                      <span className="num text-right">+{a.follower_growth_pct!.toFixed(0)}%</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-5 max-w-[62ch] text-[13.5px] text-mute">{hero.body}</p>
              <Link href={hero.href} className="mt-3 inline-block text-[13px] text-accent underline underline-offset-4">{hero.cta}</Link>
            </article>
          ) : null}
          <ul className="flex min-w-0 flex-col gap-px bg-line">
            {rest.map((i) => (
              <li key={i.title} className="flex-1 bg-panel">
                <Link href={i.href} className="block h-full px-5 py-3.5 hover:bg-raise">
                  <span className="block text-[14px] font-semibold leading-snug">{i.title}</span>
                  <span className="mt-1 block text-[12.5px] text-mute">{i.body}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <section className="pt-4" aria-label="Headline numbers">
        <StatGrid>
          <Stat label="Accounts scored" value={ranked.length} />
          <Stat label="Topic engagements, 30d" value={compact(topicEng)} />
          <Stat label="Sentiment, 30d average" value={sentiment != null ? `${sentiment.toFixed(0)}%` : "n/a"} />
          <Stat label="Rising accounts" value={ranked.filter((a) => a.is_rising).length} />
        </StatGrid>
      </section>

      <Panel className="mt-4" title="Mindshare" flush>
        <Treemap items={tree} />
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Panel title="BNB Chain engagement per day">
          <TopicChart data={topic.map((t) => ({ date: t.date, interactions: t.interactions, sentiment: t.sentiment }))} />
        </Panel>

        <Panel title="Highest quality scores" readout={<Link href="/leaderboard" className="text-accent underline underline-offset-4">All {ranked.length}</Link>} flush>
          <ol>
            {top.map((a) => (
              <li key={a.handle} className="border-b border-line/70 last:border-0">
                <Link href={`/account/${a.handle}`} className="flex items-center gap-3 px-3 py-2 hover:bg-raise">
                  <span className="num w-4 text-right text-dim">{a.rank}</span>
                  <Avatar src={a.avatar} handle={a.handle} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{a.name ?? a.handle}</span>
                    <span className="num block truncate text-[11.5px] text-dim">@{a.handle}<span className="mx-1.5 text-line">/</span>{compact(a.followers)} followers</span>
                  </span>
                  <span className="num text-[15px] font-medium text-ink">{a.score!.toFixed(1)}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <Panel className="mt-4" title="Official voices" flush>
        <ul className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
          {officials.map((a) => (
            <li key={a.handle} className="min-w-0 bg-panel">
              <a href={`https://x.com/${a.handle}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-3 py-2 hover:bg-raise">
                <Avatar src={a.avatar} handle={a.handle} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{a.name ?? a.handle}</span>
                  <span className="num block truncate text-[11.5px] text-dim">@{a.handle}<span className="mx-1.5 text-line">/</span>{compact(a.followers)} followers</span>
                </span>
                <span className="text-right">
                  <span className="num block text-[13px]">{compact(a.bnb_engagements)}</span>
                  <span className="label !text-[10px]">{a.bnb_posts} posts</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

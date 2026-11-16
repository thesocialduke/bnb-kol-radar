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
  const tick = extras.sov.filter((r) => r.kind === "ticker");
  const bnbT = tick.find((r) => r.self), solT = tick.find((r) => r.chain === "Solana"), suiT = tick.find((r) => r.chain === "Sui");
  const ms = mediaSummary();
  const lead = [
    ins[1],
    bnbT && solT && suiT && bnbT.sentiment != null
      ? { title: `$bnb sentiment is ${bnbT.sentiment}%, against ${solT.sentiment}% for Solana and ${suiT.sentiment}% for $sui`, body: `Over 30 days $bnb drew ${compact(bnbT.interactions)} engagements, ${(bnbT.interactions / suiT.interactions).toFixed(1)}x $sui, while Solana's topic drew ${compact(solT.interactions)}. BNB holds its ground on volume against Sui and trails both on how positively people talk about it.`, href: "/share-of-voice", cta: "Open share of voice" }
      : null,
    ms.total
      ? { title: `${ms.tier1} of ${ms.total} news articles came from established crypto press`, body: `${ms.aggregator} came from aggregators, data pages or syndication and ${ms.trade} from trade press, across ${ms.outlets} outlets in 30 days. Original reporting is the thin part of the coverage.`, href: "/media", cta: "Open media coverage" }
      : null,
  ].filter((x): x is NonNullable<typeof x> => !!x);
  const hero = lead.find((i) => i.href === "/share-of-voice") ?? null;
  const rest = [...lead.filter((i) => i !== hero), ins[0], ins[2]].filter(Boolean);
  const sentimentRows = [bnbT, solT, suiT].filter((r) => r && r.sentiment != null).map((r) => ({ label: r!.self ? "$bnb" : r!.chain === "Solana" ? "Solana" : "$sui", value: r!.sentiment!, self: r!.self }));

  return (
    <>
      
      <Panel className="mt-4" title="What to act on" flush lead>
        <div className="grid gap-px bg-line lg:grid-cols-[5fr_4fr]">
          {hero ? (
            <article className="min-w-0 bg-panel p-5">
              <h2 className="max-w-[26ch] text-[22px] font-semibold leading-tight tracking-tight">{hero.title}</h2>
              <ul className="mt-5 flex max-w-[460px] flex-col gap-2.5">
                {sentimentRows.map((r) => (
                  <li key={r.label} className="grid grid-cols-[64px_1fr_40px] items-center gap-3 text-[13px]">
                    <span className={r.self ? "font-semibold" : "text-mute"}>{r.label}</span>
                    <span className="block h-2 bg-raise"><span className="block h-full" style={{ width: `${r.value}%`, background: r.self ? "var(--color-accent)" : "var(--color-dim)" }} /></span>
                    <span className="num text-right">{r.value}%</span>
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

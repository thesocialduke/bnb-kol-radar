import type { Metadata } from "next";
import { extras, type SovRow } from "@/lib/extras";
import { compact, full, longDate } from "@/lib/format";
import { PageHead, Panel, Sparkline, Stat, StatGrid } from "@/components/bits";

export const metadata: Metadata = { title: "Share of voice" };

function Table({ rows, caption }: { rows: SovRow[]; caption: string }) {
  const max = Math.max(...rows.map((r) => r.interactions));
  const total = rows.reduce((s, r) => s + r.interactions, 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-[13px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line text-left">
            {["Chain", "Topic", "Engagements, 30d", "Share", "Posts", "Daily contributors", "Sentiment", "Trend"].map((h, i) => (
              <th key={h} scope="col" className={`label px-3 py-2 font-normal ${i > 1 && i < 7 ? "text-right" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...rows].sort((a, b) => b.interactions - a.interactions).map((r) => (
            <tr key={r.label} className={`border-b border-line/70 last:border-0 ${r.self ? "bg-raise" : ""}`}>
              <th scope="row" className="px-3 py-2.5 text-left font-medium">
                <span className={r.self ? "border-l-2 border-accent pl-2" : "pl-[10px]"}>{r.chain}</span>
              </th>
              <td className="num px-3 text-mute">{r.label}</td>
              <td className="px-3">
                <div className="num text-right">{compact(r.interactions)}</div>
                <span className="mt-1 block h-1 bg-raise"><span className="block h-full" style={{ width: `${Math.max(0.5, (r.interactions / max) * 100)}%`, background: r.self ? "var(--color-accent)" : "var(--color-dim)" }} /></span>
              </td>
              <td className="num px-3 text-right">{((r.interactions / total) * 100).toFixed(1)}%</td>
              <td className="num px-3 text-right text-mute">{compact(r.posts)}</td>
              <td className="num px-3 text-right text-mute">{full(r.contributorsDaily)}</td>
              <td className="num px-3 text-right text-mute">{r.sentiment != null ? `${r.sentiment}%` : "n/a"}</td>
              <td className="px-3"><Sparkline values={r.series} label={`Daily engagements for ${r.label}`} muted={!r.self} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ShareOfVoice() {
  const { sov } = extras;
  if (!sov.length) return <><PageHead title="Share of voice" /><p className="py-10 text-mute">No competitor series in this snapshot. Run npm run refresh.</p></>;
  const tickers = sov.filter((r) => r.kind === "ticker");
  const names = sov.filter((r) => r.kind === "name");
  const bnb = tickers.find((r) => r.self)!;
  const sol = tickers.find((r) => r.chain === "Solana");
  const sui = tickers.find((r) => r.chain === "Sui");
  const bnbName = names.find((r) => r.self)!;
  const otherNames = names.filter((r) => !r.self);
  const perPost = (r: SovRow) => r.interactions / r.posts;
  return (
    <>
      <PageHead title="BNB Chain against Solana, Sui and Base" sub={<>Social engagement on each chain&apos;s topic, {longDate(sov[0].from)} to {longDate(sov[0].to)}, all networks. Topics are matched like for like: tickers against tickers, chain names against chain names.</>} />
      <section className="pt-4">
        <StatGrid>
          <Stat label="$bnb engagements, 30d" value={compact(bnb.interactions)} note={sol ? `Solana's topic drew ${(sol.interactions / bnb.interactions).toFixed(0)}x as much` : undefined} />
          <Stat label="$bnb against $sui" value={sui ? `${(bnb.interactions / sui.interactions).toFixed(1)}x` : "n/a"} note={sui ? `${compact(sui.interactions)} for $sui` : undefined} />
          <Stat label="Engagements per post, $bnb" value={full(Math.round(perPost(bnb)))} note={sol ? `${full(Math.round(perPost(sol)))} for Solana` : undefined} />
          <Stat label="Sentiment, $bnb" value={bnb.sentiment != null ? `${bnb.sentiment}%` : "n/a"} note={sol?.sentiment != null ? `${sol.sentiment}% Solana, ${sui?.sentiment ?? "n/a"}% $sui` : undefined} />
        </StatGrid>
      </section>
      <Panel className="mt-4" title="Ticker conversation" readout="cashtag topics / share within this set" flush>
        <Table rows={tickers} caption="Ticker topics compared" />
        <p className="border-t border-line px-3 py-2 text-[12px] text-mute">Base has no token, so it has no row here. The source merges &ldquo;solana&rdquo; and &ldquo;$sol&rdquo; into one series, so Solana&apos;s row includes every mention of the name and is the widest net in the table.</p>
      </Panel>
      <Panel className="mt-4" title="Chain-name conversation" readout="posts that name the chain itself" flush>
        <Table rows={names} caption="Chain-name topics compared" />
        <p className="border-t border-line px-3 py-2 text-[12px] text-mute">
          &ldquo;bnb chain&rdquo; drew {compact(bnbName.interactions)} engagements against {otherNames.map((r) => `${compact(r.interactions)} for "${r.label}"`).join(", ")}. People rarely write &ldquo;Sui network&rdquo; or &ldquo;Base chain&rdquo; in full, so this table understates those chains; read it as evidence that &ldquo;BNB Chain&rdquo; is used as a name, not as a size ranking.
        </p>
      </Panel>
      <Panel className="mt-4" title="What is left out, and why" readout="limits of this comparison">
        <ul className="flex max-w-[80ch] list-disc flex-col gap-1.5 pl-5 text-[13px] text-mute">
          <li>The plain topics &ldquo;base&rdquo;, &ldquo;sui&rdquo; and &ldquo;bnb&rdquo; are excluded. Each returned far more volume than its ticker (for example over 250M engagements a day for &ldquo;base&rdquo;), which I read as the words matching unrelated posts.</li>
          <li>Topic definitions are the data provider&apos;s (LunarCrush). Share is share within the rows shown, not share of all crypto conversation.</li>
          <li>The topic list is in config/competitors.json and can be changed before a refresh.</li>
        </ul>
      </Panel>
    </>
  );
}

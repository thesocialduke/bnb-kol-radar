import type { Metadata } from "next";
import { extras, type SovRow } from "@/lib/extras";
import { compact, full, longDate } from "@/lib/format";
import { Panel, Sparkline, Stat, StatGrid } from "@/components/bits";

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
            {["Chain", "Coin", "Engagements, 30d", "Share", "Posts", "Daily contributors", "Positive sentiment", "Trend"].map((h, i) => (
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
  if (!sov.length) return <><p className="py-10 text-mute">No competitor series in this snapshot. Run npm run refresh.</p></>;
  const tickers = sov.filter((r) => r.kind === "ticker");
  const bnb = tickers.find((r) => r.self)!;
  const sol = tickers.find((r) => r.chain === "Solana");
  const sui = tickers.find((r) => r.chain === "Sui");
  const perPost = (r: SovRow) => r.interactions / r.posts;
  return (
    <>
            <section className="pt-4">
        <StatGrid>
          <Stat label="BNB engagements, 30d" value={compact(bnb.interactions)} />
          <Stat label="BNB against SUI" value={sui ? `${(bnb.interactions / sui.interactions).toFixed(1)}x` : "n/a"} />
          <Stat label="Engagements per post, BNB" value={full(Math.round(perPost(bnb)))} />
          <Stat label="Positive sentiment, BNB" value={bnb.sentiment != null ? `${bnb.sentiment}%` : "n/a"} />
        </StatGrid>
      </section>
      <Panel className="mt-4" title="Coin conversation, 30 days" flush lead>
        <Table rows={tickers} caption="Coin topics compared" />
      </Panel>
    </>
  );
}

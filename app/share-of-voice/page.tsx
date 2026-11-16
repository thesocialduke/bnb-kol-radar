import type { Metadata } from "next";
import { extras, type SovRow } from "@/lib/extras";
import { compact, full, longDate } from "@/lib/format";
import { Delta, Panel, Sparkline, Stat, StatGrid } from "@/components/bits";
import { PctLines } from "@/components/SovCharts";

export const metadata: Metadata = { title: "Share of voice" };

const perPost = (r: SovRow) => (r.posts ? r.interactions / r.posts : null);
// Second half of the window against the first half.
function momentum(r: SovRow) {
  const h = Math.floor(r.daily.length / 2);
  const a = r.daily.slice(0, h).reduce((s, d) => s + d.interactions, 0);
  const b = r.daily.slice(h).reduce((s, d) => s + d.interactions, 0);
  return a ? (b / a - 1) * 100 : null;
}

function Table({ rows, caption, topicHead }: { rows: SovRow[]; caption: string; topicHead?: string }) {
  const max = Math.max(...rows.map((r) => r.interactions));
  const total = rows.reduce((s, r) => s + r.interactions, 0);
  const heads = ["Chain", ...(topicHead ? [topicHead] : []), "Engagements", "Share", "Posts", "Per post", "Daily contributors", "Positive sentiment", "2nd half vs 1st", "Trend"];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-[13px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line text-left">
            {heads.map((h) => (
              <th key={h} scope="col" className={`label whitespace-nowrap px-3 py-2 font-normal ${["Chain", "Coin", "Trend"].includes(h) ? "" : "text-right"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...rows].sort((a, b) => b.interactions - a.interactions).map((r) => {
            const pp = perPost(r);
            return (
              <tr key={r.label} className={`border-b border-line/70 last:border-0 ${r.self ? "bg-raise" : ""}`}>
                <th scope="row" className="px-3 py-2.5 text-left font-medium">
                  <span className={r.self ? "border-l-2 border-accent pl-2" : "pl-[10px]"}>{r.chain}</span>
                </th>
                {topicHead ? <td className="num px-3 text-mute">{r.label}</td> : null}
                <td className="px-3">
                  <div className="num text-right">{compact(r.interactions)}</div>
                  <span className="mt-1 block h-1 bg-raise"><span className="block h-full" style={{ width: `${Math.max(0.5, (r.interactions / max) * 100)}%`, background: r.self ? "var(--color-accent)" : "var(--color-dim)" }} /></span>
                </td>
                <td className="num px-3 text-right">{((r.interactions / total) * 100).toFixed(1)}%</td>
                <td className="num px-3 text-right text-mute">{compact(r.posts)}</td>
                <td className="num px-3 text-right text-mute">{pp != null ? full(Math.round(pp)) : "n/a"}</td>
                <td className="num px-3 text-right text-mute">{full(r.contributorsDaily)}</td>
                <td className="num px-3 text-right text-mute">{r.sentiment != null ? `${r.sentiment}%` : "n/a"}</td>
                <td className="px-3 text-right"><Delta value={momentum(r)} /></td>
                <td className="px-3"><Sparkline values={r.series} label={`Daily engagements for ${r.label}`} muted={!r.self} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ShareOfVoice() {
  const { sov } = extras;
  const eco = sov.filter((r) => r.kind === "ecosystem");
  const coins = sov.filter((r) => r.kind === "ticker");
  const me = eco.find((r) => r.self);
  if (!me) return <p className="py-10 text-mute">No competitor series in this snapshot. Run npm run refresh.</p>;

  const total = eco.reduce((s, r) => s + r.interactions, 0);
  const ranked = [...eco].sort((a, b) => b.interactions - a.interactions);
  const dates = me.daily.map((d) => d.date);
  const at = (r: SovRow, date: string) => r.daily.find((d) => d.date === date);
  const shareData = dates.map((date) => {
    const day = eco.map((r) => at(r, date)?.interactions ?? 0);
    const sum = day.reduce((a, b) => a + b, 0);
    return Object.fromEntries([["date", date], ...eco.map((r, i) => [r.chain, sum ? +((day[i] / sum) * 100).toFixed(1) : null])]);
  });
  const sentData = dates.map((date) => Object.fromEntries([["date", date], ...eco.map((r) => [r.chain, at(r, date)?.sentiment ?? null])]));
  const sentMin = Math.min(...eco.flatMap((r) => r.daily.map((d) => d.sentiment ?? 100)));
  const series = eco.map((r) => ({ name: r.chain, self: r.self }));
  const nets = [...new Set(eco.flatMap((r) => r.networks.map((n) => n.network)))].sort((a, b) => (me.networks.find((n) => n.network === b)?.engagements ?? 0) - (me.networks.find((n) => n.network === a)?.engagements ?? 0));
  const bySentiment = [...eco].sort((a, b) => (b.sentiment ?? 0) - (a.sentiment ?? 0));

  return (
    <>
      <section className="pt-4">
        <StatGrid>
          <Stat label="BNB Chain share of the four" value={`${((me.interactions / total) * 100).toFixed(1)}%`} />
          <Stat label="Rank by engagement" value={`${ranked.indexOf(me) + 1} of ${eco.length}`} />
          <Stat label="Rank by positive sentiment" value={`${bySentiment.indexOf(me) + 1} of ${eco.length}`} />
          <Stat label="Engagement, 2nd half vs 1st" value={<Delta value={momentum(me)} />} />
        </StatGrid>
      </section>

      <Panel className="mt-4" title={`Ecosystem conversation, ${longDate(me.from)} to ${longDate(me.to)}`} flush lead>
        <Table rows={eco} caption="Ecosystem topics compared" />
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Daily share of the four ecosystems">
          <PctLines data={shareData} series={series} domain={[0, 70]} label="Each chain's share of daily ecosystem engagement" />
        </Panel>
        <Panel title="Positive sentiment per day">
          <PctLines data={sentData} series={series} domain={[Math.max(0, Math.floor(sentMin / 10) * 10 - 10), 100]} label="Daily positive sentiment for each ecosystem" endLabels={false} />
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-mute">
            <li className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-accent" />BNB Chain</li>
            <li className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-dim" />{eco.filter((r) => !r.self).map((r) => r.chain).join(", ")}</li>
          </ul>
        </Panel>
      </div>

      {nets.length ? (
        <Panel className="mt-4" title={`Where the conversation happens${me.summaryDate ? `, 24 hours to ${longDate(me.summaryDate)}` : ""}`} flush>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <caption className="sr-only">Share of each ecosystem&apos;s engagement by network</caption>
              <thead>
                <tr className="border-b border-line text-left">
                  <th scope="col" className="label px-3 py-2 font-normal">Chain</th>
                  {nets.map((n) => <th key={n} scope="col" className="label px-3 py-2 text-right font-normal">{n}</th>)}
                </tr>
              </thead>
              <tbody>
                {ranked.map((r) => {
                  const sum = r.networks.reduce((s, n) => s + n.engagements, 0);
                  return (
                    <tr key={r.chain} className={`border-b border-line/70 last:border-0 ${r.self ? "bg-raise" : ""}`}>
                      <th scope="row" className="px-3 py-2.5 text-left font-medium"><span className={r.self ? "border-l-2 border-accent pl-2" : "pl-[10px]"}>{r.chain}</span></th>
                      {nets.map((n) => {
                        const v = r.networks.find((x) => x.network === n)?.engagements;
                        return <td key={n} className="num px-3 text-right text-mute">{v != null && sum ? `${((v / sum) * 100).toFixed(v / sum < 0.01 ? 2 : 1)}%` : "n/a"}</td>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {coins.length ? (
        <Panel className="mt-4" title={`Coin conversation, ${longDate(coins[0].from)} to ${longDate(coins[0].to)}`} flush>
          <Table rows={coins} caption="Coin topics compared" topicHead="Coin" />
        </Panel>
      ) : null}
    </>
  );
}

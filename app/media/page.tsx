import type { Metadata } from "next";
import { extras, mediaSummary, tierLabel, tierOf, TIERS } from "@/lib/extras";
import { longDate, shortDate } from "@/lib/format";
import { Panel, Stat, StatGrid } from "@/components/bits";

export const metadata: Metadata = { title: "Media coverage" };

export default function Media() {
  const { articles, fetchedAt, queries } = extras.news;
  if (!articles.length) return <><p className="py-10 text-mute">No articles in this snapshot. Run npm run refresh.</p></>;
  const by = new Map<string, typeof articles>();
  for (const a of articles) by.set(a.domain || a.outlet, [...(by.get(a.domain || a.outlet) ?? []), a]);
  const ms = mediaSummary();
  const tiers = [...Object.keys(TIERS), "none"].map((t) => ({ t, n: articles.filter((a) => tierOf(a.domain) === t).length })).filter((x) => x.n);
  const outlets = [...by.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const top = outlets[0];
  const single = outlets.filter(([, l]) => l.length === 1).length;
  const days = new Map<string, number>();
  for (const a of articles) days.set(a.date, (days.get(a.date) ?? 0) + 1);
  const first = articles[articles.length - 1].date;
  const span: { date: string; n: number }[] = [];
  for (let d = new Date(first + "T00:00:00Z"); d.toISOString().slice(0, 10) <= articles[0].date; d.setUTCDate(d.getUTCDate() + 1)) {
    const k = d.toISOString().slice(0, 10);
    span.push({ date: k, n: days.get(k) ?? 0 });
  }
  const maxDay = Math.max(...span.map((s) => s.n));
  const maxOutlet = top[1].length;
  return (
    <>
      <section className="pt-4">
        <StatGrid>
          <Stat label="Articles found" value={articles.length} />
          <Stat label="From established crypto press" value={ms.tier1} />
          <Stat label="Most active outlet" value={top[1][0].outlet} />
          <Stat label="Busiest day" value={shortDate(span.find((s) => s.n === maxDay)!.date)} />
        </StatGrid>
      </section>

      <Panel className="mt-4" title="Coverage by kind of outlet">
        <div className="flex h-7 gap-[2px]" role="img" aria-label={tiers.map((x) => `${tierLabel(x.t)} ${x.n}`).join(", ")}>
          {tiers.map((x, i) => (
            <div key={x.t} title={`${tierLabel(x.t)}: ${x.n}`} style={{ flex: x.n, background: ["var(--color-accent)", "#b8923a", "#6f6a5c", "#45423a", "#2c2a25"][i] }} />
          ))}
        </div>
        <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-mute">
          {tiers.map((x, i) => (
            <li key={x.t} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 flex-none" style={{ background: ["var(--color-accent)", "#b8923a", "#6f6a5c", "#45423a", "#2c2a25"][i] }} />
              {tierLabel(x.t)} <span className="num text-ink">{x.n}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_3fr]">
        <Panel title="Coverage by outlet" flush>
          <ol className="max-h-[560px] overflow-y-auto">
            {outlets.map(([name, list]) => (
              <li key={name} className="grid grid-cols-[1fr_auto] items-center gap-x-3 border-b border-line/70 px-3 py-2 last:border-0">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{list[0].outlet}</span>
                  <span className="num block truncate text-[11.5px] text-dim">{tierLabel(tierOf(list[0].domain))}<span className="mx-1.5 text-line">/</span>{name}</span>
                </span>
                <span className="num text-[14px]">{list.length}</span>
                <span className="col-span-2 mt-1 block h-1 bg-raise"><span className="block h-full bg-accent" style={{ width: `${(list.length / maxOutlet) * 100}%` }} /></span>
              </li>
            ))}
          </ol>
        </Panel>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="Articles per day">
            <div className="flex h-[120px] items-end gap-[2px]" role="img" aria-label={`Articles per day, peaking at ${maxDay}`}>
              {span.map((s) => (
                <div key={s.date} className="flex h-full flex-1 items-end" title={`${shortDate(s.date)}: ${s.n} articles`}>
                  <div className="w-full rounded-t-[2px] bg-accent" style={{ height: `${(s.n / maxDay) * 100}%`, minHeight: s.n ? 2 : 0 }} />
                </div>
              ))}
            </div>
            <div className="readout mt-1.5 flex justify-between"><span>{shortDate(first)}</span><span>peak {maxDay}</span><span>{shortDate(articles[0].date)}</span></div>
          </Panel>
          <Panel title="Latest headlines" flush>
            <ul className="max-h-[400px] overflow-y-auto">
              {articles.map((a) => (
                <li key={a.url} className="border-b border-line/70 last:border-0">
                  <a href={a.url} target="_blank" rel="noreferrer" className="block px-3 py-2 hover:bg-raise">
                    <span className="block text-[13px] leading-snug">{a.title}</span>
                    <span className="num mt-0.5 block text-[11.5px] text-dim">{shortDate(a.date)}<span className="mx-1.5 text-line">/</span>{a.outlet}</span>
                  </a>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

    </>
  );
}

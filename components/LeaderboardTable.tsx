"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Row } from "@/lib/db";
import { compact, langName, pct } from "@/lib/format";
import { Avatar } from "./Avatar";
import { AnomalyPill, LangTag } from "./bits";
import { StarButton } from "./shortlist";

type SortKey = "score" | "followers" | "growth" | "bnbEng" | "engPerPost" | "mindshare";
const TIERS: Record<string, string> = { nano: "Under 10K", micro: "10K to 50K", mid: "50K to 250K", macro: "250K and up" };

function Th({ k, label, sort, setSort, className = "" }: { k: SortKey; label: string; sort: { key: SortKey; dir: 1 | -1 }; setSort: (k: SortKey) => void; className?: string }) {
  const active = sort.key === k;
  return (
    <th scope="col" className={`px-2 py-2 text-right font-normal ${className}`} aria-sort={active ? (sort.dir === -1 ? "descending" : "ascending") : "none"}>
      <button type="button" onClick={() => setSort(k)} className={`label inline-flex items-center gap-1 hover:text-ink ${active ? "!text-accent" : ""}`}>
        {label}
        <span aria-hidden="true" className="text-[9px]">{active ? (sort.dir === -1 ? "▼" : "▲") : ""}</span>
      </button>
    </th>
  );
}

export function LeaderboardTable({ rows, lockLang }: { rows: Row[]; lockLang?: string }) {
  const [q, setQ] = useState("");
  const [lang, setLang] = useState(lockLang ?? "all");
  const [anomaly, setAnomaly] = useState("all");
  const [tier, setTier] = useState("all");
  const [kind, setKind] = useState("all");
  const [risingOnly, setRisingOnly] = useState(false);
  const [sort, setSortState] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "score", dir: -1 });
  const setSort = (key: SortKey) => setSortState((s) => (s.key === key ? { key, dir: s.dir === -1 ? 1 : -1 } : { key, dir: -1 }));

  const langs = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.lang, (m.get(r.lang) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/^@/, "");
    const out = rows.filter(
      (r) =>
        (!needle || r.handle.toLowerCase().includes(needle) || (r.name ?? "").toLowerCase().includes(needle)) &&
        (lang === "all" || r.lang === lang) &&
        (anomaly === "all" || r.anomaly === anomaly) &&
        (tier === "all" || r.tier === tier) &&
        (kind === "all" || r.kind === kind) &&
        (!risingOnly || r.rising),
    );
    const k = sort.key;
    out.sort((a, b) => {
      const av = a[k], bv = b[k];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av - bv) * sort.dir;
    });
    return out;
  }, [rows, q, lang, anomaly, tier, kind, risingOnly, sort]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 py-3">
        <label className="sr-only" htmlFor="lb-search">Search accounts</label>
        <input id="lb-search" className="field w-full sm:w-56" placeholder="Search handle or name" value={q} onChange={(e) => setQ(e.target.value)} />
        {!lockLang ? (
          <>
            <label className="sr-only" htmlFor="lb-lang">Language</label>
            <select id="lb-lang" className="field" value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="all">All languages</option>
              {langs.map(([l, n]) => (
                <option key={l} value={l}>{langName(l)} ({n})</option>
              ))}
            </select>
          </>
        ) : null}
        <label className="sr-only" htmlFor="lb-tier">Audience size</label>
        <select id="lb-tier" className="field" value={tier} onChange={(e) => setTier(e.target.value)}>
          <option value="all">All sizes</option>
          {Object.entries(TIERS).map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="lb-kind">Account type</label>
        <select id="lb-kind" className="field" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="all">All account types</option>
          <option value="creator">Creators ({rows.filter((r) => r.kind === "creator").length})</option>
          <option value="brand">Brands and projects ({rows.filter((r) => r.kind === "brand").length})</option>
          <option value="unknown">Not classified ({rows.filter((r) => r.kind === "unknown").length})</option>
        </select>
        <label className="sr-only" htmlFor="lb-anomaly">Anomaly flag</label>
        <select id="lb-anomaly" className="field" value={anomaly} onChange={(e) => setAnomaly(e.target.value)}>
          <option value="all">Any anomaly flag</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <label className="flex cursor-pointer items-center gap-1.5 text-[13px] text-mute">
          <input id="lb-rising" type="checkbox" className="accent-[#f0b90b]" checked={risingOnly} onChange={(e) => setRisingOnly(e.target.checked)} />
          Rising only
        </label>
        <span className="num ml-auto text-[12px] text-dim">{shown.length} of {rows.length}</span>
      </div>

      <div className="panel bg-panel"><div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead className="bg-panel">
            <tr className="border-b border-line">
              <th scope="col" className="label w-10 px-2 py-2 text-right font-normal">#</th>
              <th scope="col" className="label px-2 py-2 text-left font-normal">Account</th>
              <Th k="score" label="Score" sort={sort} setSort={setSort} />
              <Th k="followers" label="Followers" sort={sort} setSort={setSort} className="hidden sm:table-cell" />
              <Th k="growth" label="30d growth" sort={sort} setSort={setSort} className="hidden sm:table-cell" />
              <Th k="bnbEng" label="BNB eng." sort={sort} setSort={setSort} className="hidden md:table-cell" />
              <Th k="mindshare" label="Mindshare" sort={sort} setSort={setSort} className="hidden lg:table-cell" />
              <Th k="engPerPost" label="Eng/post" sort={sort} setSort={setSort} className="hidden lg:table-cell" />
              <th scope="col" className="label hidden px-2 py-2 text-left font-normal md:table-cell">Anomaly</th>
              <th scope="col" className="w-10 px-2 py-2"><span className="sr-only">Shortlist</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.handle} className="border-b border-line/70 last:border-0 hover:bg-panel">
                <td className="num px-2 py-1.5 text-right text-dim">{r.rank}</td>
                <td className="w-full max-w-0 px-2 py-1.5">
                  <Link href={`/account/${r.handle}`} className="flex min-w-0 items-center gap-2.5">
                    <Avatar src={r.avatar} handle={r.handle} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-medium text-ink">{r.name ?? r.handle}</span>
                        <LangTag lang={r.lang} />
                        {r.rising ? <span className="num hidden shrink-0 rounded-sm bg-accent/15 px-1.5 py-px text-[10px] uppercase tracking-wide text-accent sm:inline">Rising</span> : null}
                      </span>
                      <span className="num block truncate text-[11.5px] text-dim">{r.kind === "brand" ? <span className="mr-1.5 text-warn">Brand</span> : null}@{r.handle}<span className="sm:hidden"> · {compact(r.followers)}</span></span>
                    </span>
                  </Link>
                </td>
                <td className="num px-2 py-1.5 text-right text-[14px] font-medium text-accent">{r.score.toFixed(1)}</td>
                <td className="num hidden px-2 py-1.5 text-right sm:table-cell">{compact(r.followers)}</td>
                <td className={`num hidden px-2 py-1.5 text-right sm:table-cell ${r.growth == null ? "text-dim" : r.growth > 0.05 ? "text-up" : r.growth < -0.05 ? "text-down" : "text-mute"}`}>{pct(r.growth)}</td>
                <td className="num hidden px-2 py-1.5 text-right md:table-cell">{compact(r.bnbEng)}</td>
                <td className="num hidden px-2 py-1.5 text-right text-mute lg:table-cell">{r.mindshare.toFixed(2)}%</td>
                <td className="num hidden px-2 py-1.5 text-right text-mute lg:table-cell">{compact(r.engPerPost)}</td>
                <td className="hidden px-2 py-1.5 md:table-cell"><AnomalyPill level={r.anomaly} /></td>
                <td className="px-2 py-1.5 text-right"><StarButton handle={r.handle} /></td>
              </tr>
            ))}
            {!shown.length ? (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-mute">No accounts match these filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div></div>
      <p className="mt-2 text-[12px] text-dim">
        BNB eng. is engagement on the account&apos;s BNB Chain posts that reached a daily top 100. The anomaly flag is a heuristic estimate, not a verdict on the account.
      </p>
    </div>
  );
}

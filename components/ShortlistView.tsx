"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Row } from "@/lib/db";
import { compact, full, pct } from "@/lib/format";
import { Avatar } from "./Avatar";
import { STATUSES, type Status, useShortlist } from "./shortlist";

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function ShortlistView({ rows }: { rows: Row[] }) {
  const { list, toggle, update } = useShortlist();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const byHandle = new Map(rows.map((r) => [r.handle, r]));
  const items = Object.entries(list)
    .map(([handle, e]) => ({ handle, e, r: byHandle.get(handle) }))
    .filter((x) => x.r)
    .sort((a, b) => a.e.addedAt.localeCompare(b.e.addedAt));

  const exportCsv = () => {
    const head = ["handle", "name", "x_url", "status", "fee_usd", "deliverables", "posts_agreed", "engagements_delivered", "cost_per_engagement_usd", "notes", "score", "rank", "followers", "follower_growth_30d_pct", "bnb_chain_engagements", "language", "anomaly_flag", "added_at"];
    const lines = items.map(({ handle, e, r }) =>
      [handle, r!.name, `https://x.com/${handle}`, e.status, e.fee ?? "", e.deliverables ?? "", e.postsAgreed ?? "", e.engDelivered ?? "", e.fee && e.engDelivered ? (e.fee / e.engDelivered).toFixed(4) : "", e.notes, r!.score.toFixed(1), r!.rank, r!.followers, r!.growth?.toFixed(2), r!.bnbEng, r!.lang, r!.anomaly, e.addedAt].map(csvCell).join(","),
    );
    const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bnb-chain-kol-campaigns.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!ready) return <p className="py-10 text-center text-mute">Loading your shortlist…</p>;

  if (!items.length)
    return (
      <div className="mt-6 rounded-md border border-dashed border-line px-4 py-12 text-center">
        <p className="text-[15px] font-medium">No accounts in the tracker yet</p>
        {(() => {
          const ex = rows.find((r) => r.rising && r.engPerPost);
          if (!ex) return null;
          const fee = 500, posts = 2;
          return (
            <div className="panel mx-auto mt-5 max-w-[520px] bg-panel p-3 text-left">
              <p className="label mb-2">Example row with a made-up fee</p>
              <p className="font-medium">{ex.name ?? ex.handle} <span className="num text-[12px] text-dim">@{ex.handle}</span></p>
              <dl className="num mt-2 grid grid-cols-3 gap-2 text-[12px] text-mute">
                <div><dt className="label">Fee, USD</dt><dd className="text-ink">${fee}</dd></div>
                <div><dt className="label">Posts agreed</dt><dd className="text-ink">{posts}</dd></div>
                <div><dt className="label">Est. cost per engagement</dt><dd className="text-ink">${(fee / (posts * ex.engPerPost!)).toFixed(3)}</dd></div>
              </dl>
            </div>
          );
        })()}
        <div className="mt-4 flex justify-center gap-3 text-[13px]">
          <Link href="/rising" className="rounded-sm bg-accent px-3 py-1.5 font-medium text-bg hover:brightness-110">Browse rising accounts</Link>
          <Link href="/leaderboard" className="rounded-sm border border-line px-3 py-1.5 text-ink hover:border-mute">Open the leaderboard</Link>
        </div>
      </div>
    );

  const n = (v: string) => (v === "" || isNaN(Number(v)) || Number(v) < 0 ? null : Number(v));
  const usd = (v: number) => (v < 1 ? `$${v.toFixed(3)}` : `$${v.toFixed(2)}`);
  const spend = items.reduce((t, i) => t + (i.e.fee ?? 0), 0);
  const paidDelivered = items.filter((i) => i.e.fee && i.e.engDelivered);
  const delivered = items.reduce((t, i) => t + (i.e.engDelivered ?? 0), 0);
  const blended = paidDelivered.length ? paidDelivered.reduce((t, i) => t + i.e.fee!, 0) / paidDelivered.reduce((t, i) => t + i.e.engDelivered!, 0) : null;
  const counts = STATUSES.map((s) => [s, items.filter((i) => i.e.status === s).length] as const);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 py-3">
        <p className="num text-[12px] text-mute">
          {counts.map(([s, n], i) => (
            <span key={s}>{i ? ", " : ""}<span className="text-ink">{n}</span> {s}</span>
          ))}
        </p>
        <button type="button" onClick={exportCsv} className="rounded-sm bg-accent px-3 py-1.5 text-[13px] font-medium text-bg hover:brightness-110">
          Export {items.length} as CSV
        </button>
      </div>
      <dl className="panel mb-4 grid grid-cols-2 gap-px bg-line md:grid-cols-4">
        {[
          ["Accounts", String(items.length)],
          ["Fees entered", spend ? `$${full(spend)}` : "none yet"],
          ["Engagements delivered", delivered ? compact(delivered) : "none yet"],
          ["Blended cost per engagement", blended != null ? usd(blended) : "needs a fee and a result"],
        ].map(([l, v]) => (
          <div key={l} className="bg-panel px-4 py-3">
            <dt className="label">{l}</dt>
            <dd className="num mt-1 text-[18px]">{v}</dd>
          </div>
        ))}
      </dl>
      <ul className="panel bg-panel">
        {items.map(({ handle, e, r }) => (
          <li key={handle} className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-2 border-b border-line/70 bg-panel px-3 py-3 last:border-0 md:grid-cols-[minmax(0,1.6fr)_auto_minmax(0,2fr)_auto]">
            <Link href={`/account/${handle}`} className="flex min-w-0 items-center gap-3">
              <Avatar src={r!.avatar} handle={handle} size={34} />
              <span className="min-w-0">
                <span className="block truncate font-medium">{r!.name ?? handle}</span>
                <span className="num block truncate text-[11.5px] text-dim">
                  @{handle} · score <span className="text-accent">{r!.score.toFixed(1)}</span> · {compact(r!.followers)} · {pct(r!.growth)}
                </span>
              </span>
            </Link>
            <div>
              <label className="sr-only" htmlFor={`status-${handle}`}>Status for @{handle}</label>
              <select id={`status-${handle}`} className="field" value={e.status} onChange={(ev) => update(handle, { status: ev.target.value as Status })}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="sr-only" htmlFor={`notes-${handle}`}>Notes for @{handle}</label>
              <textarea id={`notes-${handle}`} className="field block w-full resize-y" rows={1} placeholder="Notes: rate, contact, angle" value={e.notes} onChange={(ev) => update(handle, { notes: ev.target.value })} />
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-2 md:col-span-4 md:grid-cols-[110px_minmax(0,1fr)_110px_150px_minmax(0,1.3fr)]">
              <label className="block">
                <span className="label mb-1 block">Fee, USD</span>
                <input className="field num w-full" inputMode="decimal" value={e.fee ?? ""} onChange={(ev) => update(handle, { fee: n(ev.target.value) })} />
              </label>
              <label className="col-span-2 block md:col-span-1">
                <span className="label mb-1 block">Deliverables</span>
                <input className="field w-full" placeholder="2 threads, 1 AMA" value={e.deliverables ?? ""} onChange={(ev) => update(handle, { deliverables: ev.target.value })} />
              </label>
              <label className="block">
                <span className="label mb-1 block">Posts agreed</span>
                <input className="field num w-full" inputMode="numeric" value={e.postsAgreed ?? ""} onChange={(ev) => update(handle, { postsAgreed: n(ev.target.value) })} />
              </label>
              <label className="block">
                <span className="label mb-1 block">Engagements delivered</span>
                <input className="field num w-full" inputMode="numeric" value={e.engDelivered ?? ""} onChange={(ev) => update(handle, { engDelivered: n(ev.target.value) })} />
              </label>
              <p className="col-span-2 self-end text-[12px] text-mute md:col-span-1">
                {e.fee && e.engDelivered ? (
                  <>Actual: <span className="num text-ink">{usd(e.fee / e.engDelivered)}</span> per engagement.</>
                ) : e.fee && e.postsAgreed && r!.engPerPost ? (
                  <>Estimate: <span className="num text-ink">{usd(e.fee / (e.postsAgreed * r!.engPerPost))}</span> per engagement if each post matches their 30-day average of {compact(r!.engPerPost)}.</>
                ) : (
                  <>Enter a fee and posts agreed for an estimate, or a result for the actual cost.</>
                )}
              </p>
            </div>
            <button type="button" onClick={() => toggle(handle)} className="col-span-2 justify-self-start text-[12px] text-dim hover:text-down md:col-span-1 md:justify-self-end md:pt-1.5">
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

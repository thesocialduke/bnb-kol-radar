"use client";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export type Status = "to contact" | "contacted" | "in talks" | "signed";
export const STATUSES: Status[] = ["to contact", "contacted", "in talks", "signed"];
export type Entry = { status: Status; notes: string; addedAt: string; fee?: number | null; deliverables?: string; postsAgreed?: number | null; engDelivered?: number | null };
export type Shortlist = Record<string, Entry>;

const KEY = "kol-radar-shortlist-v1";
const EVT = "kol-radar-shortlist";
let memo: { raw: string | null; value: Shortlist } = { raw: null, value: {} };

function read(): Shortlist {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === memo.raw) return memo.value;
    memo = { raw, value: raw ? (JSON.parse(raw) as Shortlist) : {} };
    return memo.value;
  } catch {
    return memo.value;
  }
}

function write(next: Shortlist) {
  const raw = JSON.stringify(next);
  memo = { raw, value: next };
  try {
    window.localStorage.setItem(KEY, raw);
  } catch {
    // Storage blocked: the list still works for this visit.
  }
  window.dispatchEvent(new Event(EVT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}

const EMPTY: Shortlist = {};

export function useShortlist() {
  const list = useSyncExternalStore(subscribe, read, () => EMPTY);
  const toggle = useCallback((handle: string) => {
    const cur = { ...read() };
    if (cur[handle]) delete cur[handle];
    else cur[handle] = { status: "to contact", notes: "", addedAt: new Date().toISOString() };
    write(cur);
  }, []);
  const update = useCallback((handle: string, patch: Partial<Entry>) => {
    const cur = { ...read() };
    if (!cur[handle]) return;
    cur[handle] = { ...cur[handle], ...patch };
    write(cur);
  }, []);
  return { list, toggle, update };
}

export function StarButton({ handle, withLabel = false }: { handle: string; withLabel?: boolean }) {
  const { list, toggle } = useShortlist();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const on = ready && !!list[handle];
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(handle);
      }}
      aria-pressed={on}
      aria-label={on ? `Remove @${handle} from shortlist` : `Add @${handle} to shortlist`}
      className={`inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-1 text-[12px] leading-none transition-colors ${
        on ? "border-accent/60 text-accent" : "border-line text-dim hover:border-mute hover:text-ink"
      } ${withLabel ? "px-2.5 py-1.5" : ""}`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3.5l2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.3 9.9l6-.9z" />
      </svg>
      {withLabel ? <span>{on ? "Shortlisted" : "Add to shortlist"}</span> : null}
    </button>
  );
}

export function ShortlistCount() {
  const { list } = useShortlist();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const n = ready ? Object.keys(list).length : 0;
  if (!n) return null;
  return <span className="num ml-1 rounded-sm bg-accent px-1 text-[10px] font-semibold text-bg">{n}</span>;
}

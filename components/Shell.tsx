"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ShortlistCount } from "./shortlist";

const I = ({ d, children }: { d?: string; children?: React.ReactNode }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d ? <path d={d} /> : children}
  </svg>
);

const GROUPS = [
  {
    name: "Monitor",
    items: [
      { href: "/", label: "Overview", icon: <I><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><path d="M12 12l6-6" /></I> },
      { href: "/leaderboard", label: "Leaderboard", icon: <I d="M4 6h16M4 12h11M4 18h7" /> },
      { href: "/rising", label: "Rising", icon: <I d="M3 17l6-6 4 4 8-8M15 7h6v6" /> },
      { href: "/share-of-voice", label: "Share of voice", icon: <I d="M5 20V10M12 20V4M19 20v-7" /> },
      { href: "/media", label: "Media coverage", icon: <I d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5" /> },
      { href: "/chinese", label: "Chinese-language", icon: <span className="flex h-4 w-4 flex-none items-center justify-center text-[13px] leading-none" aria-hidden="true">文</span> },
    ],
  },
  {
    name: "Work",
    items: [
      { href: "/shortlist", label: "Campaign tracker", icon: <I d="M12 3.5l2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.3 9.9l6-.9z" /> },
      { href: "/findings", label: "Findings", icon: <I d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6" /> },
    ],
  },
  {
    name: "Reference",
    items: [{ href: "/methodology", label: "Methodology", icon: <I d="M5 7h9M18 7h1M5 17h2M11 17h8M14 4.5v5M7 14.5v5" /> }],
  },
];

const TITLES: Record<string, string> = { "/": "Overview", "/leaderboard": "Leaderboard", "/rising": "Rising", "/chinese": "Chinese-language", "/shortlist": "Campaign tracker", "/share-of-voice": "Share of voice", "/media": "Media coverage", "/findings": "Findings", "/methodology": "Methodology" };
const KEY = "kol-radar-sidebar";

export function Shell({ asOf, accounts, posts, footer, children }: { asOf: string; accounts: number; posts: string; footer: React.ReactNode; children: React.ReactNode }) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const [light, setLight] = useState(false);
  useEffect(() => setLight(document.documentElement.dataset.theme === "light"), []);
  const flipTheme = () => {
    const next = !light;
    setLight(next);
    if (next) document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    try {
      window.localStorage.setItem("kol-radar-theme", next ? "light" : "dark");
    } catch {}
  };

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(KEY) === "1");
    } catch {}
  }, []);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggle = () => {
    setCollapsed((c) => {
      try {
        window.localStorage.setItem(KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  };

  const title = path.startsWith("/account/") ? `@${path.split("/")[2]}` : (TITLES[path] ?? "");
  const section = path.startsWith("/account/") ? "Leaderboard" : null;

  return (
    <div className="shell" data-collapsed={collapsed} data-open={open}>
      <button type="button" className="sb-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />
      <aside className="sidebar" id="sidebar" aria-label="Main menu">
        <Link href="/" className="flex h-12 flex-none items-center gap-2.5 border-b border-line px-[19px]" title="BNB Chain KOL Radar">
          <svg width="18" height="18" viewBox="0 0 126.61 126.61" className="flex-none" fill="#F0B90B" role="img" aria-label="BNB">
            <path d="m38.73 53.2 24.59-24.58 24.6 24.6 14.3-14.31-38.9-38.91-38.9 38.9z" />
            <path d="m0 63.31 14.3-14.31 14.31 14.31-14.31 14.3z" />
            <path d="m38.73 73.41 24.59 24.59 24.6-24.6 14.31 14.29-38.9 38.91-38.91-38.88z" />
            <path d="m98 63.31 14.3-14.31 14.31 14.3-14.31 14.32z" />
            <path d="m77.83 63.3-14.51-14.52-10.73 10.73-1.24 1.23-2.54 2.54 14.51 14.5 14.51-14.47z" />
          </svg>
          <span className="sb-label truncate text-[14px] font-semibold tracking-tight">
            KOL Radar <span className="font-normal text-dim">BNB Chain</span>
          </span>
        </Link>

        <nav className="flex-1 overflow-y-auto py-3" aria-label="Sections">
          {GROUPS.map((g) => (
            <div key={g.name} className="mb-3">
              <div className="sb-label readout px-[20px] pb-1.5">{g.name}</div>
              {g.items.map((l) => {
                const active = l.href === "/" ? path === "/" : path.startsWith(l.href) || (l.href === "/leaderboard" && path.startsWith("/account/"));
                return (
                  <Link key={l.href} href={l.href} className="nav-item" aria-current={active ? "page" : undefined} title={collapsed ? l.label : undefined}>
                    {l.icon}
                    <span className="sb-label flex-1">{l.label}</span>
                    {l.href === "/shortlist" ? <span className="sb-label"><ShortlistCount /></span> : null}
                    <span className="sr-only">{collapsed ? l.label : ""}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="flex-none border-t border-line">
          <dl className="sb-label readout grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-[20px] py-3">
            <dt>Snapshot</dt>
            <dd className="text-right text-mute">{asOf}</dd>
            <dt>Accounts</dt>
            <dd className="text-right text-mute">{accounts}</dd>
            <dt>Posts read</dt>
            <dd className="text-right text-mute">{posts}</dd>
          </dl>
          <button type="button" onClick={toggle} aria-expanded={!collapsed} aria-controls="sidebar" className="sb-collapse nav-item !mx-0 w-full !rounded-none border-t border-line !border-l-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={collapsed ? "rotate-180" : ""}>
              <path d="M4 4v16M19 12H9M13 8l-4 4 4 4" />
            </svg>
            <span className="sb-label">Collapse menu</span>
            <span className="sr-only">{collapsed ? "Expand menu" : ""}</span>
          </button>
        </div>
      </aside>

      <div className="canvas flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-12 flex-none items-center gap-3 border-b border-line bg-bg/95 px-4 backdrop-blur lg:px-6">
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} aria-controls="sidebar" className="-ml-1.5 flex h-8 w-8 items-center justify-center rounded-sm text-mute hover:bg-raise hover:text-ink lg:hidden">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <div className="flex min-w-0 items-baseline gap-2 text-[13px]">
            {section ? (
              <>
                <Link href="/leaderboard" className="text-mute hover:text-ink">{section}</Link>
                <span className="text-dim">/</span>
              </>
            ) : null}
            <span className="truncate font-medium">{title}</span>
          </div>
          <div className="readout ml-auto flex flex-none items-center gap-4">
            <span className="hidden sm:inline">30-day window</span>
            <span>
              Data as of <span className="text-ink">{asOf}</span>
            </span>
            <button type="button" onClick={flipTheme} aria-pressed={light} className="flex h-8 items-center gap-1.5 rounded-sm border border-line px-2 text-mute hover:bg-raise hover:text-ink">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                {light ? <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /> : <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>}
              </svg>
              <span className="hidden sm:inline">{light ? "Dark view" : "Light view"}</span>
              <span className="sr-only sm:hidden">{light ? "Dark view" : "Light view"}</span>
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 pb-14 lg:px-6">{children}</main>
        <footer className="border-t border-line bg-bg px-4 py-4 text-[12px] text-mute lg:px-6">{footer}</footer>
      </div>
    </div>
  );
}

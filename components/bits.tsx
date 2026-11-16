import { langName, pct } from "@/lib/format";

export function AnomalyPill({ level }: { level: "low" | "medium" | "high" }) {
  const map = {
    low: "text-mute border-line",
    medium: "text-warn border-warn/40",
    high: "text-down border-down/50",
  } as const;
  return (
    <span className={`num inline-block rounded-sm border px-1.5 py-px text-[11px] capitalize ${map[level]}`} title="Heuristic estimate, not a verdict">
      {level}
    </span>
  );
}

export function LangTag({ lang }: { lang: string }) {
  return (
    <span className="num shrink-0 rounded-sm bg-raise px-1.5 py-px text-[11px] uppercase text-mute" title={langName(lang)}>
      {lang === "unknown" ? "?" : lang}
    </span>
  );
}

export function Delta({ value, digits = 1 }: { value: number | null; digits?: number }) {
  if (value == null) return <span className="num text-dim">n/a</span>;
  const cls = value > 0.05 ? "text-up" : value < -0.05 ? "text-down" : "text-mute";
  return <span className={`num ${cls}`}>{pct(value, digits)}</span>;
}

export function ScoreBar({ value, max = 100 }: { value: number | null; max?: number }) {
  const w = value == null ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <span className="meter" role="img" aria-label={value == null ? "No data" : `${value.toFixed(0)} of ${max}`}>
      <span style={{ width: `${w}%` }} />
    </span>
  );
}

export function Sparkline({ values, width = 96, height = 26, label, muted = false }: { values: number[]; width?: number; height?: number; label?: string; muted?: boolean }) {
  const c = muted ? "var(--color-mute)" : "var(--color-accent)";
  if (values.length < 2) return <span className="num text-[11px] text-dim">no series</span>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${height} L${pts[0][0].toFixed(1)},${height} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label ?? "Followers"} from ${min.toLocaleString("en-US")} to ${max.toLocaleString("en-US")}`}>
      <path d={area} fill={c} opacity="0.12" />
      <path d={line} fill="none" stroke={c} strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2" fill={c} />
    </svg>
  );
}

export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 bg-panel px-4 py-3">
      <div className="label">{label}</div>
      <div className="num mt-1.5 truncate text-[24px] font-medium leading-none text-ink">{value}</div>
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-px panel bg-line md:grid-cols-4">{children}</div>;
}

export function Panel({ title, readout, children, className = "", flush = false, lead = false }: { title: string; readout?: React.ReactNode; children: React.ReactNode; className?: string; flush?: boolean; lead?: boolean }) {
  return (
    <section className={`panel min-w-0 bg-panel ${lead ? "panel-lead" : ""} ${className}`}>
      <div className="panel-head">
        <h2>{title}</h2>
        {readout ? <div className="readout">{readout}</div> : null}
      </div>
      <div className={flush ? "" : "p-3"}>{children}</div>
    </section>
  );
}

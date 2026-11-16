"use client";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { shortDate } from "@/lib/format";

type Series = { name: string; self: boolean };
const tip = { background: "var(--color-raise)", border: "1px solid var(--color-line)", borderRadius: 2, fontSize: 12, color: "var(--color-ink)" };

// One axis, one unit (%). The chain this site is about takes the accent; the others stay grey and are told apart by end labels and the tooltip.
export function PctLines({ data, series, domain, label, endLabels = true }: { data: Record<string, number | string | null>[]; series: Series[]; domain: [number, number]; label: string; endLabels?: boolean }) {
  const last = data[data.length - 1];
  return (
    <div className="h-[220px] w-full" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: endLabels ? 64 : 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-line)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: "var(--color-dim)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--color-line)" }} minTickGap={40} />
          <YAxis domain={domain} tickFormatter={(v) => `${v}%`} tick={{ fill: "var(--color-mute)", fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
          <Tooltip cursor={{ stroke: "var(--color-dim)" }} contentStyle={tip} labelFormatter={(l) => shortDate(String(l))} formatter={(v, n) => [`${Number(v).toFixed(1)}%`, String(n)]} itemSorter={(i) => -Number(i.value)} />
          {series.map((s) => (
            <Line
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={s.self ? "var(--color-accent)" : "var(--color-dim)"}
              strokeWidth={s.self ? 2.2 : 1.2}
              dot={false}
              activeDot={{ r: 3.5, stroke: "var(--color-panel)", strokeWidth: 2 }}
              isAnimationActive={false}
              connectNulls
              label={(p: { index?: number; x?: number | string; y?: number | string }) =>
                endLabels && p.index === data.length - 1 && last[s.name] != null ? (
                  <text x={Number(p.x ?? 0) + 6} y={Number(p.y ?? 0) + 4} fontSize={11} fill={s.self ? "var(--color-ink)" : "var(--color-mute)"} fontWeight={s.self ? 600 : 400}>
                    {s.name}
                  </text>
                ) : (
                  <g />
                )
              }
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

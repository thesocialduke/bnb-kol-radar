"use client";
import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { compact, shortDate } from "@/lib/format";

type P = { date: string; followers: number | null; interactions: number | null };

const GRID = "#262420";
const tip = { background: "#161512", border: "1px solid #262420", borderRadius: 2, fontSize: 12, color: "#ece8dc" };

// Two measures on different scales get two plots on one shared time axis, never two y-axes on one plot.
export function GrowthChart({ data }: { data: P[] }) {
  if (data.length < 2) return <p className="py-10 text-center text-[13px] text-mute">No daily series is available for this account.</p>;
  const x = (hide: boolean) => <XAxis dataKey="date" hide={hide} tickFormatter={shortDate} tick={{ fill: "#7d7768", fontSize: 11 }} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={36} />;
  return (
    <div>
      <div className="readout mb-1">Followers</div>
      <div className="h-[150px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} syncId="acct" margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            {x(true)}
            <YAxis tickFormatter={(v) => compact(v)} tick={{ fill: "#a39d8c", fontSize: 11 }} tickLine={false} axisLine={false} width={46} domain={["auto", "auto"]} />
            <Tooltip cursor={{ stroke: "#7d7768" }} contentStyle={tip} labelFormatter={(l) => shortDate(String(l))} formatter={(v) => [Number(v).toLocaleString("en-US"), "Followers"]} />
            <Area type="monotone" dataKey="followers" stroke="#f0b90b" strokeWidth={2} fill="#f0b90b" fillOpacity={0.08} dot={false} activeDot={{ r: 4, stroke: "#0a0a09", strokeWidth: 2 }} isAnimationActive={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="readout mb-1 mt-3">Engagements per day, all posts</div>
      <div className="h-[130px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} syncId="acct" margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            {x(false)}
            <YAxis tickFormatter={(v) => compact(v)} tick={{ fill: "#a39d8c", fontSize: 11 }} tickLine={false} axisLine={false} width={46} />
            <Tooltip cursor={{ fill: "#161512" }} contentStyle={tip} labelFormatter={(l) => shortDate(String(l))} formatter={(v) => [Number(v).toLocaleString("en-US"), "Engagements"]} />
            <Bar dataKey="interactions" fill="#8a7f5e" maxBarSize={14} radius={[2, 2, 0, 0]} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TopicChart({ data }: { data: { date: string; interactions: number; sentiment: number }[] }) {
  if (data.length < 2) return null;
  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
          <CartesianGrid stroke="#262420" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: "#7d7768", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#262420" }} minTickGap={36} />
          <YAxis tickFormatter={(v) => compact(v)} tick={{ fill: "#a39d8c", fontSize: 11 }} tickLine={false} axisLine={false} width={46} />
          <Tooltip
            cursor={{ fill: "#161512" }}
            contentStyle={{ background: "#161512", border: "1px solid #262420", borderRadius: 2, fontSize: 12, color: "#ece8dc" }}
            labelFormatter={(l) => shortDate(String(l))}
            formatter={(v) => [Number(v).toLocaleString("en-US"), "Engagements"]}
          />
          <Bar dataKey="interactions" fill="#f0b90b" maxBarSize={18} radius={[2, 2, 0, 0]} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

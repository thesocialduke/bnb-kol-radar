import raw from "@/data/extras.json";

export type SovRow = { chain: string; self: boolean; label: string; kind: "ecosystem" | "ticker"; note: string | null; days: number; from: string; to: string; interactions: number; posts: number; contributorsDaily: number; sentiment: number | null; series: number[]; daily: { date: string; interactions: number; posts: number | null; contributors: number | null; sentiment: number | null }[]; networks: { network: string; engagements: number; mentions: number | null }[]; creators: { handle: string; followers: number | null; posts: number | null; engagements: number | null }[]; summaryDate: string | null };
export type Article = { title: string; outlet: string; domain: string; date: string; url: string; query: string };
export const extras = raw as { sov: SovRow[]; news: { fetchedAt: string | null; queries: string[]; articles: Article[] } };

import outletCfg from "@/config/outlets.json";
export const TIERS = outletCfg.tiers as Record<string, string>;
export const tierOf = (domain: string) => (outletCfg.domains as Record<string, string>)[domain] ?? "none";
export const tierLabel = (t: string) => TIERS[t] ?? "Not classified";

export function mediaSummary() {
  const a = extras.news.articles;
  const count = (t: string) => a.filter((x) => tierOf(x.domain) === t).length;
  return { total: a.length, outlets: new Set(a.map((x) => x.domain || x.outlet)).size, tier1: count("tier1"), trade: count("trade"), aggregator: count("aggregator"), owned: count("owned") };
}

import type { Account } from "./db";
import { compact, langName } from "./format";

export const median = (a: number[]) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

export type Insight = { title: string; body: string; href: string; cta: string };

// Three statements computed from the snapshot. Every number is derived here, none are written by hand.
export function insights(ranked: Account[], officials: Account[]): Insight[] {
  const out: Insight[] = [];
  const rankedEng = sum(ranked.map((a) => a.bnb_engagements));
  const officialEng = sum(officials.map((a) => a.bnb_engagements));

  const byEng = [...ranked].sort((a, b) => b.bnb_engagements - a.bnb_engagements);
  const top10 = sum(byEng.slice(0, 10).map((a) => a.bnb_engagements));
  out.push({
    title: `Official accounts earn ${((officialEng / (officialEng + rankedEng)) * 100).toFixed(0)}% of top-post engagement`,
    body: `${officials.length} official accounts drew ${compact(officialEng)} engagements on BNB Chain posts against ${compact(rankedEng)} for the ${ranked.length} independent accounts tracked. Among independents, the top 10 hold ${((top10 / rankedEng) * 100).toFixed(0)}% of the total.`,
    href: "/leaderboard",
    cta: "See the leaderboard",
  });

  const rising = ranked.filter((a) => a.is_rising);
  const mRising = median(rising.map((a) => a.follower_growth_pct!).filter((v) => v != null));
  const mAll = median(ranked.map((a) => a.follower_growth_pct!).filter((v) => v != null));
  if (rising.length && mRising != null && mAll != null) {
    out.push({
      title: `${rising.length} accounts under 50K followers are growing fastest`,
      body: `Their median follower growth over the window is ${mRising >= 0 ? "+" : ""}${mRising.toFixed(1)}%, against ${mAll >= 0 ? "+" : ""}${mAll.toFixed(1)}% for all tracked accounts. Each one has a low anomaly flag and at least one BNB Chain post in a daily top 100.`,
      href: "/rising",
      cta: "Open the rising list",
    });
  }

  const langs = new Map<string, { n: number; eng: number }>();
  for (const a of ranked) {
    const l = langs.get(a.lang) ?? { n: 0, eng: 0 };
    l.n++;
    l.eng += a.bnb_engagements;
    langs.set(a.lang, l);
  }
  const zh = langs.get("zh") ?? { n: 0, eng: 0 };
  const others = [...langs.entries()].filter(([l]) => l !== "en" && l !== "zh" && l !== "unknown").sort((a, b) => b[1].eng - a[1].eng);
  const next = others[0];
  out.push({
    title: `Chinese-language accounts: ${zh.n} of ${ranked.length}, ${((zh.eng / rankedEng) * 100).toFixed(0)}% of independent engagement`,
    body:
      `They account for ${compact(zh.eng)} engagements on BNB Chain posts.` +
      (next ? ` The next largest non-English group is ${langName(next[0])} with ${next[1].n} accounts and ${((next[1].eng / rankedEng) * 100).toFixed(0)}%.` : "") +
      ` Language is detected from post text.`,
    href: "/chinese",
    cta: "Open the Chinese-language view",
  });
  return out;
}

import { snapshot, kindOf } from "@/lib/db";

export const dynamic = "force-static";

// Static JSON copy of the leaderboard for scripts and agents. Built from the snapshot, like every page.
export function GET() {
  const { ranked, meta } = snapshot();
  return Response.json({
    as_of: meta.as_of,
    window_start: meta.window_start,
    note: "anomaly_flag is a heuristic estimate, not a verdict on any account.",
    accounts: ranked.map((a) => ({
      rank: a.rank, handle: a.handle, name: a.name, score: a.score, followers: a.followers,
      follower_growth_30d_pct: a.follower_growth_pct, bnb_chain_engagements: a.bnb_engagements, mindshare_pct: a.mindshare_pct,
      engagements_per_post: a.eng_per_post, language: a.lang, account_type: kindOf(a.account_type), rising: !!a.is_rising, anomaly_flag: a.anomaly_level,
      components: { relevance: a.s_relevance, engagement: a.s_engagement, growth: a.s_growth, consistency: a.s_consistency, authenticity: a.s_authenticity },
      url: `/account/${a.handle}`,
    })),
  });
}

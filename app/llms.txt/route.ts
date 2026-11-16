import { snapshot } from "@/lib/db";
import { extras } from "@/lib/extras";

export const dynamic = "force-static";

// Plain-text map of the site for language models and agents.
export function GET() {
  const { meta, ranked, officials } = snapshot();
  const body = `# BNB Chain KOL Radar

> Who drives BNB Chain conversation on X, scored 0 to 100 on a fixed 30-day snapshot (${meta.window_start} to ${meta.as_of}). Independent project, not affiliated with BNB Chain.

${ranked.length} independent accounts are ranked; ${officials.length} official accounts are listed but unranked. The anomaly flag is a heuristic estimate, never a verdict on an account.

## Data (static JSON)
- [/data/leaderboard.json](/data/leaderboard.json): every ranked account with score, components, growth, language and flags
- [/data/share-of-voice.json](/data/share-of-voice.json): ${extras.sov.length} topic series comparing BNB Chain with Solana, Base and Sui (ecosystem and coin topics)
- [/data/media.json](/data/media.json): ${extras.news.articles.length} news headlines with outlet and outlet group

## Pages
- [/](/): overview and the three findings to act on
- [/leaderboard](/leaderboard): sortable, filterable ranking
- [/rising](/rising): accounts under 50K followers with top-quartile growth and a low anomaly flag
- [/share-of-voice](/share-of-voice): comparison with other chains
- [/media](/media): press coverage by outlet
- [/chinese](/chinese): Chinese-language accounts
- [/shortlist](/shortlist): campaign tracker, stored in the visitor's browser
- [/findings](/findings): written recommendations
- [/methodology](/methodology): sources, scoring weights, limits
- /account/{handle}: one profile per ranked account
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}

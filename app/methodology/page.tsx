import type { Metadata } from "next";
import { snapshot } from "@/lib/db";
import { full, longDate } from "@/lib/format";
import { PageHead } from "@/components/bits";
import cfg from "@/config/scoring.json";

export const metadata: Metadata = { title: "Methodology" };

export default function Methodology() {
  const { meta, ranked, officials } = snapshot();
  const w = cfg.weights;
  const A = cfg.anomaly;
  const perDay = JSON.parse(meta.posts_per_day || "{}") as Record<string, number>;
  const days = Object.keys(perDay).sort();
  const thin = days.filter((d) => perDay[d] < 40);
  const reg = JSON.parse(meta.regression || "{}") as { slope?: number; n?: number };
  const missing = ranked.filter((a) => a.components_missing.length).length;

  return (
    <>
      <PageHead title="Methodology" sub="How accounts are found, how the score is built, and where the data stops. Every weight and threshold on this page is read from the same config file the scoring code uses." />
      <div className="prose-kr">
        <h2>Where the data comes from</h2>
        <p>
          All data comes from <a href="https://lunarcrush.com" target="_blank" rel="noreferrer">LunarCrush</a>, which tracks public social posts by topic. Nothing on this site is typed in by hand or estimated by a language model.
        </p>
        <ul>
          <li>
            <strong>Posts.</strong> For each day from {longDate(meta.window_start)} to {longDate(meta.as_of)}, the top posts on X for the &quot;BNB Chain&quot; topic, ranked by engagement. That gave {full(Number(meta.corpus_posts))} unique posts from {full(Number(meta.corpus_creators))} accounts.
          </li>
          <li>
            <strong>Accounts.</strong> Accounts were ranked by total engagement on those posts. Accounts under {full(cfg.minFollowers)} followers are not ranked: a single viral post from a very small account says little about whether it can carry a campaign. The top {meta.accounts_selected} independent accounts were kept and {ranked.length} had enough data to score. {officials.length} official accounts are listed separately.
          </li>
          <li>
            <strong>Daily series.</strong> For each account, daily followers, engagements and posts created over the window, plus the source&apos;s estimate of repetitive and spam-like posting.
          </li>
        </ul>
        <p>The snapshot is fixed. The site reads only from it and makes no live API calls.</p>

        <h2>The KOL Quality Score</h2>
        <p>Each account gets five component scores from 0 to 100. The final score is their weighted average.</p>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr><th>Component</th><th>Weight</th><th>What it measures</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Ecosystem relevance</strong></td><td className="num">{w.relevance}%</td>
                <td>Engagement on the account&apos;s BNB Chain posts as a share of engagement on everything it posted in the window. Capped at 100. An account with fewer than {cfg.relevance.fullCreditPosts} BNB Chain posts in the data gets proportionally less credit, so one viral post cannot earn full marks.</td>
              </tr>
              <tr>
                <td><strong>Engagement quality</strong></td><td className="num">{w.engagement}%</td>
                <td>Engagements per post divided by followers, as a percentile among tracked accounts of similar size ({cfg.followerTiers.map((t) => t.label).join(", ")}).</td>
              </tr>
              <tr>
                <td><strong>Growth momentum</strong></td><td className="num">{w.growth}%</td>
                <td>Half follower growth over the window, half engagement growth (second half of the window against the first). Each is a percentile across all tracked accounts.</td>
              </tr>
              <tr>
                <td><strong>Consistency</strong></td><td className="num">{w.consistency}%</td>
                <td>{cfg.consistency.bnbDaysShare * 100}% from the number of days with a BNB Chain post in the daily top list ({cfg.consistency.fullMarksBnbDays} days earns full marks), {cfg.consistency.activeDaysShare * 100}% from the share of days the account posted at all.</td>
              </tr>
              <tr>
                <td><strong>Authenticity</strong></td><td className="num">{w.authenticity}%</td>
                <td>100 minus the anomaly points described below.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          If a component cannot be computed for an account, it is left out and the remaining weights are rescaled to total 100. No default value is filled in. {missing ? `${missing} of ${ranked.length} scored accounts have at least one missing component, shown on their profile.` : "Every scored account in this snapshot has all five components."}
        </p>

        <h2>Engagement anomaly flag</h2>
        <p>
          The flag is a <strong>heuristic estimate</strong>. It marks patterns that differ from accounts of similar size. It does not say an account is fake, and a human should look at the account before drawing any conclusion. Viral posts, giveaways and breaking news all trigger these signals legitimately.
        </p>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr><th>Signal</th><th>Triggers when</th><th>Points</th></tr>
            </thead>
            <tbody>
              <tr><td>Engagement vs followers</td><td>Engagements per post are at least {A.engagementResidualZ} standard deviations above or below what follower count predicts{reg.n ? ` (log-log fit across ${reg.n} accounts)` : ""}</td><td className="num">{A.engagementResidualPoints}</td></tr>
              <tr><td>Sudden follower jump</td><td>Followers rise {A.followerJumpDailyPct}% or more in a single day</td><td className="num">{A.followerJumpPoints}</td></tr>
              <tr><td>Repetitive content</td><td>the source classes {A.repetitivePct}% or more of posts as repetitive</td><td className="num">{A.repetitivePoints}</td></tr>
              <tr><td>Spam-like posts</td><td>the source classes {A.spamPct}% or more of posts as spam-like</td><td className="num">{A.spamPoints}</td></tr>
              <tr><td>Near-duplicate text</td><td>Two posts in the sample share {A.duplicateSimilarity * 100}% or more of their three-word sequences</td><td className="num">{A.duplicatePoints}</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          Under {A.mediumAt} points is <strong>low</strong>, {A.mediumAt} to {A.highAt - 1} is <strong>medium</strong>, {A.highAt} and above is <strong>high</strong>. Each profile lists the signals that fired with the numbers behind them.
        </p>

        <h2>Rising accounts</h2>
        <p>
          An account is marked rising when it has fewer than {full(cfg.rising.maxFollowers)} followers, its growth momentum is at or above the {cfg.rising.growthPercentileMin}th percentile of tracked accounts, and its anomaly flag is low.
        </p>

        <h2>Language</h2>
        <p>
          Language is detected from the text of each account&apos;s posts. An account is Chinese-language when Han characters make up more than 35% of its text, counting five Latin letters as one unit so that the two scripts compare fairly. Japanese, Korean, Vietnamese, Russian, Arabic and Thai are detected by script. Other Latin-script languages are told apart statistically and are less reliable on short posts.
        </p>

        <h2>Account type</h2>
        <p>The leaderboard can be filtered to creators or to brands and projects. The label is LunarCrush&apos;s own classification of each account, grouped into two buckets. Accounts it has not classified are shown as &quot;Not classified&quot;; none were labelled by hand.</p>

        <h2>Share of voice</h2>
        <p>The comparison with Solana, Sui and Base uses the same 30-day daily topic series as the BNB Chain numbers. Tickers are compared with tickers and chain names with chain names. Plain words that also match unrelated posts (&quot;base&quot;, &quot;sui&quot;, &quot;bnb&quot;) are left out. The topic list is in config/competitors.json.</p>

        <h2>Media coverage</h2>
        <p>Headlines come from Google News search feeds for &quot;BNB Chain&quot;, &quot;BNB Smart Chain&quot; and &quot;opBNB&quot; over 30 days, deduplicated by outlet and headline. Each search returns at most 100 results, so counts are a floor. The feed has no bylines, so no journalists are listed. Outlets are sorted into four groups by hand in config/outlets.json; that grouping is a judgement call and can be edited.</p>

        <h2>Limits of this data</h2>
        <ul>
          <li><strong>Top posts only.</strong> The source returns about 100 top posts per day for a topic. An account that posts about BNB Chain often but never reaches a daily top 100 is missing or undercounted. This favours larger accounts in relevance and consistency.</li>
          <li><strong>X only.</strong> YouTube, TikTok, Telegram, Binance Square, WeChat and Weibo are not included. This understates Chinese-language and video creators most.</li>
          <li><strong>Rounded engagement.</strong> Post engagement arrives rounded (for example 844.7K), so per-post figures are accurate to about four significant digits.</li>
          {thin.length ? (
            <li><strong>Thin days.</strong> {thin.map((d) => longDate(d)).join(", ")} {thin.length > 1 ? "have" : "has"} fewer than 40 posts in the snapshot because the source returned only its most recent list for those dates.</li>
          ) : null}
          <li><strong>No like or reply split.</strong> The source reports total engagements, not likes and replies separately, so a like-to-reply ratio is not part of the anomaly flag. LunarCrush&apos;s repetitive and spam-like estimates are used in its place.</li>
          <li><strong>Posts include replies.</strong> &quot;Posts created&quot; counts replies, which lowers engagements per post for accounts that reply a lot.</li>
          <li><strong>Gaps in follower counts.</strong> There is no follower count for some accounts on some days. Those days are skipped, so a change across a gap can look like a one-day move. Treat large follower swings as a prompt to check the account on X.</li>
          <li><strong>30 days.</strong> One month is a short window. A single viral post can lift an account, and growth figures can reflect a one-off event.</li>
          <li><strong>Engagement is not reach or sales.</strong> The score says nothing about audience quality by country, conversion, pricing or brand safety. Those need a manual review before any deal.</li>
          <li><strong>Official list is hand-maintained.</strong> Official accounts are excluded by a list in the config file. An affiliated account missing from that list would be ranked as independent.</li>
        </ul>
      </div>
    </>
  );
}

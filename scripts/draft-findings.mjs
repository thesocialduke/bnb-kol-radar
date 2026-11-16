// Writes content/findings.md from the snapshot: a first draft to edit by hand.
// It will not overwrite an existing file unless run with --force.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(ROOT, "content", "findings.md");
if (fs.existsSync(out) && !process.argv.includes("--force")) {
  console.log("content/findings.md exists, left untouched (use --force to regenerate).");
  process.exit(0);
}
const db = new Database(path.join(ROOT, "data", "snapshot.db"), { readonly: true });
const meta = Object.fromEntries(db.prepare("SELECT key, value FROM meta").all().map((r) => [r.key, r.value]));
const ranked = db.prepare("SELECT * FROM accounts WHERE is_official = 0 AND rank IS NOT NULL ORDER BY rank").all();
const officials = db.prepare("SELECT * FROM accounts WHERE is_official = 1").all();
db.close();

const n = (v) => Math.round(v).toLocaleString("en-US");
const k = (v) => (v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e4 ? (v / 1e3).toFixed(1) + "K" : n(v));
const p = (v, d = 1) => (v > 0 ? "+" : "") + v.toFixed(d) + "%";
const sum = (a) => a.reduce((x, y) => x + y, 0);
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const link = (a) => `[@${a.handle}](/account/${a.handle})`;

// Undervalued: strong score, small audience, clean flag, more than one BNB Chain post.
const undervalued = ranked
  .filter((a) => a.followers < 50000 && a.anomaly_level === "low" && a.bnb_posts >= 2 && a.follower_growth_pct != null && a.follower_growth_pct > 0)
  .slice(0, 10);

const totalEng = sum(ranked.map((a) => a.bnb_engagements));
const offEng = sum(officials.map((a) => a.bnb_engagements));
const byEng = [...ranked].sort((a, b) => b.bnb_engagements - a.bnb_engagements);
const top10Share = (sum(byEng.slice(0, 10).map((a) => a.bnb_engagements)) / totalEng) * 100;
const langs = {};
for (const a of ranked) { (langs[a.lang] ??= { n: 0, eng: 0 }); langs[a.lang].n++; langs[a.lang].eng += a.bnb_engagements; }
const langRows = Object.entries(langs).sort((a, b) => b[1].n - a[1].n);
const oneDay = ranked.filter((a) => a.bnb_days <= 1).length;
const tenDays = ranked.filter((a) => a.bnb_days >= 10).length;
const lowRel = ranked.filter((a) => a.relevance_share != null && a.relevance_share < 0.05).length;
const withRel = ranked.filter((a) => a.relevance_share != null).length;
const big = ranked.filter((a) => a.followers >= 250000);
const small = ranked.filter((a) => a.followers < 50000);
const flagged = ranked.filter((a) => a.anomaly_level !== "low").length;
const rising = ranked.filter((a) => a.is_rising);
const risingZh = rising.filter((a) => a.lang === "zh");
const zh = ranked.filter((a) => a.lang === "zh");
const zhRegular = zh.filter((a) => a.bnb_days >= 5);
const names = { en: "English", zh: "Chinese", vi: "Vietnamese", tr: "Turkish", ko: "Korean", ja: "Japanese", ru: "Russian", es: "Spanish", pt: "Portuguese", id: "Indonesian", unknown: "Unknown" };

const md = `> **Draft generated from the ${meta.as_of} snapshot.** Edit this file by hand: \`content/findings.md\`. Numbers in square brackets are the evidence for each claim and come straight from the snapshot.

## 10 undervalued accounts worth approaching

Selection rule: under 50,000 followers, low anomaly flag, at least two BNB Chain posts in a daily top 100, and followers growing. Ordered by quality score.

| # | Account | Why | Evidence |
|---|---|---|---|
${undervalued.map((a, i) => `| ${i + 1} | ${link(a)} | ${names[a.lang] ?? a.lang}${a.is_rising ? ", flagged rising" : ""} | [score ${a.score.toFixed(1)}, rank ${a.rank} of ${ranked.length}] [${n(a.followers)} followers, ${p(a.follower_growth_pct)} in 30d] [${a.bnb_posts} top-100 posts on ${a.bnb_days} days, ${k(a.bnb_engagements)} engagements] |`).join("\n")}

*To do by hand before outreach: open each profile on X, confirm the account is a person or a media outlet and not a token project, and check the audience is in a target market.*

## The biggest gaps the data shows

1. **Reach depends on official accounts.** ${officials.length} official accounts earned ${k(offEng)} engagements on BNB Chain posts, against ${k(totalEng)} for all ${ranked.length} independent accounts together. [officials = ${((offEng / (offEng + totalEng)) * 100).toFixed(0)}% of top-post engagement]
2. **Independent attention is concentrated.** The top 10 independent accounts hold ${top10Share.toFixed(0)}% of independent engagement. [top 10 = ${k(sum(byEng.slice(0, 10).map((a) => a.bnb_engagements)))} of ${k(totalEng)}]
3. **Few accounts talk about BNB Chain regularly.** ${oneDay} of ${ranked.length} accounts reached a daily top 100 on only one day in the month; ${tenDays} did so on ten or more days. [${((oneDay / ranked.length) * 100).toFixed(0)}% one-day, ${((tenDays / ranked.length) * 100).toFixed(0)}% ten-plus days]
4. **For most accounts BNB Chain is a side topic.** ${lowRel} of ${withRel} accounts get under 5% of their engagement from BNB Chain posts. [${((lowRel / withRel) * 100).toFixed(0)}%]
5. **Language coverage is narrow outside English and Chinese.** ${langRows.map(([l, v]) => `${names[l] ?? l} ${v.n}`).join(", ")}. [accounts per detected language, of ${ranked.length}]
6. **Large accounts are a small part of the list.** ${big.length} tracked accounts have 250K or more followers; ${small.length} have under 50K. [${big.length} vs ${small.length}]
7. **Vetting matters.** ${flagged} of ${ranked.length} accounts carry a medium or high anomaly flag and need a manual look before any spend. [${((flagged / ranked.length) * 100).toFixed(0)}%]

## One campaign idea

**A standing bench of rising Chinese- and English-language creators, briefed before each launch.**

The data shows ${rising.length} accounts under 50K followers with top-quartile growth and clean flags [rising list], ${risingZh.length} of them Chinese-language. It also shows that only ${tenDays} accounts post about BNB Chain often enough to appear on ten or more days [consistency gap], and ${zhRegular.length} of the ${zh.length} Chinese-language accounts appear on five or more days.

The idea: sign 15 to 20 of the rising accounts to a three-month retainer priced at today's audience size, give them early briefings on ecosystem launches, and measure them on the same score used here. Success is defined in advance: each account moves from one or two top-100 days per month to five or more, and the count of accounts with ten-plus days rises from ${tenDays}.

*Draft only. Budget, creator rates and the launch calendar are not in the data and need to be added.*
`;
fs.mkdirSync(path.dirname(out), { recursive: true });
let extraMd = "";
try {
  const ex = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/extras.json"), "utf8"));
  const oc = JSON.parse(fs.readFileSync(path.join(process.cwd(), "config/outlets.json"), "utf8"));
  const c = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n));
  const t = ex.sov.filter((r) => r.kind === "ticker");
  const b = t.find((r) => r.self), so = t.find((r) => r.chain === "Solana"), su = t.find((r) => r.chain === "Sui");
  if (b && so && su) {
    extraMd += `\n## Against Solana and Sui\n\n- **Volume.** $bnb drew ${c(b.interactions)} engagements in 30 days, ${(b.interactions / su.interactions).toFixed(1)}x $sui [${c(su.interactions)}]. Solana's topic drew ${c(so.interactions)}, about ${Math.round(so.interactions / b.interactions)}x $bnb, though that series also counts every mention of the name.\n- **Sentiment is the gap.** $bnb averaged ${b.sentiment}% positive against ${so.sentiment}% for Solana and ${su.sentiment}% for $sui. KOL briefs that only chase reach will not move this number.\n- **Per post.** $bnb posts averaged ${Math.round(b.interactions / b.posts).toLocaleString("en-US")} engagements [${c(b.posts)} posts] against ${Math.round(so.interactions / so.posts).toLocaleString("en-US")} for Solana.\n`;
  }
  const a = ex.news.articles;
  if (a.length) {
    const n = (tier) => a.filter((x) => oc.domains[x.domain] === tier).length;
    extraMd += `\n## Media coverage\n\n- **Mostly aggregators.** Of ${a.length} articles found in 30 days, ${n("aggregator")} came from aggregators, data pages or syndication, ${n("trade")} from crypto trade press and ${n("tier1")} from established crypto press. The outlet grouping is a manual judgement in config/outlets.json.\n- **What to do with it.** The earned-media target list is short: the established outlets that covered BNB Chain at all this month, plus the ones that did not. No journalist names are in the data; that list has to be built by hand.\n`;
  }
} catch {}
fs.writeFileSync(out, md + extraMd);
console.log("Wrote content/findings.md");

// BNB Chain KOL Radar: ingestion.
// Reads cached LunarCrush responses, fetches anything missing, scores every
// account and writes data/snapshot.db. The web app reads only that file.
//
//   node scripts/ingest.mjs            full run (top N accounts)
//   node scripts/ingest.mjs --limit 10 test run on 10 accounts
//   node scripts/ingest.mjs --offline  never touch the network
//
// Every network response is cached under .cache/ and never refetched.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { franc } from "franc-min";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.join(ROOT, ".cache", "lunarcrush");
const TOPIC_DIR = path.join(CACHE, "topic-posts");
const CREATOR_DIR = path.join(CACHE, "creator");
const DATA_DIR = path.join(ROOT, "data");
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "config/scoring.json"), "utf8"));
const officials = JSON.parse(fs.readFileSync(path.join(ROOT, "config/officials.json"), "utf8"));

const args = process.argv.slice(2);
const OFFLINE = args.includes("--offline");
const LIMIT = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : cfg.maxAccounts;

loadEnv();
const API_KEY = process.env.LUNARCRUSH_API_KEY || "";

for (const d of [TOPIC_DIR, CREATOR_DIR, DATA_DIR]) fs.mkdirSync(d, { recursive: true });

function loadEnv() {
  const f = path.join(ROOT, ".env.local");
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

// ---------- helpers ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseAbbrev(s) {
  if (s == null) return null;
  const m = String(s).replace(/,/g, "").match(/^([\d.]+)([KMB])?$/i);
  if (!m) return null;
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] || "").toUpperCase()] || 1;
  return Math.round(parseFloat(m[1]) * mult);
}

const num = (s) => (s == null ? null : Number(String(s).replace(/,/g, "")));
const sum = (a) => a.reduce((x, y) => x + y, 0);
const median = (a) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
// Percentile rank (0-100) of v within values: share of values at or below v.
function pctRank(values, v) {
  if (!values.length) return null;
  let below = 0, equal = 0;
  for (const x of values) {
    if (x < v) below++;
    else if (x === v) equal++;
  }
  return ((below + 0.5 * equal) / values.length) * 100;
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round1 = (v) => (v == null ? null : Math.round(v * 10) / 10);

async function fetchText(url, headers = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": "kol-radar-ingest/1.0", ...headers },
        signal: AbortSignal.timeout(45000),
      });
      if (res.status === 429) {
        await sleep(15000 * (attempt + 1));
        continue;
      }
      if (!res.ok) return { ok: false, status: res.status, text: "" };
      return { ok: true, status: res.status, text: await res.text() };
    } catch (e) {
      await sleep(3000 * (attempt + 1));
    }
  }
  return { ok: false, status: 0, text: "" };
}

// ---------- 1. discovery: BNB Chain topic posts ----------

// With an API key, pull each day's top posts from the REST API (JSON).
async function fetchTopicDaysViaApi(days) {
  for (const day of days) {
    const f = path.join(TOPIC_DIR, `api-${day}.json`);
    if (fs.existsSync(f)) continue;
    const start = Math.floor(new Date(day + "T00:00:00Z").getTime() / 1000);
    const url = `https://lunarcrush.com/api4/public/topic/${encodeURIComponent("bnb chain")}/posts/v1?start=${start}&end=${start + 86399}`;
    const r = await fetchText(url, { authorization: `Bearer ${API_KEY}` });
    if (!r.ok) {
      console.warn(`  topic posts ${day}: HTTP ${r.status}, skipped`);
      continue;
    }
    fs.writeFileSync(f, r.text);
    await sleep(400);
  }
}

function loadTopicPosts() {
  const posts = new Map();
  const add = (p) => {
    if (!p.url || !p.handle) return;
    const prev = posts.get(p.url);
    if (!prev || p.engagements > prev.engagements) posts.set(p.url, p);
  };
  for (const file of fs.readdirSync(TOPIC_DIR)) {
    const full = path.join(TOPIC_DIR, file);
    const raw = fs.readFileSync(full, "utf8");
    if (file.endsWith(".json")) {
      let data = [];
      try { data = JSON.parse(raw).data || []; } catch {}
      for (const d of data) {
        if (d.post_type !== "tweet") continue;
        add({
          url: d.post_link,
          handle: d.creator_name,
          created: new Date(d.post_created * 1000).toISOString(),
          followersApprox: d.creator_followers,
          engagements: d.interactions_total ?? d.interactions_24h ?? 0,
          text: [d.post_title, d.post_description].filter(Boolean).join(" "),
          sourceFile: file,
        });
      }
    } else {
      // Markdown export from the LunarCrush connector.
      const re = /^"([\s\S]*?)"  \n\[X Link\]\((\S+?)\) \[@(\w+)\]\(\/creator\/x\/\w+\) (\S+Z) (\S+) followers, (\S+) engagements/gm;
      let m;
      while ((m = re.exec(raw))) {
        add({
          url: m[2],
          handle: m[3],
          created: new Date(m[4]).toISOString(),
          followersApprox: parseAbbrev(m[5]),
          engagements: parseAbbrev(m[6]) ?? 0,
          text: m[1],
          sourceFile: file,
        });
      }
    }
  }
  return [...posts.values()];
}

// ---------- 2. per-account pages (public lunarcrush.ai, cached) ----------

const KINDS = {
  summary: (h) => `https://lunarcrush.ai/creator/x/${h}`,
  ts: (h) => `https://lunarcrush.ai/creator/x/${h}/time-series/1m`,
  posts: (h) => `https://lunarcrush.ai/creator/x/${h}/posts/1m`,
};
const VALID = {
  summary: (t) => t.startsWith("# @") || t.includes("### Followers"),
  ts: (t) => t.includes("| time"),
  posts: (t) => t.includes("X Link") || t.includes("Limited data mode"),
};

async function getCreatorPage(handle, kind) {
  const f = path.join(CREATOR_DIR, `${handle}.${kind}.md`);
  if (fs.existsSync(f)) return fs.readFileSync(f, "utf8");
  if (OFFLINE) return null;
  const headers = API_KEY ? { authorization: `Bearer ${API_KEY}` } : {};
  const r = await fetchText(KINDS[kind](handle), headers);
  if (!r.ok || !VALID[kind](r.text)) return null;
  fs.writeFileSync(f, r.text);
  await sleep(350);
  return r.text;
}

function parseSummary(t) {
  if (!t) return {};
  const g = (re) => (t.match(re) || [])[1] ?? null;
  const name = g(/^# @\w+ (.+)$/m);
  const about = g(/### About [^\n]*\n([^\n]+)/);
  return {
    name: name ? name.trim() : null,
    avatar: g(/<img src="([^"]+)"/),
    about: about ? about.trim() : null,
    accountType: (g(/\*\*Account Type\*\*: ([^\n]+)/)?.trim() ?? null)?.replace('professional-influncer', 'professional influencer') ?? null,
    avgEngPerPostLc: num(g(/Average Engagements per post ([\d,.]+)/)),
    repetitivePct: num(g(/Repetitive content [\d,]+ \((\d+)%\)/)),
    spamPct: num(g(/with (\d+)% of posts being spam-like/)),
    followersSummary: num(g(/### Followers: ([\d,]+)/)),
  };
}

function parseTable(t) {
  if (!t) return [];
  const lines = t.split("\n").filter((l) => l.startsWith("|"));
  if (lines.length < 3) return [];
  const cols = lines[0].split("|").map((s) => s.trim()).filter(Boolean);
  return lines.slice(2).map((l) => {
    const cells = l.split("|").slice(1, -1).map((s) => s.trim());
    const row = {};
    cols.forEach((c, i) => (row[c] = c === "time" ? cells[i] : cells[i] === "" || cells[i] == null ? null : Number(cells[i])));
    return row;
  }).filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.time));
}

function parseCreatorPosts(t, handle) {
  if (!t) return [];
  const out = [];
  const re = /^"([\s\S]*?)"  \n\[X Link\]\((\S+?)\) (\S+Z) (\S+) engagements/gm;
  let m;
  while ((m = re.exec(t))) {
    out.push({ url: m[2], handle, created: new Date(m[3]).toISOString(), engagements: parseAbbrev(m[4]) ?? 0, text: m[1] });
  }
  return out;
}

// ---------- 3. language ----------

const FRANC_NAMES = { eng: "en", spa: "es", por: "pt", tur: "tr", ind: "id", vie: "vi", fra: "fr", deu: "de", rus: "ru", arb: "ar", hin: "hi", kor: "ko", jpn: "ja", cmn: "zh" };
function detectLanguage(texts) {
  const text = texts.join(" ").replace(/https?:\/\/\S+/g, " ").replace(/[@#$]\w+/g, " ");
  const count = (re) => (text.match(re) || []).length;
  const han = count(/\p{Script=Han}/gu);
  const kana = count(/[\p{Script=Hiragana}\p{Script=Katakana}]/gu);
  const hangul = count(/\p{Script=Hangul}/gu);
  const cyr = count(/\p{Script=Cyrillic}/gu);
  const arab = count(/\p{Script=Arabic}/gu);
  const thai = count(/\p{Script=Thai}/gu);
  const viet = count(/[ăâđêôơưĂÂĐÊÔƠƯẠ-ỹ]/g);
  const latin = count(/\p{Script=Latin}/gu);
  // One Han character carries roughly a word, so Latin letters are counted per ~5 to compare like with like.
  const latinUnits = latin / 5;
  const letters = han + kana + hangul + cyr + arab + thai + latinUnits;
  if (han + kana + hangul + cyr + arab + thai + latin < 20) return { lang: "unknown", hanShare: 0 };
  const hanShare = han / letters;
  if (kana / letters > 0.08) return { lang: "ja", hanShare };
  if (hangul / letters > 0.2) return { lang: "ko", hanShare };
  if (hanShare > 0.35) return { lang: "zh", hanShare };
  if (cyr / letters > 0.3) return { lang: "ru", hanShare };
  if (arab / letters > 0.3) return { lang: "ar", hanShare };
  if (thai / letters > 0.3) return { lang: "th", hanShare };
  if (latin && viet / latin > 0.03) return { lang: "vi", hanShare };
  const f = franc(text, { minLength: 40, only: ["eng", "spa", "por", "tur", "ind", "fra", "deu"] });
  return { lang: FRANC_NAMES[f] || "en", hanShare };
}

// ---------- 4. near-duplicate text ----------

function shingles(text) {
  const words = text.toLowerCase().replace(/https?:\/\/\S+/g, "").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const set = new Set();
  for (let i = 0; i + 2 < words.length; i++) set.add(words.slice(i, i + 3).join(" "));
  return set;
}
function duplicatePairs(posts, threshold) {
  const sets = posts.map((p) => shingles(p.text)).map((s, i) => ({ s, i })).filter((x) => x.s.size >= 6);
  let pairs = 0;
  for (let a = 0; a < sets.length; a++) {
    for (let b = a + 1; b < sets.length; b++) {
      let inter = 0;
      for (const x of sets[a].s) if (sets[b].s.has(x)) inter++;
      const j = inter / (sets[a].s.size + sets[b].s.size - inter);
      if (j >= threshold) pairs++;
    }
  }
  return pairs;
}

// ---------- main ----------

const isOfficial = (h) =>
  officials.handles.some((x) => x.toLowerCase() === h.toLowerCase()) ||
  officials.patterns.some((p) => new RegExp(p, "i").test(h));

const BNB_RE = /\bbnb\b|bnbchain|bnb chain|\bbsc\b|binance|opbnb|pancake|four\.?meme|greenfield|币安|幣安|bnb链|bnb鏈/i;

async function main() {
  const today = new Date();
  const days = [];
  for (let i = cfg.windowDays - 1; i >= 0; i--) days.push(new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10));

  if (API_KEY && !OFFLINE) {
    console.log("API key found: pulling daily topic posts from the REST API");
    await fetchTopicDaysViaApi(days);
  } else if (!fs.readdirSync(TOPIC_DIR).length) {
    console.error("No cached topic posts and no LUNARCRUSH_API_KEY in .env.local. Nothing to ingest.");
    process.exit(1);
  }

  const allTopicPosts = loadTopicPosts();
  const newest = allTopicPosts.map((p) => p.created).sort().pop();
  const windowStart = new Date(new Date(newest).getTime() - cfg.windowDays * 86400000).toISOString();
  // Older posts can resurface in a daily top list; only posts created inside the window count.
  const topicPosts = allTopicPosts.filter((p) => p.created >= windowStart);
  const postDates = topicPosts.map((p) => p.created.slice(0, 10)).sort();
  const asOf = postDates[postDates.length - 1];
  console.log(`Topic posts: ${topicPosts.length} unique, ${postDates[0]} to ${asOf}`);

  // Aggregate per creator.
  const byHandle = new Map();
  for (const p of topicPosts) {
    const a = byHandle.get(p.handle) || { handle: p.handle, posts: [], bnbEng: 0, followersApprox: 0 };
    a.posts.push(p);
    a.bnbEng += p.engagements;
    a.followersApprox = Math.max(a.followersApprox, p.followersApprox || 0);
    byHandle.set(p.handle, a);
  }
  const all = [...byHandle.values()].sort((a, b) => b.bnbEng - a.bnbEng);
  const totalCorpusEng = sum(all.map((a) => a.bnbEng));
  const officialList = all.filter((a) => isOfficial(a.handle));
  // Eligibility floor: an account needs a minimum audience to be ranked as a KOL.
  const ranked = all.filter((a) => !isOfficial(a.handle) && a.followersApprox >= cfg.minFollowers).slice(0, LIMIT);
  const selected = [...ranked, ...officialList];
  console.log(`Creators in corpus: ${all.length}. Selected ${ranked.length} ranked + ${officialList.length} official.`);

  // Fetch per-account pages.
  let done = 0;
  const queue = [...selected];
  const missing = [];
  async function worker() {
    for (;;) {
      const a = queue.shift();
      if (!a) return;
      const [s, ts, cp] = [await getCreatorPage(a.handle, "summary"), await getCreatorPage(a.handle, "ts"), await getCreatorPage(a.handle, "posts")];
      a.summary = parseSummary(s);
      a.ts = parseTable(ts);
      a.creatorPosts = parseCreatorPosts(cp, a.handle);
      if (!s || !ts) missing.push(a.handle);
      if (++done % 25 === 0) console.log(`  fetched ${done}/${selected.length}`);
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  if (missing.length) console.warn(`Accounts with a missing page (kept, fields left empty): ${missing.length}`);

  // Topic-level series.
  let topicTs = [];
  {
    const f = path.join(CACHE, `topic-time-series-${asOf}.md`);
    let t = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
    if (!t && !OFFLINE) {
      const r = await fetchText("https://lunarcrush.ai/topic/bnb-chain/time-series/1m", API_KEY ? { authorization: `Bearer ${API_KEY}` } : {});
      if (r.ok && r.text.includes("| time")) { t = r.text; fs.writeFileSync(f, t); }
    }
    topicTs = parseTable(t);
  }

  // ---------- derive metrics ----------
  for (const a of selected) {
    const ts = a.ts;
    const withF = ts.filter((r) => r.followers != null && r.followers > 0);
    a.followers = withF.length ? withF[withF.length - 1].followers : a.summary.followersSummary ?? null;
    a.followersStart = withF.length ? withF[0].followers : null;
    a.followerGrowthPct = a.followersStart ? ((a.followers - a.followersStart) / a.followersStart) * 100 : null;
    a.tsDays = ts.length;
    a.interactions30d = ts.length ? sum(ts.map((r) => r.interactions || 0)) : null;
    a.posts30d = ts.length ? sum(ts.map((r) => r.posts_created || 0)) : null;
    a.activeDays = ts.filter((r) => (r.posts_created || 0) > 0).length;
    if (ts.length >= 10) {
      const half = Math.floor(ts.length / 2);
      a.engFirstHalf = sum(ts.slice(0, half).map((r) => r.interactions || 0));
      a.engSecondHalf = sum(ts.slice(ts.length - half).map((r) => r.interactions || 0));
      a.engGrowthPct = a.engFirstHalf > 0 ? ((a.engSecondHalf - a.engFirstHalf) / a.engFirstHalf) * 100 : null;
    } else {
      a.engFirstHalf = a.engSecondHalf = a.engGrowthPct = null;
    }
    // Largest one-day follower change.
    a.maxDailyFollowerJumpPct = null;
    a.maxJumpDate = null;
    for (let i = 1; i < withF.length; i++) {
      const pct = ((withF[i].followers - withF[i - 1].followers) / withF[i - 1].followers) * 100;
      if (a.maxDailyFollowerJumpPct == null || pct > a.maxDailyFollowerJumpPct) { a.maxDailyFollowerJumpPct = pct; a.maxJumpDate = withF[i].time; }
    }
    a.bnbPosts = a.posts.length;
    a.bnbDays = new Set(a.posts.map((p) => p.created.slice(0, 10))).size;
    a.mindsharePct = (a.bnbEng / totalCorpusEng) * 100;
    a.engPerPost = a.interactions30d != null && a.posts30d ? a.interactions30d / a.posts30d : null;
    a.engRate = a.engPerPost != null && a.followers ? a.engPerPost / a.followers : null;
    a.relevanceShare = a.interactions30d ? Math.min(1, a.bnbEng / a.interactions30d) : null;
    // One viral post is thin evidence: full credit needs several BNB Chain posts.
    a.relevanceConfidence = Math.min(1, a.posts.length / cfg.relevance.fullCreditPosts);
    const tier = cfg.followerTiers.find((t) => t.max == null || (a.followers ?? 0) < t.max);
    a.tier = tier.id;
    const texts = [...a.posts.map((p) => p.text), ...a.creatorPosts.map((p) => p.text)];
    const l = detectLanguage(texts);
    a.lang = l.lang;
    a.hanShare = l.hanShare;
    a.official = isOfficial(a.handle);
    // All posts we hold for this account, deduped.
    const m = new Map();
    for (const p of a.posts) m.set(p.url, { ...p, source: "topic", isBnb: 1 });
    for (const p of a.creatorPosts) if (!m.has(p.url)) m.set(p.url, { ...p, source: "creator", isBnb: BNB_RE.test(p.text) ? 1 : 0 });
    a.allPosts = [...m.values()];
    a.dupPairs = duplicatePairs(a.allPosts, cfg.anomaly.duplicateSimilarity);
  }

  // ---------- scoring (ranked accounts only form the comparison pool) ----------
  const pool = selected.filter((a) => !a.official && a.followers != null && a.followers >= cfg.minFollowers);

  // Engagement expected from follower count: log-log least squares across the pool.
  const reg = pool.filter((a) => a.engPerPost > 0 && a.followers > 0);
  const xs = reg.map((a) => Math.log10(a.followers)), ys = reg.map((a) => Math.log10(a.engPerPost));
  const mx = sum(xs) / (xs.length || 1), my = sum(ys) / (ys.length || 1);
  const slope = sum(xs.map((x, i) => (x - mx) * (ys[i] - my))) / (sum(xs.map((x) => (x - mx) ** 2)) || 1);
  const intercept = my - slope * mx;
  const resid = xs.map((x, i) => ys[i] - (intercept + slope * x));
  const sd = Math.sqrt(sum(resid.map((r) => r * r)) / (resid.length || 1)) || 1;

  const growthF = pool.filter((a) => a.followerGrowthPct != null).map((a) => a.followerGrowthPct);
  const growthE = pool.filter((a) => a.engGrowthPct != null).map((a) => a.engGrowthPct);

  for (const a of selected) {
    const A = cfg.anomaly;
    const signals = [];
    let points = 0;
    a.engResidualZ = null;
    if (a.engPerPost > 0 && a.followers > 0) {
      const expected = 10 ** (intercept + slope * Math.log10(a.followers));
      a.engExpected = expected;
      a.engResidualZ = (Math.log10(a.engPerPost) - Math.log10(expected)) / sd;
      if (Math.abs(a.engResidualZ) >= A.engagementResidualZ) {
        points += A.engagementResidualPoints;
        signals.push({
          id: "engagement_vs_followers",
          label: a.engResidualZ > 0 ? "Engagement far above what follower count predicts" : "Engagement far below what follower count predicts",
          detail: `${Math.round(a.engPerPost).toLocaleString("en-US")} engagements per post against ${Math.round(expected).toLocaleString("en-US")} expected for ${a.followers.toLocaleString("en-US")} followers (${a.engResidualZ > 0 ? "+" : ""}${a.engResidualZ.toFixed(1)} standard deviations).`,
          points: A.engagementResidualPoints,
        });
      }
    }
    if (a.maxDailyFollowerJumpPct != null && a.maxDailyFollowerJumpPct >= A.followerJumpDailyPct) {
      points += A.followerJumpPoints;
      signals.push({
        id: "follower_jump",
        label: "Sudden follower jump",
        detail: `Followers rose ${a.maxDailyFollowerJumpPct.toFixed(1)}% in one day on ${a.maxJumpDate}.`,
        points: A.followerJumpPoints,
      });
    }
    if (a.summary.repetitivePct != null && a.summary.repetitivePct >= A.repetitivePct) {
      points += A.repetitivePoints;
      signals.push({ id: "repetitive", label: "Highly repetitive content", detail: `LunarCrush classes ${a.summary.repetitivePct}% of this account's posts as repetitive.`, points: A.repetitivePoints });
    }
    if (a.summary.spamPct != null && a.summary.spamPct >= A.spamPct) {
      points += A.spamPoints;
      signals.push({ id: "spam_like", label: "Spam-like posts", detail: `LunarCrush classes ${a.summary.spamPct}% of this account's posts as spam-like.`, points: A.spamPoints });
    }
    if (a.dupPairs > 0) {
      points += A.duplicatePoints;
      signals.push({ id: "near_duplicates", label: "Near-duplicate post text", detail: `${a.dupPairs} pair${a.dupPairs > 1 ? "s" : ""} of posts in the sample share at least ${A.duplicateSimilarity * 100}% of their wording (${a.allPosts.length} posts compared).`, points: A.duplicatePoints });
    }
    a.anomalyPoints = Math.min(100, points);
    a.anomalyLevel = points >= A.highAt ? "high" : points >= A.mediumAt ? "medium" : "low";
    a.anomalySignals = signals;

    // Components, each 0-100 or null when the inputs are missing.
    a.sRelevance = a.relevanceShare != null ? a.relevanceShare * a.relevanceConfidence * 100 : null;
    const peers = pool.filter((p) => p.tier === a.tier && p.engRate != null).map((p) => p.engRate);
    a.engRatePctile = a.engRate != null && peers.length >= 5 ? pctRank(peers, a.engRate) : null;
    a.tierPeers = peers.length;
    a.sEngagement = a.engRatePctile;
    a.followerGrowthPctile = a.followerGrowthPct != null ? pctRank(growthF, a.followerGrowthPct) : null;
    a.engGrowthPctile = a.engGrowthPct != null ? pctRank(growthE, a.engGrowthPct) : null;
    a.sGrowth = a.followerGrowthPctile != null && a.engGrowthPctile != null
      ? cfg.growth.followerShare * a.followerGrowthPctile + cfg.growth.engagementShare * a.engGrowthPctile
      : a.followerGrowthPctile ?? a.engGrowthPctile;
    const C = cfg.consistency;
    a.sConsistency = a.tsDays
      ? 100 * (C.bnbDaysShare * Math.min(1, a.bnbDays / C.fullMarksBnbDays) + C.activeDaysShare * (a.activeDays / a.tsDays))
      : 100 * Math.min(1, a.bnbDays / C.fullMarksBnbDays);
    a.sAuthenticity = 100 - a.anomalyPoints;

    const parts = [["relevance", a.sRelevance], ["engagement", a.sEngagement], ["growth", a.sGrowth], ["consistency", a.sConsistency], ["authenticity", a.sAuthenticity]];
    const present = parts.filter(([, v]) => v != null);
    a.componentsMissing = parts.filter(([, v]) => v == null).map(([k]) => k);
    // Missing components are left out and the remaining weights rescaled; never filled with a default.
    const wsum = sum(present.map(([k]) => cfg.weights[k]));
    a.eligible = !a.official && a.followers != null && a.followers >= cfg.minFollowers;
    a.score = present.length >= 4 && (a.official || a.eligible) ? sum(present.map(([k, v]) => v * cfg.weights[k])) / wsum : null;
  }

  // Rising.
  const growthScores = pool.filter((a) => a.sGrowth != null).map((a) => a.sGrowth);
  for (const a of selected) {
    a.growthPctile = a.sGrowth != null ? pctRank(growthScores, a.sGrowth) : null;
    a.rising = !a.official && a.followers != null && a.followers < cfg.rising.maxFollowers && a.growthPctile != null && a.growthPctile >= cfg.rising.growthPercentileMin && a.anomalyLevel === "low" ? 1 : 0;
    a.risingReason = null;
    if (a.rising) {
      const bits = [];
      if (a.followerGrowthPct != null) bits.push(`followers ${a.followerGrowthPct >= 0 ? "+" : ""}${a.followerGrowthPct.toFixed(1)}% in ${a.tsDays} days (${a.followersStart.toLocaleString("en-US")} to ${a.followers.toLocaleString("en-US")})`);
      if (a.engGrowthPct != null) bits.push(a.engGrowthPct >= 900 ? `engagement more than 10x in the second half of the window (${a.engFirstHalf.toLocaleString("en-US")} to ${a.engSecondHalf.toLocaleString("en-US")})` : `engagement ${a.engGrowthPct >= 0 ? "+" : ""}${Math.round(a.engGrowthPct)}% second half vs first`);
      bits.push(`${a.bnbPosts} BNB Chain post${a.bnbPosts > 1 ? "s" : ""} in the daily top 100`);
      a.risingReason = bits.join("; ") + ".";
    }
  }
  const rankedSorted = pool.filter((a) => a.score != null).sort((x, y) => y.score - x.score);
  rankedSorted.forEach((a, i) => (a.rank = i + 1));

  // ---------- write snapshot ----------
  const dbPath = path.join(DATA_DIR, LIMIT < cfg.maxAccounts ? "snapshot-test.db" : "snapshot.db");
  fs.rmSync(dbPath, { force: true });
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE accounts (
      handle TEXT PRIMARY KEY, name TEXT, avatar TEXT, about TEXT, account_type TEXT,
      is_official INTEGER, rank INTEGER, score REAL,
      s_relevance REAL, s_engagement REAL, s_growth REAL, s_consistency REAL, s_authenticity REAL,
      components_missing TEXT,
      followers INTEGER, followers_start INTEGER, follower_growth_pct REAL, follower_growth_pctile REAL,
      interactions_30d INTEGER, posts_30d INTEGER, active_days INTEGER, ts_days INTEGER,
      eng_first_half INTEGER, eng_second_half INTEGER, eng_growth_pct REAL, eng_growth_pctile REAL,
      eng_per_post REAL, eng_rate REAL, eng_rate_pctile REAL, eng_expected REAL, eng_residual_z REAL,
      tier TEXT, tier_peers INTEGER,
      bnb_posts INTEGER, bnb_engagements INTEGER, bnb_days INTEGER, mindshare_pct REAL, relevance_share REAL, relevance_confidence REAL,
      lc_avg_eng_per_post REAL, lc_repetitive_pct REAL, lc_spam_pct REAL,
      max_daily_follower_jump_pct REAL, dup_pairs INTEGER, posts_compared INTEGER,
      anomaly_level TEXT, anomaly_points INTEGER, anomaly_signals TEXT,
      lang TEXT, han_share REAL,
      growth_pctile REAL, is_rising INTEGER, rising_reason TEXT
    );
    CREATE TABLE timeseries (handle TEXT, date TEXT, followers INTEGER, interactions INTEGER, posts_active INTEGER, posts_created INTEGER, PRIMARY KEY (handle, date));
    CREATE TABLE posts (url TEXT PRIMARY KEY, handle TEXT, created TEXT, engagements INTEGER, text TEXT, source TEXT, is_bnb INTEGER);
    CREATE TABLE topic_ts (date TEXT PRIMARY KEY, posts_active INTEGER, posts_created INTEGER, interactions INTEGER, contributors_active INTEGER, contributors_created INTEGER, spam INTEGER, sentiment INTEGER);
    CREATE INDEX posts_handle ON posts(handle);
  `);
  const insA = db.prepare(`INSERT INTO accounts VALUES (${Array(53).fill("?").join(",")})`);
  const insT = db.prepare("INSERT OR REPLACE INTO timeseries VALUES (?,?,?,?,?,?)");
  const insP = db.prepare("INSERT OR REPLACE INTO posts VALUES (?,?,?,?,?,?,?)");
  const insTT = db.prepare("INSERT OR REPLACE INTO topic_ts VALUES (?,?,?,?,?,?,?,?)");
  const insM = db.prepare("INSERT INTO meta VALUES (?,?)");
  const r = round1;
  db.transaction(() => {
    for (const a of selected) {
      insA.run(
        a.handle, a.summary.name, a.summary.avatar, a.summary.about, a.summary.accountType,
        a.official ? 1 : 0, a.rank ?? null, r(a.score),
        r(a.sRelevance), r(a.sEngagement), r(a.sGrowth), r(a.sConsistency), r(a.sAuthenticity),
        JSON.stringify(a.componentsMissing),
        a.followers, a.followersStart, a.followerGrowthPct, r(a.followerGrowthPctile),
        a.interactions30d, a.posts30d, a.activeDays, a.tsDays,
        a.engFirstHalf, a.engSecondHalf, a.engGrowthPct, r(a.engGrowthPctile),
        a.engPerPost, a.engRate, r(a.engRatePctile), a.engExpected ?? null, a.engResidualZ,
        a.tier, a.tierPeers,
        a.bnbPosts, a.bnbEng, a.bnbDays, a.mindsharePct, a.relevanceShare, a.relevanceConfidence,
        a.summary.avgEngPerPostLc, a.summary.repetitivePct, a.summary.spamPct,
        a.maxDailyFollowerJumpPct, a.dupPairs, a.allPosts.length,
        a.anomalyLevel, a.anomalyPoints, JSON.stringify(a.anomalySignals),
        a.lang, a.hanShare,
        r(a.growthPctile), a.rising, a.risingReason,
      );
      for (const t of a.ts) insT.run(a.handle, t.time, t.followers, t.interactions, t.posts_active, t.posts_created);
      for (const p of a.allPosts) insP.run(p.url, p.handle, p.created, p.engagements, p.text, p.source, p.isBnb);
    }
    for (const t of topicTs) insTT.run(t.time, t.posts_active, t.posts_created, t.interactions, t.contributors_active, t.contributors_created, t.spam, t.sentiment);
    insM.run("as_of", asOf);
    insM.run("window_start", postDates[0]);
    insM.run("generated_at", new Date().toISOString());
    insM.run("corpus_posts", String(topicPosts.length));
    insM.run("corpus_creators", String(all.length));
    insM.run("corpus_engagements", String(totalCorpusEng));
    insM.run("accounts_ranked", String(rankedSorted.length));
    insM.run("accounts_selected", String(ranked.length));
    insM.run("accounts_official", String(officialList.length));
    insM.run("regression", JSON.stringify({ slope, intercept, sd, n: reg.length }));
    insM.run("posts_per_day", JSON.stringify(postDates.reduce((m, d) => ((m[d] = (m[d] || 0) + 1), m), {})));
  })();
  db.close();
  console.log(`Wrote ${path.relative(ROOT, dbPath)}: ${selected.length} accounts, as of ${asOf}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

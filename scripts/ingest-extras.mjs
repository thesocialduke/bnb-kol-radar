// Competitor share of voice (LunarCrush public topic pages) and media coverage (Google News RSS).
// Cache-first: anything already in .cache is never refetched. Writes data/extras.json.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const cfg = JSON.parse(fs.readFileSync(path.join(root, "config/competitors.json"), "utf8"));
const TOPICS = path.join(root, ".cache/lunarcrush/topics");
const NEWS = path.join(root, ".cache/news");
fs.mkdirSync(TOPICS, { recursive: true });
fs.mkdirSync(NEWS, { recursive: true });

async function cached(file, url) {
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return fs.readFileSync(file, "utf8");
  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(40000) });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  const t = await r.text();
  fs.writeFileSync(file, t);
  return t;
}

function parseTable(md) {
  const lines = md.split("\n").filter((l) => l.startsWith("|"));
  if (lines.length < 3) return [];
  const cells = (l) => l.split("|").slice(1, -1).map((c) => c.trim());
  const head = cells(lines[0]);
  return lines.slice(2).map((l) => Object.fromEntries(cells(l).map((c, i) => [head[i], c])));
}
const num = (v) => (v === "" || v == null || isNaN(Number(v)) ? null : Number(v));

const sov = [];
for (const c of cfg.chains) {
  for (const t of c.topics) {
    let rows = [];
    try {
      const tf = path.join(TOPICS, `${t.slug}.ts.md`);
      rows = parseTable(await cached(tf, `https://lunarcrush.ai/topic/${t.slug}/time-series/1m`));
      // The day the file was fetched is only part of a day; leave it out.
      const fetched = fs.statSync(tf).mtime.toISOString().slice(0, 10);
      rows = rows.filter((r) => r.time < fetched);
    } catch (e) {
      console.warn(`  ${t.label}: ${e.message}`);
    }
    const days = rows.map((r) => ({ date: r.time, interactions: num(r.interactions), posts: num(r.posts_created), contributors: num(r.contributors_active), sentiment: num(r.sentiment) })).filter((d) => d.interactions != null);
    if (!days.length) continue;
    // 24-hour summary page: network split and loudest accounts. Optional; a missing page leaves these empty.
    let networks = [], creators = [], summaryDate = null;
    try {
      const sf = path.join(TOPICS, `${t.slug}.summary.md`);
      const sm = await cached(sf, `https://lunarcrush.ai/topic/${t.slug}`);
      summaryDate = fs.statSync(sf).mtime.toISOString().slice(0, 10);
      const grab = (head) => {
        const m = sm.match(new RegExp(head + " by network \\(24h\\):\\n((?:[A-Za-z]+: [\\d,]+\\n?)+)"));
        return m ? Object.fromEntries(m[1].trim().split("\n").map((l) => { const [k, v] = l.split(": "); return [k, Number(v.replace(/,/g, ""))]; })) : {};
      };
      const e = grab("Engagements"), mn = grab("Mentions");
      networks = Object.keys(e).map((k) => ({ network: k, engagements: e[k], mentions: mn[k] ?? null })).sort((a, b) => b.engagements - a.engagements);
      creators = parseTable(sm.slice(sm.indexOf("| Creator"))).map((r) => ({ handle: (r.Creator.match(/@(\w+)/) ?? [])[1], followers: num((r.Followers ?? "").replace(/,/g, "")), posts: num(r.Posts), engagements: num((r.Engagements ?? "").replace(/,/g, "")) })).filter((r) => r.handle);
    } catch (e) {
      console.warn(`  ${t.label} summary: ${e.message}`);
    }
    const sum = (k) => days.reduce((s, d) => s + (d[k] ?? 0), 0);
    const sent = days.filter((d) => d.sentiment != null);
    sov.push({
      chain: c.chain, self: !!c.self, label: t.label, kind: t.kind, note: t.note ?? null,
      days: days.length, from: days[0].date, to: days[days.length - 1].date,
      interactions: sum("interactions"), posts: sum("posts"),
      contributorsDaily: Math.round(sum("contributors") / days.length),
      sentiment: sent.length ? Math.round(sent.reduce((s, d) => s + d.sentiment, 0) / sent.length) : null,
      series: days.map((d) => d.interactions),
      daily: days.map((d) => ({ date: d.date, interactions: d.interactions, posts: d.posts, contributors: d.contributors, sentiment: d.sentiment })),
      networks, creators, summaryDate,
    });
    console.log(`  ${t.label}: ${days.length} days`);
  }
}

const unesc = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const seen = new Map();
for (const q of cfg.newsQueries) {
  let xml = "";
  try {
    xml = await cached(path.join(NEWS, `${q.replace(/ /g, "-")}.xml`), `https://news.google.com/rss/search?q=%22${q.replace(/ /g, "+")}%22+when:30d&hl=en-US&gl=US&ceid=US:en`);
  } catch (e) {
    console.warn(`  news "${q}": ${e.message}`);
  }
  for (const it of xml.match(/<item>[\s\S]*?<\/item>/g) ?? []) {
    const g = (re) => (it.match(re) ?? [])[1];
    const outlet = unesc(g(/<source[^>]*>([\s\S]*?)<\/source>/) ?? "");
    const domain = (g(/<source url="https?:\/\/([^"/]+)/) ?? "").replace(/^www\./, "");
    let title = unesc(g(/<title>([\s\S]*?)<\/title>/) ?? "");
    if (outlet && title.endsWith(` - ${outlet}`)) title = title.slice(0, -outlet.length - 3);
    const date = new Date(g(/<pubDate>([\s\S]*?)<\/pubDate>/) ?? "");
    const url = g(/<link>([\s\S]*?)<\/link>/);
    if (!title || !outlet || isNaN(date)) continue;
    const key = `${outlet}|${title.toLowerCase()}`;
    if (!seen.has(key)) seen.set(key, { title, outlet, domain, date: date.toISOString().slice(0, 10), url, query: q });
  }
}
const articles = [...seen.values()].sort((a, b) => b.date.localeCompare(a.date));
const fetchedAt = fs.existsSync(path.join(NEWS, `${cfg.newsQueries[0].replace(/ /g, "-")}.xml`)) ? fs.statSync(path.join(NEWS, `${cfg.newsQueries[0].replace(/ /g, "-")}.xml`)).mtime.toISOString().slice(0, 10) : null;
fs.writeFileSync(path.join(root, "data/extras.json"), JSON.stringify({ sov, news: { fetchedAt, queries: cfg.newsQueries, articles } }));
console.log(`extras: ${sov.length} topics, ${articles.length} articles from ${new Set(articles.map((a) => a.outlet)).size} outlets`);

import Database from "better-sqlite3";
import path from "node:path";

export type Signal = { id: string; label: string; detail: string; points: number };

export type Account = {
  handle: string;
  name: string | null;
  avatar: string | null;
  about: string | null;
  account_type: string | null;
  is_official: number;
  rank: number | null;
  score: number | null;
  s_relevance: number | null;
  s_engagement: number | null;
  s_growth: number | null;
  s_consistency: number | null;
  s_authenticity: number | null;
  components_missing: string[];
  followers: number | null;
  followers_start: number | null;
  follower_growth_pct: number | null;
  follower_growth_pctile: number | null;
  interactions_30d: number | null;
  posts_30d: number | null;
  active_days: number | null;
  ts_days: number | null;
  eng_first_half: number | null;
  eng_second_half: number | null;
  eng_growth_pct: number | null;
  eng_growth_pctile: number | null;
  eng_per_post: number | null;
  eng_rate: number | null;
  eng_rate_pctile: number | null;
  eng_expected: number | null;
  eng_residual_z: number | null;
  tier: string;
  tier_peers: number | null;
  bnb_posts: number;
  bnb_engagements: number;
  bnb_days: number;
  mindshare_pct: number;
  relevance_share: number | null;
  relevance_confidence: number | null;
  lc_avg_eng_per_post: number | null;
  lc_repetitive_pct: number | null;
  lc_spam_pct: number | null;
  max_daily_follower_jump_pct: number | null;
  dup_pairs: number | null;
  posts_compared: number | null;
  anomaly_level: "low" | "medium" | "high";
  anomaly_points: number;
  anomaly_signals: Signal[];
  lang: string;
  han_share: number | null;
  growth_pctile: number | null;
  is_rising: number;
  rising_reason: string | null;
};

export type TsRow = { date: string; followers: number | null; interactions: number | null; posts_active: number | null; posts_created: number | null };
export type Post = { url: string; handle: string; created: string; engagements: number; text: string; source: string; is_bnb: number };
export type TopicRow = { date: string; posts_active: number; posts_created: number; interactions: number; contributors_active: number; contributors_created: number; spam: number; sentiment: number };

type Snapshot = {
  meta: Record<string, string>;
  accounts: Account[];
  ranked: Account[];
  officials: Account[];
  byHandle: Map<string, Account>;
  ts: Map<string, TsRow[]>;
  posts: Map<string, Post[]>;
  topic: TopicRow[];
};

let cache: Snapshot | null = null;

export function snapshot(): Snapshot {
  if (cache) return cache;
  const db = new Database(path.join(process.cwd(), "data", "snapshot.db"), { readonly: true, fileMustExist: true });
  const meta: Record<string, string> = {};
  for (const r of db.prepare("SELECT key, value FROM meta").all() as { key: string; value: string }[]) meta[r.key] = r.value;
  const accounts = (db.prepare("SELECT * FROM accounts").all() as Record<string, unknown>[]).map((r) => ({
    ...r,
    components_missing: JSON.parse((r.components_missing as string) || "[]"),
    anomaly_signals: JSON.parse((r.anomaly_signals as string) || "[]"),
  })) as Account[];
  const ts = new Map<string, TsRow[]>();
  for (const r of db.prepare("SELECT * FROM timeseries ORDER BY handle, date").all() as (TsRow & { handle: string })[]) {
    if (!ts.has(r.handle)) ts.set(r.handle, []);
    ts.get(r.handle)!.push(r);
  }
  const posts = new Map<string, Post[]>();
  for (const r of db.prepare("SELECT * FROM posts ORDER BY engagements DESC").all() as Post[]) {
    if (!posts.has(r.handle)) posts.set(r.handle, []);
    posts.get(r.handle)!.push(r);
  }
  const topic = db.prepare("SELECT * FROM topic_ts ORDER BY date").all() as TopicRow[];
  db.close();
  const ranked = accounts.filter((a) => !a.is_official && a.rank != null).sort((a, b) => a.rank! - b.rank!);
  const officials = accounts.filter((a) => a.is_official).sort((a, b) => b.bnb_engagements - a.bnb_engagements);
  cache = { meta, accounts, ranked, officials, byHandle: new Map(accounts.map((a) => [a.handle, a])), ts, posts, topic };
  return cache;
}

// LunarCrush's own account classification, grouped. Blank stays unknown; nothing is guessed.
export function kindOf(t: string | null): "creator" | "brand" | "unknown" {
  if (!t) return "unknown";
  if (/brand|commercial/i.test(t)) return "brand";
  if (/influencer|creator|regular user/i.test(t)) return "creator";
  return "unknown";
}
export const KIND_LABEL = { creator: "Creator", brand: "Brand or project", unknown: "Not classified" } as const;

// The slim row the client-side tables need.
export type Row = {
  handle: string;
  name: string | null;
  avatar: string | null;
  rank: number;
  score: number;
  followers: number | null;
  growth: number | null;
  engGrowth: number | null;
  bnbEng: number;
  mindshare: number;
  engPerPost: number | null;
  bnbPosts: number;
  lang: string;
  anomaly: "low" | "medium" | "high";
  tier: string;
  rising: boolean;
  kind: "creator" | "brand" | "unknown";
  spark: number[];
};

export function toRow(a: Account, ts: Map<string, TsRow[]>): Row {
  return {
    handle: a.handle,
    name: a.name,
    avatar: a.avatar,
    rank: a.rank!,
    score: a.score!,
    followers: a.followers,
    growth: a.follower_growth_pct,
    engGrowth: a.eng_growth_pct,
    bnbEng: a.bnb_engagements,
    mindshare: a.mindshare_pct,
    engPerPost: a.eng_per_post,
    bnbPosts: a.bnb_posts,
    lang: a.lang,
    anomaly: a.anomaly_level,
    tier: a.tier,
    rising: !!a.is_rising,
    kind: kindOf(a.account_type),
    spark: (ts.get(a.handle) ?? []).map((r) => r.followers ?? 0).filter((v) => v > 0),
  };
}

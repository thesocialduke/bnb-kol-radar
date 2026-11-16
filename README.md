# BNB Chain KOL Radar

A static Next.js site that ranks the independent X accounts driving BNB Chain conversation, built on a fixed snapshot of LunarCrush data.

## Run it

```bash
npm install
npm run build
npm run start
```

## How it is put together

- `scripts/ingest.mjs` reads cached LunarCrush responses from `.cache/`, fetches anything missing, scores every account and writes `data/snapshot.db`.
- `scripts/draft-findings.mjs` writes `content/findings.md` once. It never overwrites your edits unless run with `--force`.
- The app reads `data/snapshot.db` at build time only. Every page is static, so the deployed site needs no API keys and makes no API calls.
- `config/scoring.json` holds every weight and threshold. `config/officials.json` lists accounts kept out of the rankings. `config/site.json` holds the footer name and X link.

## Refresh the data

Put `LUNARCRUSH_API_KEY=...` in `.env.local` (git-ignored), then:

```bash
npm run refresh
```

That pulls 30 days of top BNB Chain posts through the LunarCrush REST API, refetches account pages that are not cached, rebuilds the snapshot and rebuilds the site. Delete `.cache/lunarcrush/creator` first if you want fresh account series rather than cached ones. Each topic day costs one API credit (about 30 per refresh).

Without a key, `npm run refresh` rebuilds from whatever is already in `.cache/`.

## Deploy on Vercel

```bash
git add -A
git commit -m "KOL Radar snapshot"
npx vercel --prod
```

No environment variables are needed on Vercel. The snapshot in `data/` is committed and bundled at build time.

## Edit by hand

- `content/findings.md`: the Findings page.
- `config/site.json`: set `xUrl` to your X profile to turn the footer name into a link.

## Screens

Overview, Leaderboard, Rising, Share of voice, Media coverage, Chinese-language, Campaign tracker, Findings, Methodology, and one profile per ranked account. A light or dark view toggle sits in the top bar (`?theme=light` forces light).

## Config

Everything tunable is JSON in `config/`: `scoring.json`, `officials.json`, `competitors.json`, `outlets.json`, `site.json`. Change a file, then run `npm run refresh`.

## For scripts and agents

- `/llms.txt`: plain-text map of the site
- `/data/leaderboard.json`, `/data/share-of-voice.json`, `/data/media.json`: static JSON built from the same snapshot as the pages
- `AGENTS.md`: project rules and commands for coding agents

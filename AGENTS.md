<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project notes

Static Next.js site built from a committed snapshot. No runtime API calls and no keys at runtime.

- Data: `data/snapshot.db` (accounts, series, posts) and `data/extras.json` (competitor topics, news). Read through `lib/db.ts` and `lib/extras.ts` only.
- Config, all editable JSON in `config/`: `scoring.json` (weights and thresholds), `officials.json` (unranked accounts), `competitors.json` (share-of-voice topics, news queries), `outlets.json` (outlet groups), `site.json` (author and link).
- Commands: `npm run dev`, `npm run build`, `npm run refresh` (ingest, extras, findings draft, build), `npx tsc --noEmit` to type-check.
- Ingestion is cache-first: anything in `.cache/` is never refetched. Delete a cache file to refetch it.
- Rules: real data only, never invent accounts or numbers; a missing value is shown as missing. Never call an account a bot or fake; the anomaly flag is always labelled a heuristic. Screens carry no taglines or helper paragraphs; caveats live on the Methodology page.
- Theme tokens are CSS variables in `app/globals.css`; use them (`var(--color-line)`), not hex values, so light and dark both work.
- Machine-readable output: `/llms.txt` and `/data/*.json` are static route handlers under `app/`.

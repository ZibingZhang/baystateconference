# Bay State Conference

A website for the Bay State Conference (Massachusetts high school athletic conference), plus a couple of standalone tools used alongside it.
See `README.md` for the canonical project description — this file is Claude-specific operating notes.

## Repo layout

- `jekyll/` — the public website.
  Jekyll static site, deployed to GitHub Pages by `.github/workflows/jekyll.yaml`.
  Local dev: `cd jekyll && bundle exec jekyll serve`.
  The swimming/diving archive's file-browser index (`assets/data/file-browser/sports/swimming-diving/archive/index.json`, fetched at runtime by `assets/js/file-browser.js`) is generated at build time by `jekyll/_plugins/swimming_archive_index_generator.rb` — not checked in itself — from the hand-tagged `jekyll/_data/file-browser/sports/swimming-diving/archive/files.json` (entries needing multi-view indexing) plus the hand-maintained base tree in `jekyll/_data/file-browser/sports/swimming-diving/archive/index.json` (currently just "Other Sites").
- `arbiterlive/` — `arbiter_schedule.py` fetches each team's schedule from ArbiterLive into `jekyll/_data/schedule/games.csv`, which the Jekyll build consumes.
  Not committed; fetched daily in CI (`fetch-schedule.yaml`) and cached for the Jekyll build.
- `championshipentries/` — a React/Vite/MUI web app for coaches entering swim meet rosters and exporting them to Hytek EV3/HY3 formats.
  All state lives in `localStorage` (see `src/storage.ts`) — there is no backend.
  See the dedicated section below.
- `resources/miaa/` — MIAA data consumed by `championshipentries` (fetched at runtime via `raw.githubusercontent.com`, never read from the local filesystem): imported EV3 event files, one per meet, under `swimming-diving/<school-year>/<season>/<meet>/` and `high-schools.csv`.
  Raw per-meet result CSVs live separately, under `jekyll/_data/swimming-diving/<governing-body>/<school-year>/<season>/<meet>/` — e.g. `bsc/.../bay-state-conference/` — where Jekyll's `_data` mechanism loads them directly; `jekyll/_plugins/bsc_sheets_page_generator.rb` normalizes them in memory at site-generation time.
- `scripts/` — standalone Python utilities for MIAA data housekeeping (qualifying-standards sanity checks, rankings CSV sorting, score-column padding).
  Not wired into CI; run manually.
- `docs/hytek/` — reference docs for the Hytek EV3/HY3 file formats (`ev3-spec.md`, `hy3-spec.md`) that `championshipentries` reads/writes.
  Consult these before touching `src/hytek/`.

## championshipentries app

Commands (run from `championshipentries/`):
- `npm run dev` — Vite dev server (runs `generate:palette-tokens` first via `predev`)
- `npm run build` — `tsc -b && vite build`
- `npx tsc --noEmit` — type-check only
- `npm run lint` — `oxlint`
- `npm run format` / `npm run format:check` — `oxfmt`

Architecture notes:
- Single `AppData` blob (`meets`, `athletes`, `individualEntries`, `relayEntries`) persisted wholesale to `localStorage` — see `src/types.ts` and `src/storage.ts`.
- Undo/redo is in-memory only (`src/hooks/useHistory.ts`), wrapping every mutation.
- Business logic for a feature typically lives in a `src/hooks/use*.ts` hook (e.g. `useMeetActions`, `useMeetBackup`, `useHy3Export`) that takes `history` + callbacks (`showConfirm`/`showInfo`) and is wired into `App.tsx`; pure parsing/formatting logic lives in `src/domain/*.ts`; low-level file format parsing lives in `src/hytek/`.
- When adding a meet-level action (export, copy, etc.), follow the existing ID-remapping pattern in `useMeetActions.copyMeet` — new meet/athlete/entry IDs via `newId()`, athlete IDs remapped through a `Map` before being referenced by entries.
- No automated test suite yet — verify UI changes by running the dev server and driving it in a browser (see the `run` skill), not just `tsc`/`oxlint`.

## General

- Don't run destructive git operations, push, or commit unless explicitly asked.
- Commit messages: a concise, descriptive summary line and nothing else — leave the commit body empty.
- This is a solo/small-team hobby project — keep changes scoped and avoid introducing process (CI steps, test frameworks, etc.) the user hasn't asked for.
- When writing or editing Markdown files, put each sentence of prose on its own line (semantic linefeeds) instead of wrapping paragraphs to a fixed width.
  This keeps diffs localized to the sentence that actually changed, rather than reflowing an entire paragraph.
  Applies to prose paragraphs and list-item text; table cells and code blocks are exempt, since splitting those would break their syntax.

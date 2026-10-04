# Bay State Conference

A website for the Bay State Conference (Massachusetts high school athletic conference), plus a
couple of standalone tools used alongside it. See `README.md` for the canonical project
description — this file is Claude-specific operating notes.

## Repo layout

- `jekyll/` — the public website. Jekyll static site, deployed to GitHub Pages by
  `.github/workflows/jekyll.yaml`. Local dev: `cd jekyll && bundle exec jekyll serve`.
- `arbiterlive/` — `arbiter_schedule.py` fetches each team's schedule from ArbiterLive into
  `jekyll/_data/schedule/games.csv`, which the Jekyll build consumes. Not committed; fetched daily
  in CI (`fetch-schedule.yaml`) and cached for the Jekyll build.
- `championshipentries/` — a React/Vite/MUI web app for coaches entering swim meet rosters and
  exporting them to Hytek EV3/HY3 formats. All state lives in `localStorage` (see `src/storage.ts`)
  — there is no backend. See the dedicated section below.
- `resources/miaa/` — MIAA data consumed by `championshipentries` and/or `scripts/`: imported EV3
  event files (`events/`) and `high-schools.csv`.
- `scripts/` — standalone Python utilities for MIAA data housekeeping (qualifying-standards
  sanity checks, rankings CSV sorting, score-column padding). Not wired into CI; run manually.
- `docs/hytek/` — reference docs for the Hytek EV3/HY3 file formats (`ev3-spec.md`, `hy3-spec.md`)
  that `championshipentries` reads/writes. Consult these before touching `src/hytek/`.

## championshipentries app

Commands (run from `championshipentries/`):
- `npm run dev` — Vite dev server (runs `generate:palette-tokens` first via `predev`)
- `npm run build` — `tsc -b && vite build`
- `npx tsc --noEmit` — type-check only
- `npm run lint` — `oxlint`
- `npm run format` / `npm run format:check` — `oxfmt`

Architecture notes:
- Single `AppData` blob (`meets`, `athletes`, `individualEntries`, `relayEntries`) persisted
  wholesale to `localStorage` — see `src/types.ts` and `src/storage.ts`.
- Undo/redo is in-memory only (`src/hooks/useHistory.ts`), wrapping every mutation.
- Business logic for a feature typically lives in a `src/hooks/use*.ts` hook (e.g.
  `useMeetActions`, `useMeetBackup`, `useHy3Export`) that takes `history` + callbacks
  (`showConfirm`/`showInfo`) and is wired into `App.tsx`; pure parsing/formatting logic lives in
  `src/domain/*.ts`; low-level file format parsing lives in `src/hytek/`.
- When adding a meet-level action (export, copy, etc.), follow the existing ID-remapping pattern
  in `useMeetActions.copyMeet` — new meet/athlete/entry IDs via `newId()`, athlete IDs remapped
  through a `Map` before being referenced by entries.
- No automated test suite yet — verify UI changes by running the dev server and driving it in a
  browser (see the `run` skill), not just `tsc`/`oxlint`.

## General

- Don't run destructive git operations, push, or commit unless explicitly asked.
- Commit messages: a concise, descriptive summary line and nothing else — leave the commit body
  empty.
- This is a solo/small-team hobby project — keep changes scoped and avoid introducing process
  (CI steps, test frameworks, etc.) the user hasn't asked for.

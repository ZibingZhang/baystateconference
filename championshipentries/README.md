# Championship Entries

A React/Vite/MUI web app for coaches entering swim meet rosters and exporting them to Hytek EV3/HY3 formats.
All state lives in the browser's `localStorage` (see `src/storage.ts`) — there is no backend.

## Running locally

```sh
npm install
npm run dev
```

This starts the Vite dev server with hot module reloading, available at the URL printed in the terminal (typically `http://localhost:5173`).

## Other commands

- `npm run build` — type-check (`tsc -b`) and produce a production build with Vite
- `npx tsc --noEmit` — type-check only, without building
- `npm run lint` — lint with oxlint
- `npm run format` / `npm run format:check` — format (or check formatting) with oxfmt
- `npm run preview` — preview a production build locally

## Related

- `docs/hytek/` (repo root) — reference docs for the Hytek EV3/HY3 file formats this app reads/writes
- `resources/miaa/` (repo root) — MIAA data (imported EV3 event files, high-schools list) consumed by this app

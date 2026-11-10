# Bay State Conference

A website for the Bay State Conference, a Massachusetts high school athletic conference, plus a couple of standalone tools used alongside it.

See [`CLAUDE.md`](CLAUDE.md) for AI-assistant operating notes.

## Repo structure

- [jekyll/](jekyll/) — the public website.
  See [`jekyll/README.md`](jekyll/README.md) for local dev and schedule-data instructions.
- [`arbiterlive/`](arbiterlive/) — [`arbiter_schedule.py`](arbiterlive/arbiter_schedule.py) fetches each team's schedule from ArbiterLive into `jekyll/_data/schedule/games.csv`, which the Jekyll build consumes.
  Not committed; fetched daily in CI ([`.github/workflows/fetch-schedule.yaml`](.github/workflows/fetch-schedule.yaml)) and cached for the Jekyll build.
- [`championshipentries/`](championshipentries/) — a React/Vite/MUI web app for coaches entering swim meet rosters and exporting them to Hytek EV3/HY3 formats.
  See [`championshipentries/README.md`](championshipentries/README.md) for local dev instructions.
- [`resources/miaa/`](resources/miaa/) — MIAA data consumed by `championshipentries` (fetched at runtime via `raw.githubusercontent.com`, never read from the local filesystem): imported EV3 event files, one per meet, under [`swimming-diving/<school-year>/<season>/<meet>/`](resources/miaa/swimming-diving/) and [`high-schools.csv`](resources/miaa/high-schools.csv).
- [`docs/`](docs/) — reference docs.

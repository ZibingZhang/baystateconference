# arbiterlive

`arbiter_schedule.py` fetches schedules/results from [ArbiterLive](https://www.arbiterlive.com/) for every team fielded by the Bay State Conference schools, for a given school year, and writes them to a CSV at `jekyll/_data/schedule/games.csv`.
The Jekyll build reads that CSV directly (`site.data.schedule.games`, see `jekyll/_plugins/schedule_page_generator.rb`) to generate the `/sports/<sport>/schedule/` and `/schools/<school>/schedule/` pages.

The CSV isn't committed to the repo (see `.gitignore`) - in production it's fetched once a day by `.github/workflows/fetch-schedule.yaml` and cached for `.github/workflows/jekyll.yaml` to restore before building.
If it's missing entirely (e.g. a fresh checkout that hasn't run the fetch yet), the schedule pages just don't get generated - nothing else breaks.

School names come from `jekyll/_data/schools.yaml`; each is mapped to its ArbiterLive entity id via the hardcoded `SCHOOL_ENTITY_IDS` table in the script.

## Running locally

```sh
cd arbiterlive
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python3 arbiter_schedule.py
```

With no flags, that fetches the current school year and overwrites `jekyll/_data/schedule/games.csv` in place - the exact file `bundle exec jekyll build`/`serve` (run from `jekyll/`) already reads, so no extra wiring is needed afterwards.
It prints progress per team as it goes, and rewrites the CSV after every team (not just at the end), so a killed/interrupted run still leaves a usable partial file.

Re-run it whenever you want fresher schedules/results - there's no caching beyond the CSV itself.

## Flags

- `--school-year "2027-2028"` - fetch a different year. Defaults to the script's `DEFAULT_SCHOOL_YEAR` constant (update that each fall when a new season starts).
- `--include-youth` - also include middle-school/youth-level teams (excluded by default).
- `--out some/other/path.csv` - write somewhere else instead of overwriting the real data file.
- `--schools-yaml path/to/schools.yaml` - use a different schools list. Defaults to `jekyll/_data/schools.yaml`.
- `--delay 1.0` - seconds to sleep between requests for the same team (default `0.4`); raise this if ArbiterLive starts rate-limiting you.

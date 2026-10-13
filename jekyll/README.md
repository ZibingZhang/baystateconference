# Bay State Conference website

A [Jekyll](https://jekyllrb.com/) static site for the Bay State Conference, a Massachusetts high school athletic conference.
Deployed to GitHub Pages by `.github/workflows/jekyll.yaml`.

## Running locally

```sh
bundle install
bundle exec jekyll serve
```

## Schedule data

Every sport's `/sports/<sport>/schedule/` pages are generated from `_data/schedule/games.csv`, a CSV of every Bay State Conference team's games fetched from ArbiterLive by `arbiterlive/arbiter_schedule.py` (at the repo root).
That file isn't committed to the repo - in production it's fetched once a day by `.github/workflows/fetch-schedule.yaml` and cached for `.github/workflows/jekyll.yaml` to restore before building (see the comments in both files).
If it's missing entirely (e.g. a fresh checkout), the schedule pages just don't get generated - nothing else breaks.

To get the exact same data locally:

```sh
cd ../arbiterlive
pip install -r requirements.txt
./arbiter_schedule.py --out ../jekyll/_data/schedule/games.csv
```

Then `bundle exec jekyll build`/`serve` from here picks it up the same way CI does.
Re-run the fetch whenever you want fresher schedules/results; the school year it fetches defaults to `arbiter_schedule.py`'s `DEFAULT_SCHOOL_YEAR` constant (update that each fall when a new season starts, or pass `--school-year "2027-2028"` explicitly).

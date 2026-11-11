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

See [`arbiterlive/README.md`](../arbiterlive/README.md) for how to fetch the exact same data locally; `bundle exec jekyll build`/`serve` from here picks it up the same way CI does.

# CSV Spec

Schema for `individual_results.csv`, `relay_results.csv`, `diving_results.csv`, and `team_scores.csv`.

Once extracted, file these four CSVs (plus the meet's `README.md`) under `jekyll/_data/swimming-diving/<governing-body>/raw/<school-year>/<season>/<meet>/` (e.g. `jekyll/_data/swimming-diving/bsc/raw/2026-2027/fall/bay-state-conference/`) rather than under `resources/miaa/`, so Jekyll's `_data` mechanism can read them directly.
`events.ev3` for the same meet still belongs under `resources/miaa/swimming-diving/<school-year>/<season>/<meet>/` — it's a championshipentries-only template, not meet-result data.

## individual_results.csv

One row per swimmer per individual (non-relay, non-diving) event.

| Column | Type | Description |
|---|---|---|
| event_num | int | HY-TEK event number |
| event_name | string | Event name, "Girls"/"Boys" prefix stripped into `gender` |
| gender | `F` \| `M` | |
| heat | int, blank if no heat-sheet match | Heat number, from the heat sheet |
| lane | int, blank if no heat-sheet match | Lane number, from the heat sheet |
| place | int, blank if DQ/SCR/no place | Finish place |
| points | number | Points earned under 16-place scoring, doubled for relays, split across ties; 0 if unplaced or excluded |
| first_name, last_name | string | |
| year | string | 2-digit expected graduation year, or `FR`/`SO`/`JR`/`SR` |
| school | string | MIAA school abbreviation (see `resources/miaa/high-schools.csv`) |
| seed_time | string, blank if no heat-sheet match | Seed time from the heat sheet (`m:ss.hh` or `ss.hh`); `NT` = no previous time |
| finals_time | string, blank if DQ/SCR | Finals time |
| splits | string | Semicolon-separated per-50-yard lap splits (e.g. `28.97;32.03`); blank for 50-yard races, which have none |
| status | string, blank if neither | `DQ` if disqualified, `SCR` if entered but scratched (never swam) |
| exhibition | bool | Swam exhibition - the PDF marks this with an "x" prefix on the finals time |
| qualifier | string, blank if none | `DI` / `DII` / `SEC` if the swim met that qualifying standard |

## relay_results.csv

One row per relay squad per relay event.
Same `event_num`/`event_name`/`gender`/`heat`/`lane`/`place`/`points`/`seed_time`/`finals_time`/`status`/`exhibition`/`qualifier` columns as above, plus:

| Column | Type | Description |
|---|---|---|
| team | string | MIAA school abbreviation |
| relay | string | Relay letter as printed (`A`/`B`/`C`/...) - not meaningful for scoring, see note below |
| first_name_N, last_name_N, year_N | string | Swimmer on leg N (`N` is 1-4) |
| splits_N | string | Semicolon-separated per-50 lap splits for leg N's own swim; blank for 4x50 relays, which have no intermediate split within a 50 leg |

Scoring is by rank within each school's own squads, not by relay letter - only a school's fastest 2 squads in an event score points (e.g. a DQ'd "B" squad lets "C" become the scoring 2nd entry).
See `README.md` for the full explanation.

## diving_results.csv

One row per diver per diving event.
Same columns as `individual_results.csv` (including `heat`/`lane`, where `heat` is a "flight" number - diving has no real heats - and `lane` is the entry's position within that flight, not a literal pool lane), except:

- `seed_score` / `finals_score` (a numeric score) in place of `seed_time` / `finals_time`
- no `splits` (not applicable - diving has no lap times)
- no `exhibition` (not observed in any diving event this meet)

## team_scores.csv

One row per school's official final score, as printed in the results PDF.

| Column | Type | Description |
|---|---|---|
| gender | `F` \| `M` | |
| rank | int | Official team rank |
| school_abbreviation | string | MIAA school abbreviation |
| school_name | string | Full school name |
| score | number | Official total team points - see `README.md` for how this reconciles against summing `points` above |

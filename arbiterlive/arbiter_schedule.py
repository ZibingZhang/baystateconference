#!/usr/bin/env python3
"""
Fetch schedules/results from ArbiterLive for every team fielded by the Bay
State Conference schools, for a given school year, and write them to a CSV.

School names come from a schools.yaml file (Jekyll _data format, e.g.
baystateconferenceswive/jekyll/_data/schools.yaml); each is mapped to its
ArbiterLive entity id via the hardcoded SCHOOL_ENTITY_IDS table below (found
by searching arbiterlive.com/School/Search, starting from Needham's team
page at arbiterlive.com/Teams?entityId=15671). For each school we:

  1. Look up its entity id in SCHOOL_ENTITY_IDS.
  2. POST to /Teams (isAllTeam=true) to list every team (sport + level) the
     school has ever fielded on ArbiterLive.
  3. For each team, GET its schedule page and read the "School Year" <select>
     to find the option matching the requested year (e.g. "2026-2027", which
     ArbiterLive's own dropdown abbreviates to "2026-27" - see
     short_school_year()), then POST /Teams/ScheduleForSchoolYear to fetch
     that year's schedule fragment.

Every game between two Bay State Conference schools shows up twice this way
- once on each school's own schedule, as mirror images of each other. Before
writing the CSV, resolve_game_pairs() finds those mirrored rows and merges
each into a single game with a `team_1`/`team_2` pair (alphabetically
ordered) instead of a "school playing an opponent" pair, so the CSV has one
row per actual game rather than two. A game against a school we don't track
(a non-conference opponent) just keeps its single row.

No Selenium is needed -- everything here is a plain POST/GET parsed with
BeautifulSoup.

Example:
    ./arbiter_schedule.py --school-year 2026-2027 --out bsc_2026-2027.csv
"""
from __future__ import annotations

import argparse
import csv
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional

import requests
import yaml
from bs4 import BeautifulSoup

BASE_URL = "https://www.arbiterlive.com"
TEAMS_URL = f"{BASE_URL}/Teams"
SCHEDULE_URL = f"{BASE_URL}/Teams/Schedule/{{team_id}}"
SCHEDULE_FOR_YEAR_URL = f"{BASE_URL}/Teams/ScheduleForSchoolYear"

# Resolved from this file's own location (not cwd), so the defaults below
# are correct whether this is run locally (from anywhere) or in CI, where
# the repo is checked out under a completely different absolute path.
REPO_ROOT = Path(__file__).resolve().parent.parent

DEFAULT_SCHOOLS_YAML = str(REPO_ROOT / "jekyll" / "_data" / "schools.yaml")

# Our own canonical school-year format is the full "2026-2027" (this is what
# ends up in the CSV, and so in schedule page URLs like
# /sports/football/schedule/2026-2027/). ArbiterLive's own "School Year"
# dropdown instead abbreviates the second year ("2026-27") - see
# short_school_year(), used only when matching against that dropdown.
DEFAULT_SCHOOL_YEAR = "2026-2027"

# Jekyll reads this directly as site.data.schedule.games (see
# _plugins/schedule_page_generator.rb) - not committed, see .gitignore.
DEFAULT_OUT = str(REPO_ROOT / "jekyll" / "_data" / "schedule" / "games.csv")

# Number of team schedules to fetch concurrently.
PARALLEL_REQUESTS = 5

# Bay State Conference schools -> ArbiterLive entity id, found via
# arbiterlive.com/School/Search (each verified against its MA street address).
SCHOOL_ENTITY_IDS = {
    "Braintree High School": "2333",
    "Brookline High School": "2546",
    "Framingham High School": "7859",
    "Milton High School": "14798",
    "Natick High School": "15622",
    "Needham High School": "15671",
    "Newton North High School": "26531",
    "Walpole High School": "24665",
    "Wellesley High School": "25087",
    "Weymouth High School": "25620",
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
    ),
}

# Team "level" strings that indicate a youth/middle-school squad rather than
# a high school one (e.g. "Boys Middle School", "Girls 7/8th", "Boys 8th").
YOUTH_LEVEL_RE = re.compile(r"Middle School|\d+(st|nd|rd|th)\b")

# ArbiterLive sport name -> canonical site sport title (jekyll/_data/sports.yaml
# `title`). Several raw ArbiterLive sports collapse onto one site sport
# (e.g. Indoor/Outdoor/Adapted Track & Field all become "Track & Field";
# Lacrosse - Boys/Girls become "Lacrosse", distinguished instead by `sex`).
SPORT_NORMALIZE = {
    "Baseball": "Baseball",
    "Basketball": "Basketball",
    "Bocce": "Bocce",
    "Competitive Cheerleading": "Competitive Cheerleading",
    "Cross Country": "Cross Country",
    "Cross Country Skiing": "Cross Country Skiing",
    "Dance": "Dance",
    "Diving": "Swimming & Diving",
    "Fencing": "Fencing",
    "Field Hockey": "Field Hockey",
    "Flag Football": "Flag Football",
    "Football": "Football",
    "Golf": "Golf",
    "Gymnastics": "Gymnastics",
    "Hockey": "Hockey",
    "Lacrosse - Boys": "Lacrosse",
    "Lacrosse - Girls": "Lacrosse",
    "Rowing/Crew": "Rowing/Crew",
    "Rugby": "Rugby",
    "Sailing": "Sailing",
    "Ski": "Ski",
    "Soccer": "Soccer",
    "Softball": "Softball",
    "Squash": "Squash",
    "Swimming": "Swimming & Diving",
    "Tennis": "Tennis",
    "Tennis - Team": "Tennis",
    "Track & Field - Adapted": "Track & Field",
    "Track & Field - Indoor": "Track & Field",
    "Track & Field - Outdoor": "Track & Field",
    "Ultimate Frisbee": "Ultimate Frisbee",
    "Volleyball": "Volleyball",
    "Wrestling": "Wrestling",
}

# "Boys Varsity" -> ("Boys", "Varsity"); "Coed Unified" -> ("Coed", "Unified").
SEX_LEVEL_RE = re.compile(r"^(Boys|Girls|Coed)\s+(.*)$")

# ArbiterLive's "Home or Away" column uses "vs" for home games and "@" for away.
HOME_AWAY_MAP = {"vs": "Home", "@": "Away"}

# Collapses the many raw level spellings (a school's own naming for its
# sub-varsity squads varies a lot: "Junior Varsity", "Junior Varsity - JV1",
# "JV2", "Freshman", "Froshmore", ...) down to "Varsity" vs "Sub-Varsity" for
# display. Anything that doesn't look like either (e.g. "Unified",
# "Division I") passes through unchanged rather than being forced into one
# of the two buckets.
SUB_VARSITY_RE = re.compile(r"Junior Varsity|Freshman|Froshmore|Sophomore|\bJV\s*\d*\b", re.IGNORECASE)

# ArbiterLive's date_time column has no year of its own (e.g. "Sat Jan 2
# 1:30 PM") and occasionally no real time either ("TBA", a bare date with
# nothing after it, or - for the odd multi-day tournament entry - a date
# range plus a "Show Details" link). This pulls out the weekday/month/day
# prefix and treats everything after it as the time-of-day, however messy.
DATE_TIME_RE = re.compile(r"^(?P<wday>\w{3}) (?P<mon>\w{3}) (?P<day>\d{1,2})\b\s*(?P<time>.*)$")
TIME_OF_DAY_RE = re.compile(r"^(\d{1,2}):(\d{2})\s*([AP]M)$", re.IGNORECASE)


@dataclass
class Team:
    school: str
    entity_id: str
    sport: str
    level: str
    team_id: str


@dataclass
class Game:
    school_year: str
    team_id: str
    school: str
    sport: str
    sex: Optional[str]
    level: str
    date_time: str
    home_away: Optional[str]
    opponent: Optional[str]
    location: Optional[str]
    result: Optional[str]     # "W" / "L" / "T" / None
    score: Optional[str]      # e.g. "94-91", this team's score first
    game_type: Optional[str]  # e.g. "L" for league


@dataclass
class ResolvedGame:
    """One game between two Bay State Conference teams, with the two
    per-team rows ArbiterLive gives us (one from each school's own schedule)
    resolved into a single row. See resolve_game_pairs()."""

    school_year: str
    sport: str
    sex: Optional[str]
    level: str
    date: Optional[str]        # ISO 8601, e.g. "2026-09-08"
    time: Optional[str]        # ISO 8601 24-hour "HH:MM", or "TBA"
    team_1: str  # the alphabetically-earlier of the two team names
    team_2: str  # the alphabetically-later of the two team names
    home_team: Optional[str]  # team_1, team_2, or None if unknown
    location: Optional[str]
    winner: Optional[str]     # team_1, team_2, "Tie", or None if not yet played
    score: Optional[str]      # "<team_1's score>-<team_2's score>"
    game_type: Optional[str]


def normalize_sport(sport: str) -> str:
    return SPORT_NORMALIZE.get(sport, sport)


def split_sex_level(level: str) -> tuple[Optional[str], str]:
    m = SEX_LEVEL_RE.match(level)
    if m:
        return m.group(1), m.group(2)
    return None, level


def normalize_level(level: str) -> str:
    if level == "Varsity" or level.startswith("Varsity"):
        return "Varsity"
    if SUB_VARSITY_RE.search(level):
        return "Sub-Varsity"
    return level


def normalize_home_away(home_away: Optional[str]) -> Optional[str]:
    if home_away is None:
        return None
    return HOME_AWAY_MAP.get(home_away, home_away)


def split_date_time(date_time: str, school_year: str) -> tuple[Optional[str], Optional[str]]:
    """Splits ArbiterLive's "Sat Jan 2 1:30 PM" into an ISO 8601 date and
    time, resolving the actual calendar year from `school_year` (a school
    year runs roughly Jul-Jun, so Jul-Dec games fall in the first calendar
    year of e.g. "2026-2027" and Jan-Jun games fall in the second). Falls
    back to a "TBA" time when there's no parseable time-of-day (a real
    "TBA", a bare date, or a stray tournament listing)."""
    m = DATE_TIME_RE.match(date_time or "")
    if not m:
        return None, "TBA"

    first_year = int(school_year.split("-")[0])
    try:
        probe = datetime.strptime(f"{m['wday']} {m['mon']} {m['day']} {first_year}", "%a %b %d %Y")
    except ValueError:
        return None, "TBA"

    actual_year = first_year if probe.month >= 7 else first_year + 1
    iso_date = probe.replace(year=actual_year).strftime("%Y-%m-%d")

    time_match = TIME_OF_DAY_RE.match(m["time"].strip())
    if not time_match:
        return iso_date, "TBA"

    hour, minute, ampm = int(time_match.group(1)), int(time_match.group(2)), time_match.group(3).upper()
    if ampm == "PM" and hour != 12:
        hour += 12
    elif ampm == "AM" and hour == 12:
        hour = 0

    return iso_date, f"{hour:02d}:{minute:02d}"


def resolve_game_pairs(games: list[Game]) -> list[ResolvedGame]:
    """Each game between two Bay State Conference teams shows up twice in
    `games` - once from each school's own ArbiterLive schedule, as mirror
    images of each other (school/opponent swapped, home_away/result/score
    flipped). This finds those mirrored pairs and merges each into one row.

    A game against a school we don't track (so there's no mirror row to find
    - e.g. a non-conference opponent) is kept as a single row instead of
    being dropped.

    Rows are matched on the exact (raw, not sex/level-normalized) `level`
    string, since two schools sometimes spell the same sub-varsity tier
    differently (e.g. "Junior Varsity" vs "Junior Varsity - JV1") - matching
    loosely on the normalized Varsity/Sub-Varsity bucket instead risked
    cross-pairing two different concurrent games (e.g. a JV and a Freshman
    game at the same time) that happen to collapse into the same bucket.
    The tradeoff: a few genuine pairs stay unmerged (shown as two rows)
    rather than ever risk merging the wrong two games together.
    """
    groups: dict[tuple, list[Game]] = {}
    for g in games:
        key = (g.sport, g.school_year, g.sex, g.level, g.date_time, frozenset([g.school, g.opponent or ""]))
        groups.setdefault(key, []).append(g)

    resolved: list[ResolvedGame] = []
    for group in groups.values():
        if len(group) == 2 and group[0].school == group[1].opponent and group[1].school == group[0].opponent:
            resolved.append(merge_game(group[0], group[1]))
        else:
            resolved.extend(merge_game(g, None) for g in group)

    return resolved


def merge_game(g: Game, mirror: Optional[Game]) -> ResolvedGame:
    team_1, team_2 = sorted([g.school, g.opponent or "TBA"])

    home_team = None
    for row in (g, mirror):
        if row is None:
            continue
        if row.home_away == "Home":
            home_team = row.school
            break
        if row.home_away == "Away":
            home_team = row.opponent
            break

    winner = None
    if g.result == "W":
        winner = g.school
    elif g.result == "L":
        winner = g.opponent
    elif g.result == "T":
        winner = "Tie"

    score = None
    if g.score and "-" in g.score:
        own, opp = g.score.split("-", 1)
        score = f"{own}-{opp}" if g.school == team_1 else f"{opp}-{own}"

    date, time_of_day = split_date_time(g.date_time, g.school_year)

    return ResolvedGame(
        school_year=g.school_year,
        sport=g.sport,
        sex=g.sex,
        level=normalize_level(g.level),
        date=date,
        time=time_of_day,
        team_1=team_1,
        team_2=team_2,
        home_team=home_team,
        location=g.location or (mirror.location if mirror else None),
        winner=winner,
        score=score,
        game_type=g.game_type or (mirror.game_type if mirror else None),
    )


def load_school_names(yaml_path: str) -> list[str]:
    with open(yaml_path) as f:
        schools = yaml.safe_load(f)
    return [s["school-name"] for s in schools]


def fetch_all_teams(session: requests.Session, school_name: str, entity_id: str) -> list[Team]:
    """List every team (sport + level) the school has ever fielded."""
    session.get(f"{TEAMS_URL}?entityId={entity_id}", timeout=30)
    resp = session.post(
        TEAMS_URL,
        data={"isAllTeam": "true", "isRedirect": "true", "entityId": entity_id},
        timeout=30,
    )
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    container = soup.find("div", id="sportBoxContainer")
    if container is None:
        return []

    teams: list[Team] = []
    for box in container.find_all("div", class_="sportBox"):
        h3 = box.find("h3")
        sport = h3.get_text(strip=True) if h3 else "Unknown"
        for row in box.find_all("tr"):
            a = row.find("a", class_="teamViewLink-anchor")
            if not a:
                continue
            level = " ".join(a.get_text(" ", strip=True).split())
            m = re.search(r"/Teams/Schedule/(\d+)", a.get("href", ""))
            if not m:
                continue
            teams.append(
                Team(
                    school=school_name,
                    entity_id=entity_id,
                    sport=sport,
                    level=level,
                    team_id=m.group(1),
                )
            )
    return teams


def is_youth_level(level: str) -> bool:
    return bool(YOUTH_LEVEL_RE.search(level))


def short_school_year(school_year: str) -> str:
    """"2026-2027" -> "2026-27", matching ArbiterLive's own dropdown label."""
    first, second = school_year.split("-")
    return f"{first}-{second[-2:]}"


def get_school_year_option(session: requests.Session, team_id: str, school_year: str) -> Optional[str]:
    """GET the team schedule page and return the <option value> matching the
    requested school year (e.g. "2026-2027", shown on ArbiterLive's own
    dropdown in its abbreviated "2026-27" form)."""
    resp = session.get(SCHEDULE_URL.format(team_id=team_id), timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    select = soup.find("select")
    if select is None:
        return None

    label = short_school_year(school_year)
    for opt in select.find_all("option"):
        if opt.get_text(strip=True) == label and opt.get("value"):
            return opt["value"]
    return None


def fetch_year_html(session: requests.Session, team_id: str, school_year_id: str) -> str:
    resp = session.post(
        SCHEDULE_FOR_YEAR_URL,
        data={"uniqueTeamId": team_id, "schoolYearId": school_year_id},
        headers={"X-Requested-With": "XMLHttpRequest"},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.text


def parse_games(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    games: list[dict] = []

    for row in soup.select("tr"):
        cells = row.find_all("td")
        if len(cells) < 6:
            continue

        date_time = re.sub(r"\s+", " ", cells[0].get_text(" ", strip=True))
        if not date_time:
            continue

        home_away = normalize_home_away(cells[1].get_text(strip=True) or None)
        opponent = cells[2].get_text(" ", strip=True) or None
        location = re.sub(r"\s+", " ", cells[3].get_text(" ", strip=True)) or None

        result_cell = cells[4]
        result_div = result_cell.find("div", class_=re.compile(r"^result_"))
        result = None
        score = None
        if result_div:
            cls = next((c for c in result_div.get("class", []) if c.startswith("result_")), "")
            result = cls.replace("result_", "") or None
            score_div = result_div.find_next_sibling("div")
            if score_div:
                score = score_div.get_text(strip=True) or None

        game_type = cells[5].get_text(strip=True) or None

        games.append(
            {
                "date_time": date_time,
                "home_away": home_away,
                "opponent": opponent,
                "location": location,
                "result": result,
                "score": score,
                "game_type": game_type,
            }
        )

    return games


def fetch_team_games(
    session: requests.Session, team: Team, school_year: str, delay: float
) -> tuple[Team, list[dict], Optional[str]]:
    """Fetch one team's schedule for `school_year`. Runs in a worker thread,
    so it returns its result instead of touching shared state directly."""
    try:
        school_year_id = get_school_year_option(session, team.team_id, school_year)
        if school_year_id is None:
            return team, [], f"no {school_year} option found"

        html = fetch_year_html(session, team.team_id, school_year_id)
        games = parse_games(html)
    except requests.RequestException as exc:
        return team, [], str(exc)
    finally:
        time.sleep(delay)

    return team, games, None


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--schools-yaml",
        default=DEFAULT_SCHOOLS_YAML,
        help="Path to the Bay State Conference schools.yaml file",
    )
    parser.add_argument(
        "--school-year",
        default=DEFAULT_SCHOOL_YEAR,
        help='School year to fetch, e.g. "2026-2027"',
    )
    parser.add_argument(
        "--include-youth",
        action="store_true",
        help="Include middle-school / youth-level teams (excluded by default)",
    )
    parser.add_argument(
        "--delay", type=float, default=0.4, help="Seconds to sleep between team requests"
    )
    parser.add_argument(
        "--out", default=DEFAULT_OUT, help="Path to write the CSV output"
    )
    args = parser.parse_args()

    sys.stdout.reconfigure(line_buffering=True)

    school_names = load_school_names(args.schools_yaml)
    print(f"Loaded {len(school_names)} schools from {args.schools_yaml}")

    session = requests.Session()
    session.headers.update(HEADERS)

    all_teams: list[Team] = []
    for school_name in school_names:
        entity_id = SCHOOL_ENTITY_IDS.get(school_name)
        if not entity_id:
            print(f"  ! No hardcoded ArbiterLive entity id for {school_name!r}, skipping.")
            continue

        teams = fetch_all_teams(session, school_name, entity_id)
        if not args.include_youth:
            teams = [t for t in teams if not is_youth_level(t.level)]

        print(f"  {school_name}: entity {entity_id}, {len(teams)} team(s)")
        all_teams.extend(teams)
        time.sleep(args.delay)

    print(f"\nFetching {args.school_year} schedules for {len(all_teams)} team(s)...")

    all_games: list[Game] = []
    completed = 0
    with ThreadPoolExecutor(max_workers=PARALLEL_REQUESTS) as executor:
        futures = {
            executor.submit(fetch_team_games, session, team, args.school_year, args.delay): team
            for team in all_teams
        }

        for future in as_completed(futures):
            team = futures[future]
            completed += 1
            _, games, error = future.result()

            if error:
                print(f"  [{completed}/{len(all_teams)}] {team.school} {team.sport} {team.level}: {error}")
                continue

            sex, level = split_sex_level(team.level)
            for g in games:
                all_games.append(
                    Game(
                        school_year=args.school_year,
                        team_id=team.team_id,
                        school=team.school,
                        sport=normalize_sport(team.sport),
                        sex=sex,
                        level=level,
                        **g,
                    )
                )

            print(
                f"  [{completed}/{len(all_teams)}] {team.school} {team.sport} {team.level}: {len(games)} game(s)"
            )

    print(f"\nResolving game pairs (each Bay State Conference matchup was fetched from both teams)...")
    resolved = resolve_game_pairs(all_games)
    print(f"{len(all_games)} team-game rows -> {len(resolved)} resolved games")

    fieldnames = [
        "school_year",
        "sport",
        "sex",
        "level",
        "date",
        "time",
        "team_1",
        "team_2",
        "home_team",
        "location",
        "winner",
        "score",
        "game_type",
    ]

    with open(args.out, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for g in resolved:
            writer.writerow(asdict(g))

    print(f"\nWrote {len(resolved)} game(s) to {args.out}")


if __name__ == "__main__":
    main()

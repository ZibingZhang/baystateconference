# Precomputes each school's historical swimming & diving championship win
# years (BSC/Sectional/State), replacing the up to 4 Liquid `where_exp`
# scans swimming-diving-school-section-extra.html ran per school per
# section (20 calls: 10 schools x Girls/Boys) over the BSC/Sectional/State
# team_scores.csv files - the actual profiled bottleneck. Computed once here
# and stashed on each school's own schools.yaml hash (mutated in place, so
# school-grid.html, schedules/by-school, and school_info_generator.rb's
# page.data["school_info"] all see the same updated hash - no ordering
# needed between this generator and school_info_generator.rb).
#
# All three wins come straight from each year/season['/division]'s
# team_scores.csv (the same per-meet data meet_sheets_page_generator.rb
# renders) via MeetSheetsPageUtils.team_scores_rows, rather than a hand-
# maintained rollup rankings CSV - see that method's comment for why one
# isn't needed any more.
require_relative "meet_sheets_page_utils"

module SwimmingDivingSchoolWins
  class Generator < Jekyll::Generator
    safe true

    BSC_RAW_ROOT = %w[swimming-diving bsc].freeze
    SECTIONALS_RAW_ROOT = %w[swimming-diving miaa sectionals].freeze
    STATE_RAW_ROOT = %w[swimming-diving miaa state].freeze

    def generate(site)
      bsc = MeetSheetsPageUtils.team_scores_rows(site, BSC_RAW_ROOT)
      sectionals = MeetSheetsPageUtils.team_scores_rows(site, SECTIONALS_RAW_ROOT, multi_meet: true)
      states = MeetSheetsPageUtils.team_scores_rows(site, STATE_RAW_ROOT)
      high_schools = MeetSheetsPageUtils.high_school_names(site)

      (site.data["schools"] || []).each do |school|
        school["swim_wins"] = wins_for(school, bsc, sectionals, states, high_schools)
      end
    end

    private

    def wins_for(school, bsc, sectionals, states, high_schools)
      names = school_names(school)

      {
        "F" => {
          "bsc" => bsc_years(bsc, names, "F", "fall", 0, high_schools),
          "sectional" => division_years(sectionals, names, "F", high_schools),
          "state" => division_years(states, names, "F", high_schools),
        },
        "M" => {
          "bsc_fall" => bsc_years(bsc, names, "M", "fall", 0, high_schools),
          "bsc_winter" => bsc_years(bsc, names, "M", "winter", 1, high_schools),
          "sectional" => division_years(sectionals, names, "M", high_schools),
          "state" => division_years(states, names, "M", high_schools),
        },
      }
    end

    def school_names(school)
      [school["town"], school["school-name"], *school["aliases"]]
    end

    # BSC has no Division column and splits Boys into Fall/Winter
    # championships (Girls has only ever raced in the fall). `half` picks
    # which half of "School Year" (e.g. "2020-2021") to report: 0 (first
    # year) for fall, 1 (second year) for winter.
    def bsc_years(rows, names, gender, season, half, high_schools)
      years = rows.filter_map do |row|
        next unless row["gender"] == gender && row["Season"] == season && row["rank"] == "1"

        school_name = MeetSheetsPageUtils.resolve_school_name(row, high_schools)
        next unless names.include?(school_name)

        row["School Year"].split("-")[half]
      end
      years.uniq.sort.reverse
    end

    # Sectional/State wins aren't split by season the way BSC is - each
    # row's own Season still determines which half of "School Year" its win
    # year is (fall -> first year, winter -> second year). Each row's rank
    # is already scoped to its own division - a separate team_scores.csv per
    # Sectional division/meet, likewise for a State year split into
    # division-1/division-2 (see meet_sheets_page_utils.rb#team_scores_rows)
    # - so rank == "1" alone identifies that division's champion, with no
    # grouping needed here.
    def division_years(rows, names, gender, high_schools)
      years = rows.filter_map do |row|
        next unless row["gender"] == gender && row["rank"] == "1"

        school_name = MeetSheetsPageUtils.resolve_school_name(row, high_schools)
        next unless names.include?(school_name)

        half = row["Season"] == "fall" ? 0 : 1
        row["School Year"].split("-")[half]
      end
      years.uniq.sort.reverse
    end
  end
end

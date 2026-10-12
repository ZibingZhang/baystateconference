# Precomputes each school's historical swimming & diving championship win
# years (BSC/Sectional/State), replacing the up to 4 Liquid `where_exp`
# scans swimming-diving-school-section-extra.html ran per school per
# section (20 calls: 10 schools x Girls/Boys) over the BSC, sectional, and
# state rankings CSVs - the actual profiled bottleneck. Computed once here
# and stashed on each school's own schools.yaml hash (mutated in place, so
# school-grid.html, schedules/by-school, and school_info_generator.rb's
# page.data["school_info"] all see the same updated hash - no ordering
# needed between this generator and school_info_generator.rb).
#
# See ranking_page_generator.rb for the site.data.dig(*path) convention
# this reuses for the same CSV-backed data.
module SwimmingDivingSchoolWins
  class Generator < Jekyll::Generator
    safe true

    BSC_PATH = %w[swimming-diving bsc rankings].freeze
    SECTIONALS_PATH = %w[swimming-diving miaa rankings sectionals].freeze
    STATES_PATH = %w[swimming-diving miaa rankings states].freeze

    def generate(site)
      bsc = site.data.dig(*BSC_PATH) || []
      sectionals = site.data.dig(*SECTIONALS_PATH) || []
      states = site.data.dig(*STATES_PATH) || []

      (site.data["schools"] || []).each do |school|
        school["swim_wins"] = wins_for(school, bsc, sectionals, states)
      end
    end

    private

    def wins_for(school, bsc, sectionals, states)
      names = school_names(school)

      {
        "F" => {
          "bsc" => bsc_years(bsc, names, "F", "fall", 0),
          "sectional" => division_years(sectionals, names, "F"),
          "state" => division_years(states, names, "F"),
        },
        "M" => {
          "bsc_fall" => bsc_years(bsc, names, "M", "fall", 0),
          "bsc_winter" => bsc_years(bsc, names, "M", "winter", 1),
          "sectional" => division_years(sectionals, names, "M"),
          "state" => division_years(states, names, "M"),
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
    def bsc_years(rows, names, sex, season, half)
      years = rows.filter_map do |row|
        next unless row["Sex"] == sex && row["Season"] == season &&
                    row["Place"] == "1" && names.include?(row["School"])

        row["School Year"].split("-")[half]
      end
      years.uniq.sort.reverse
    end

    # Sectional/State wins aren't split by season the way BSC is - each
    # row's own Season still determines which half of "School Year" its win
    # year is (fall -> first year, winter/other -> second year).
    def division_years(rows, names, sex)
      years = rows.filter_map do |row|
        next unless row["Sex"] == sex && row["Place"] == "1" && names.include?(row["School"])

        half = row["Season"] == "fall" ? 0 : 1
        row["School Year"].split("-")[half]
      end
      years.uniq.sort.reverse
    end
  end
end

# Precomputes the MIAA Sectional/State rankings pages' "groups" data: one
# table per Gender/Season combination (e.g. "Girls Fall"), one row per
# school year - or, for Sectionals, one row per school year/division, since
# each division there is its own physical meet with its own hub page (see
# meet_sheets_page_generator.rb's meet_labels) - showing that row's top 3
# finishers, with the row linking straight to the corresponding meet hub
# page. Mirrors bsc_rankings_summary_generator.rb's approach for BSC: reads
# each year's team_scores.csv directly via MeetSheetsPageUtils.team_scores_
# rows (the same raw per-meet data the hub pages render) rather than a
# hand-maintained rollup rankings CSV - see that method's comment for why
# one isn't needed any more.
#
# Stashed onto each hand-authored jekyll/sports/swimming-diving/meets/<source>/
# rankings.md page (found by URL), same as that generator.
require_relative "meet_sheets_page_utils"

module Rankings
  class PageGenerator < Jekyll::Generator
    safe true

    SEASON_ORDER = { "fall" => 0, "winter" => 1 }.freeze
    SEASON_LABELS = { "fall" => "Fall", "winter" => "Winter" }.freeze
    GENDER_ORDER = { "F" => 0, "M" => 1 }.freeze
    GENDER_LABELS = { "F" => "Girls", "M" => "Boys" }.freeze

    # Meet slug -> display label - same slugs as meet_sheets_page_generator.
    # rb's meet_labels, but without its " Sectional" suffix, since this
    # page's own heading already says "<year> Fall"/"<year> Winter".
    SECTIONAL_DIVISION_LABELS = {
      "eastern-mass" => "Eastern Mass",
      "north" => "North",
      "south" => "South",
      "central-south" => "Central/South",
      "west" => "West",
      "western-mass" => "Western Mass",
      "central-west" => "Central/West",
    }.freeze

    SOURCES = [
      {
        page_url: "/sports/swimming-diving/meets/sectionals/rankings/",
        raw_root: %w[swimming-diving miaa sectionals],
        multi_meet: true,
        division_of: ->(row) { row["Meet"] },
        division_label: ->(division) { SECTIONAL_DIVISION_LABELS[division] || division },
        hub_url: ->(year, season, division) { "/sports/swimming-diving/meets/sectionals/#{year}/#{season}/#{division}/" },
      },
      {
        page_url: "/sports/swimming-diving/meets/state/rankings/",
        raw_root: %w[swimming-diving miaa state],
        multi_meet: false,
        division_of: ->(row) { row["division"].to_s },
        division_label: ->(division) { division },
        # State never splits a season across separate meet pages the way
        # Sectionals does - a year with two divisions still has just the
        # one hub page, with both divisions' tables on it (see
        # meet_sheets_page_utils.rb#team_score_groups) - so every row for a
        # given year/season links to the same URL regardless of division.
        hub_url: ->(year, season, _division) { "/sports/swimming-diving/meets/state/#{year}/#{season}/" },
      },
    ].freeze

    def generate(site)
      high_schools = MeetSheetsPageUtils.high_school_names(site)
      SOURCES.each { |source| generate_source(site, source, high_schools) }
    end

    private

    def generate_source(site, source, high_schools)
      page = site.pages.find { |p| p.url == source[:page_url] }
      return unless page

      rows = MeetSheetsPageUtils.team_scores_rows(site, source[:raw_root], multi_meet: source[:multi_meet])
      page.data["groups"] = groups_for(rows, source, high_schools)
    end

    def groups_for(rows, source, high_schools)
      keys = rows.map { |row| [row["Season"], row["gender"]] }.uniq
      keys.sort_by! { |season, gender| [SEASON_ORDER[season] || 99, GENDER_ORDER[gender] || 99] }

      keys.map do |season, gender|
        matching = rows.select { |row| row["Season"] == season && row["gender"] == gender }
        heading = "#{GENDER_LABELS[gender] || gender} #{SEASON_LABELS[season] || season}"
        { "heading" => heading, "years" => years_for(matching, source, high_schools) }
      end
    end

    def years_for(rows, source, high_schools)
      by_year = rows.group_by { |row| row["School Year"] }

      by_year.keys.sort.reverse.flat_map do |school_year|
        year_rows = by_year[school_year]
        divisions = year_rows.map { |row| source[:division_of].call(row) }.uniq.sort

        divisions.map do |division|
          division_rows = year_rows.select { |row| source[:division_of].call(row) == division }
                                    .sort_by { |row| row["rank"].to_f }
          season = division_rows.first["Season"]
          label = source[:division_label].call(division)

          {
            "year" => division.empty? ? MeetSheetsPageUtils.en_dash(school_year) : "#{MeetSheetsPageUtils.en_dash(school_year)} — #{label}",
            "url" => source[:hub_url].call(school_year, season, division),
            "entries" => division_rows.first(3).map { |row| { "School" => MeetSheetsPageUtils.resolve_school_name(row, high_schools) } },
          }
        end
      end
    end
  end
end

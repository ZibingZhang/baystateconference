# Precomputes the MIAA Sectional/State rankings pages' "groups" data: one
# table per Gender/Season combination (e.g. "Girls Fall"), one row per
# school year - or, for Sectionals, one row per school year/division, since
# each division there is its own physical meet with its own hub page (see
# meet_sheets_page_generator.rb's meet_labels) - showing that row's top 3
# finishers, with the row linking straight to the corresponding meet hub
# page. Mirrors bsc_rankings_summary_generator.rb's approach for BSC, which
# reads team_scores.csv directly instead of one of these rollup rankings
# CSVs; both render through the same rankings-summary-table.html include.
#
# Stashed onto each hand-authored jekyll/sports/swimming-diving/<source>/
# rankings.md page (found by URL), same as that generator - so adding a new
# season's rows to a CSV is enough on its own to update the page, no
# matching page to remember.
module Rankings
  class PageGenerator < Jekyll::Generator
    safe true

    SEASON_ORDER = { "fall" => 0, "winter" => 1 }.freeze
    SEASON_LABELS = { "fall" => "Fall", "winter" => "Winter" }.freeze
    GENDER_ORDER = { "F" => 0, "M" => 1 }.freeze
    GENDER_LABELS = { "F" => "Girls", "M" => "Boys" }.freeze

    # MIAA Sectionals' Division column is really that meet's own slug (see
    # meet_sheets_page_generator.rb's meet_labels), just written out in
    # Title Case with "/" instead of "-" - e.g. "Central/West" instead of
    # "central-west" - so each row can link straight to that specific
    # meet's own hub page rather than the season directory above it.
    SECTIONAL_MEET_SLUGS = {
      "Eastern Mass" => "eastern-mass",
      "North" => "north",
      "South" => "south",
      "Central/South" => "central-south",
      "West" => "west",
      "Western Mass" => "western-mass",
      "Central/West" => "central-west",
    }.freeze

    SOURCES = [
      {
        data_path: %w[swimming-diving miaa rankings sectionals],
        page_url: "/sports/swimming-diving/sectionals/rankings/",
        hub_url: ->(year, season, division) { "/sports/swimming-diving/sectionals/#{year}/#{season}/#{SECTIONAL_MEET_SLUGS[division]}/" },
      },
      {
        data_path: %w[swimming-diving miaa rankings states],
        page_url: "/sports/swimming-diving/states/rankings/",
        # States never splits a season across separate meet pages the way
        # Sectionals does - a year with two divisions still has just the
        # one hub page, with both divisions' tables on it (see
        # meet_sheets_page_utils.rb#team_score_groups) - so every row for a
        # given year/season links to the same URL regardless of division.
        hub_url: ->(year, season, _division) { "/sports/swimming-diving/states/#{year}/#{season}/" },
      },
    ].freeze

    def generate(site)
      SOURCES.each { |source| generate_source(site, source) }
    end

    private

    def generate_source(site, source)
      page = site.pages.find { |p| p.url == source[:page_url] }
      return unless page

      entries = site.data.dig(*source[:data_path]) || []
      page.data["groups"] = groups_for(entries, source)
    end

    def groups_for(entries, source)
      keys = entries.map { |entry| [entry["Season"], entry["Gender"]] }.uniq
      keys.sort_by! { |season, gender| [SEASON_ORDER[season] || 99, GENDER_ORDER[gender] || 99] }

      keys.map do |season, gender|
        rows = entries.select { |entry| entry["Season"] == season && entry["Gender"] == gender }
        heading = "#{GENDER_LABELS[gender] || gender} #{SEASON_LABELS[season] || season}"
        divisions = rows.map { |row| row["Division"].to_s }.reject(&:empty?).uniq.sort
        { "heading" => heading, "years" => years_for(rows, season, source), "divisions" => divisions }
      end
    end

    def years_for(rows, season, source)
      by_year = rows.group_by { |row| row["School Year"] }

      by_year.keys.sort.reverse.flat_map do |school_year|
        year_rows = by_year[school_year]
        divisions = year_rows.map { |row| row["Division"].to_s }.uniq.sort

        divisions.map do |division|
          division_rows = year_rows.select { |row| row["Division"].to_s == division }
          division_rows = division_rows.sort_by { |row| row["Place"].to_f }

          {
            "year" => division.empty? ? en_dash(school_year) : "#{en_dash(school_year)} — #{division}",
            "division" => division,
            "url" => source[:hub_url].call(school_year, season, division),
            "entries" => division_rows.first(3).map { |row| { "School" => row["School"] } },
          }
        end
      end
    end

    def en_dash(year)
      year.sub("-", "–")
    end
  end
end

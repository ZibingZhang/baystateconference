# Precomputes the Bay State Conference rankings page's "groups" data: one
# table per Girls Fall/Boys Fall/Boys Winter championship, one row per
# school year showing that year's top 3 team finishers, each year linking
# straight to its meet hub page (see meet_sheets_page_generator.rb). Reads
# the same per-year team_scores.csv data that generator's BSC hub pages do.
#
# Stashed onto the hand-authored jekyll/sports/swimming-diving/meets/bsc/
# rankings.md page (found by URL) rather than a page of its own - mirrors
# meet_sheets_page_utils.rb#inject_latest_meet_url's site.pages.find-and-
# merge pattern.
require_relative "meet_sheets_page_utils"

module BscRankingsSummary
  class Generator < Jekyll::Generator
    safe true

    RAW_ROOT = %w[swimming-diving bsc].freeze
    PAGE_URL = "/sports/swimming-diving/meets/bsc/rankings/".freeze

    CATEGORIES = [
      { heading: "Girls Fall", gender: "F", season: "fall" },
      { heading: "Boys Fall", gender: "M", season: "fall" },
      { heading: "Boys Winter", gender: "M", season: "winter" },
    ].freeze

    def generate(site)
      page = site.pages.find { |p| p.url == PAGE_URL }
      return unless page

      rows = MeetSheetsPageUtils.team_scores_rows(site, RAW_ROOT)
      high_schools = MeetSheetsPageUtils.high_school_names(site)

      page.data["groups"] = CATEGORIES.map do |category|
        { "heading" => category[:heading], "years" => years_for(rows, category, high_schools) }
      end
    end

    private

    def years_for(rows, category, high_schools)
      matching = rows.select { |row| row["gender"] == category[:gender] && row["Season"] == category[:season] }

      matching.group_by { |row| row["School Year"] }
              .sort_by { |school_year, _| school_year }
              .reverse
              .map do |school_year, year_rows|
        {
          "year" => MeetSheetsPageUtils.en_dash(school_year),
          "url" => "/sports/swimming-diving/meets/bsc/#{school_year}/#{category[:season]}/",
          "entries" => MeetSheetsPageUtils.score_rows(year_rows, high_schools).first(3),
        }
      end
    end
  end
end

# Generates one page per school year of dual meet results
# (sports/swimming-diving/dual-meets/results/YYYY-YYYY/) straight from the
# School Year column of dual-meet-results.csv, so adding a new season's rows
# to the CSV is enough on its own - no matching page to remember. This
# includes the current school year, alongside the hand-authored
# dual-meets/results/ page (which shows just the current year's own
# matrix/table inline, scoped to whichever School Year sorts last).
#
# Each page's meets are split into one head-to-head matrix + results table
# per Season/Sex combination that year (e.g. "Girls Fall"), since a school
# year could in principle carry more than one season/sex of dual meets.
#
# The dual-meets/results/ page picks these generated pages up automatically
# via directory-listing.html (see page_tree_generator.rb), newest-first
# thanks to its `default_sort: desc` front matter - so a year appears in the
# directory the moment its first CSV row does, no matching listing entry to
# remember.
module DualMeetResults
  class PageGenerator < Jekyll::Generator
    safe true

    DATA_PATH = %w[swimming-diving dual-meet-results].freeze
    DIR = "sports/swimming-diving/dual-meets/results".freeze

    SEASON_ORDER = { "fall" => 0, "winter" => 1 }.freeze
    SEASON_LABELS = { "fall" => "Fall", "winter" => "Winter" }.freeze
    SEX_ORDER = { "F" => 0, "M" => 1 }.freeze
    SEX_LABELS = { "F" => "Girls", "M" => "Boys" }.freeze

    def generate(site)
      entries = site.data.dig(*DATA_PATH) || []
      years = entries.map { |entry| entry["School Year"] }.compact.uniq.sort.reverse

      years.each do |year|
        site.pages << build_page(site, year, entries)
      end
    end

    private

    def build_page(site, year, entries)
      page = Jekyll::PageWithoutAFile.new(site, site.source, DIR, "#{year}.html")
      page.content = ""
      page.data.merge!(
        "layout" => "dual-meet-results",
        "title" => "#{en_dash(year)} Dual Meet Results",
        "permalink" => "/#{DIR}/#{year}/",
        "breadcrumb" => en_dash(year),
        "groups" => groups_for(entries, year)
      )
      page
    end

    def groups_for(entries, year)
      year_entries = entries.select { |entry| entry["School Year"] == year }

      keys = year_entries.map { |entry| [entry["Season"], entry["Sex"]] }.uniq
      keys.sort_by! { |season, sex| [SEASON_ORDER[season] || 99, SEX_ORDER[sex] || 99] }

      keys.map do |season, sex|
        rows = year_entries.select { |entry| entry["Season"] == season && entry["Sex"] == sex }

        {
          "heading" => "#{SEX_LABELS[sex] || sex} #{SEASON_LABELS[season] || season}",
          "entries" => rows,
        }
      end
    end

    def en_dash(year)
      year.sub("-", "–")
    end
  end
end

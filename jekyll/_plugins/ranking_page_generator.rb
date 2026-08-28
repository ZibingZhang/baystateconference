# Generates one page per school year for MIAA Sectional and State meet
# rankings (sports/swimming-diving/<sectionals|states>/rankings/YYYY-YYYY/)
# straight from the School Year column of
# _data/swimming-diving/miaa/rankings/<sectionals|states>.csv, so adding a
# new season's rows to a CSV is enough on its own - no matching page to
# remember. A year with no rows simply has no page yet; add its first entry
# and the page appears on the next build.
#
# Each page's rankings are split into one table per Season/Sex/Division
# combination that year (e.g. "Girls Fall - South"), sorted by Place, since
# schools are only ranked against the rest of their own division.
#
# Also exposes site.data["sectionals_ranking_years"] / ["states_ranking_years"]
# (newest first, en-dash titles) so the sectionals/states rankings index
# pages' directory listings stay in sync with the CSVs too.
module Rankings
  class PageGenerator < Jekyll::Generator
    safe true

    MEETS = {
      "sectionals" => "Sectional",
      "states" => "State",
    }.freeze

    DIR_BASE = "sports/swimming-diving".freeze

    SEASON_ORDER = { "fall" => 0, "winter" => 1 }.freeze
    SEASON_LABELS = { "fall" => "Fall", "winter" => "Winter" }.freeze
    SEX_ORDER = { "F" => 0, "M" => 1 }.freeze
    SEX_LABELS = { "F" => "Girls", "M" => "Boys" }.freeze

    def generate(site)
      MEETS.each_key { |meet| generate_meet(site, meet) }
    end

    private

    def generate_meet(site, meet)
      entries = site.data.dig("swimming-diving", "miaa", "rankings", meet) || []
      years = entries.map { |entry| entry["School Year"] }.compact.uniq.sort.reverse
      dir = "#{DIR_BASE}/#{meet}/rankings"

      site.data["#{meet}_ranking_years"] = years.map do |year|
        { "title" => en_dash(year), "url" => "/#{dir}/#{year}/" }
      end

      years.each do |year|
        site.pages << build_page(site, dir, meet, year, entries)
      end
    end

    def build_page(site, dir, meet, year, entries)
      page = Jekyll::PageWithoutAFile.new(site, site.source, dir, "#{year}.html")
      page.content = ""
      page.data.merge!(
        "layout" => "ranking",
        "title" => "#{en_dash(year)} #{MEETS[meet]} Rankings",
        "permalink" => "/#{dir}/#{year}/",
        "breadcrumb" => year,
        "groups" => groups_for(entries, year)
      )
      page
    end

    def groups_for(entries, year)
      year_entries = entries.select { |entry| entry["School Year"] == year }

      keys = year_entries.map { |entry| [entry["Season"], entry["Sex"], entry["Division"]] }.uniq
      keys.sort_by! { |season, sex, division| [SEASON_ORDER[season] || 99, SEX_ORDER[sex] || 99, division.to_s] }

      keys.map do |season, sex, division|
        rows = year_entries.select do |entry|
          entry["Season"] == season && entry["Sex"] == sex && entry["Division"] == division
        end
        rows.sort_by! { |entry| entry["Place"].to_f }

        {
          "heading" => "#{SEX_LABELS[sex] || sex} #{SEASON_LABELS[season] || season} — #{division}",
          "entries" => rows,
        }
      end
    end

    def en_dash(year)
      year.sub("-", "–")
    end
  end
end

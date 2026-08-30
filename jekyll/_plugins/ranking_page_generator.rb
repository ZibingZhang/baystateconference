# Generates one page per school year for MIAA Sectional/State meet and Bay
# State Conference meet rankings
# (sports/swimming-diving/<sectionals|states|bsc>/rankings/YYYY-YYYY/)
# straight from the School Year column of each source's rankings CSV, so
# adding a new season's rows to a CSV is enough on its own - no matching page
# to remember. A year with no rows simply has no page yet; add its first
# entry and the page appears on the next build.
#
# Each page's rankings are split into one table per Season/Sex/Division
# combination that year (e.g. "Girls Fall - South"), sorted by Place, since
# schools are only ranked against the rest of their own division. The BSC
# meet has no Division column, so its pages get one table per Season/Sex
# instead (e.g. "Girls Fall").
#
# The rankings index pages pick these generated pages up automatically via
# directory-listing.html (see page_tree_generator.rb), newest-first thanks to
# their `default_sort: desc` front matter - so a year appears in the index
# the moment its first CSV row does, no matching listing entry to remember.
module Rankings
  class PageGenerator < Jekyll::Generator
    safe true

    SOURCES = [
      {
        data_path: %w[swimming-diving miaa rankings sectionals],
        dir: "sports/swimming-diving/sectionals/rankings",
        title_suffix: "Sectional Rankings",
      },
      {
        data_path: %w[swimming-diving miaa rankings states],
        dir: "sports/swimming-diving/states/rankings",
        title_suffix: "State Rankings",
      },
      {
        data_path: %w[swimming-diving bsc rankings],
        dir: "sports/swimming-diving/bsc/rankings",
        title_suffix: "Bay State Conference Rankings",
      },
    ].freeze

    SEASON_ORDER = { "fall" => 0, "winter" => 1 }.freeze
    SEASON_LABELS = { "fall" => "Fall", "winter" => "Winter" }.freeze
    SEX_ORDER = { "F" => 0, "M" => 1 }.freeze
    SEX_LABELS = { "F" => "Girls", "M" => "Boys" }.freeze

    def generate(site)
      SOURCES.each { |source| generate_source(site, source) }
    end

    private

    def generate_source(site, source)
      entries = site.data.dig(*source[:data_path]) || []
      years = entries.map { |entry| entry["School Year"] }.compact.uniq.sort.reverse

      years.each do |year|
        site.pages << build_page(site, source, year, entries)
      end
    end

    def build_page(site, source, year, entries)
      dir = source[:dir]
      page = Jekyll::PageWithoutAFile.new(site, site.source, dir, "#{year}.html")
      page.content = ""
      page.data.merge!(
        "layout" => "ranking",
        "title" => "#{en_dash(year)} #{source[:title_suffix]}",
        "permalink" => "/#{dir}/#{year}/",
        "breadcrumb" => en_dash(year),
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

        heading = "#{SEX_LABELS[sex] || sex} #{SEASON_LABELS[season] || season}"
        heading += " — #{division}" unless division.to_s.empty?

        {
          "heading" => heading,
          "entries" => rows,
        }
      end
    end

    def en_dash(year)
      year.sub("-", "–")
    end
  end
end

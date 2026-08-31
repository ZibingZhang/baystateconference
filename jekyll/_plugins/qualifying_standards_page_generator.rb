# Generates one page per School Year found in
# _data/swimming-diving/miaa/qualifying-standards.csv
# (sports/swimming-diving/resources/miaa-qualifying-standards/YYYY-YYYY/), so
# adding a new season's standards to the CSV is enough on its own - no
# matching page to remember. A School Year with no rows simply has no page
# yet; add its first entry and the page appears on the next build.
#
# Also injects the latest School Year's own `groups` (see below) into the
# hand-authored index page at sports/swimming-diving/resources/
# miaa-qualifying-standards/index.md, so that page can render the current
# season's tables inline via the same {% include qualifying-standards-table.html %}
# loop the generated per-year pages use, above its own directory listing of
# every year.
#
# Each page has one table per Season/Sex pair (Fall Girls, Fall Boys, Winter
# Girls, Winter Boys), headed "<Season> — <Sex>", each with one row per Event
# (in a fixed swim-meet running order) and one column per Division present
# for that sex that season - in DIVISION_ORDER below - so a season can bring
# its own set of divisions (e.g. fall's North/South/State vs. winter's North
# Sectional/South Sectional/Central-West Sectional/Division I State/Division
# II State) without any plugin changes. Event and Division names are
# shortened for display via _data/swimming-diving/event-abbreviations.yaml
# and _data/swimming-diving/division-abbreviations.yaml.
module QualifyingStandards
  class PageGenerator < Jekyll::Generator
    safe true

    DATA_PATH = %w[swimming-diving miaa qualifying-standards].freeze
    EVENT_ABBREVIATIONS_PATH = %w[swimming-diving event-abbreviations].freeze
    DIVISION_ABBREVIATIONS_PATH = %w[swimming-diving division-abbreviations].freeze
    DIR = "sports/swimming-diving/resources/miaa-qualifying-standards".freeze

    SEASON_YEAR_INDEX = { "fall" => 0, "winter" => 1 }.freeze
    SEASON_LABELS = { "fall" => "Fall", "winter" => "Winter" }.freeze

    SEX_ORDER = { "F" => 0, "M" => 1 }.freeze
    SEX_LABELS = { "F" => "Girls", "M" => "Boys" }.freeze
    DIVISION_ORDER = [
      "North Sectional",
      "Central/South Sectional",
      "South Sectional",
      "West Sectional",
      "Western Mass Sectional",
      "Central/West Sectional",
      "Division I State",
      "Division II State",
      "State",
    ].freeze

    EVENT_ORDER = [
      "200 Medley Relay",
      "200 Freestyle",
      "200 Individual Medley",
      "50 Freestyle",
      "Diving",
      "100 Butterfly",
      "100 Freestyle",
      "500 Freestyle",
      "200 Freestyle Relay",
      "100 Backstroke",
      "100 Breaststroke",
      "400 Freestyle Relay",
    ].freeze

    def generate(site)
      entries = site.data.dig(*DATA_PATH) || []
      event_abbreviations = site.data.dig(*EVENT_ABBREVIATIONS_PATH) || {}
      division_abbreviations = site.data.dig(*DIVISION_ABBREVIATIONS_PATH) || {}

      school_years = entries.map { |entry| entry["School Year"] }.uniq
      school_years.sort!
      school_years.reverse!

      school_years.each_with_index do |school_year, index|
        previous_year = school_years[index + 1]
        next_year = index.zero? ? nil : school_years[index - 1]
        site.pages << build_page(
          site, entries, event_abbreviations, division_abbreviations, school_year, previous_year, next_year
        )
      end

      current_year = school_years.first
      index_page = site.pages.find { |page| page.url == "/#{DIR}/" }
      return unless index_page && current_year

      index_page.data["current_school_year"] = current_year
      index_page.data["groups"] = groups_for(entries, event_abbreviations, division_abbreviations, current_year)
    end

    private

    def build_page(site, entries, event_abbreviations, division_abbreviations, school_year, previous_year, next_year)
      page = Jekyll::PageWithoutAFile.new(site, site.source, DIR, "#{school_year}.html")
      page.content = ""
      page.data.merge!(
        "layout" => "qualifying-standards",
        "title" => "#{school_year} Qualifying Standards",
        "permalink" => "/#{DIR}/#{school_year}/",
        "breadcrumb" => school_year,
        "groups" => groups_for(entries, event_abbreviations, division_abbreviations, school_year),
        "previous_url" => previous_year && "/#{DIR}/#{previous_year}/",
        "previous_title" => previous_year,
        "next_url" => next_year && "/#{DIR}/#{next_year}/",
        "next_title" => next_year
      )
      page
    end

    def groups_for(entries, event_abbreviations, division_abbreviations, school_year)
      rows = entries.select { |entry| entry["School Year"] == school_year }

      seasons = rows.map { |entry| entry["Season"] }.uniq
      seasons.sort_by! { |season| SEASON_YEAR_INDEX[season] || 0 }

      seasons.flat_map do |season|
        season_rows = rows.select { |entry| entry["Season"] == season }
        season_label = SEASON_LABELS[season] || season

        sexes = season_rows.map { |entry| entry["Sex"] }.uniq
        sexes.sort_by! { |sex| SEX_ORDER[sex] || 99 }

        sexes.map do |sex|
          sex_rows = season_rows.select { |entry| entry["Sex"] == sex }

          divisions = sex_rows.map { |entry| entry["Division"] }.uniq
          divisions.sort_by! { |division| [DIVISION_ORDER.index(division) || DIVISION_ORDER.size, division] }

          events = sex_rows.map { |entry| entry["Event"] }.uniq
          events.sort_by! { |event| [EVENT_ORDER.index(event) || EVENT_ORDER.size, event] }

          {
            "heading" => "#{season_label} — #{SEX_LABELS[sex] || sex}",
            "columns" => divisions.map { |division| division_abbreviations[division] || division },
            "rows" => events.map do |event|
              {
                "event" => event_abbreviations[event] || event,
                "values" => divisions.map do |division|
                  match = sex_rows.find { |entry| entry["Division"] == division && entry["Event"] == event }
                  match && match["Qualifying Standard"]
                end,
              }
            end,
          }
        end
      end
    end
  end
end

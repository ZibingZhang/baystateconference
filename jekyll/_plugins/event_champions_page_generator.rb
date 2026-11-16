# Generates the Bay State Conference "Event Champions" pages - one page per
# event (sports/swimming-diving/meets/conference/champions/<event-slug>/)
# showing every year's Fall Girls / Fall Boys / Winter Boys champion for that
# event, plus the index page's directory of all 12.
#
# There are only 12 distinct events even though individual_results.csv/
# relay_results.csv's event_num column goes up to 24 (see meet_sheets_page_
# utils.rb's FIELD_MAPS) - 1-24 numbers a girls' meet and a boys' meet as two
# separate 12-event programs for the modern era (2012-2013 fall onward, and
# every exhibition-era page before that collapses down to a shared 1-12
# scheme - see scripts/bsc/event-champions/ and the CSVs those were turned
# into). Event Name is the one column that's always the plain canonical
# string regardless of which numbering era a row comes from, so that - not
# event_num - is what groups rows into one event here.
#
# Sourced straight from every year/season's individual_results.csv/
# relay_results.csv/diving_results.csv under _data/swimming-diving/bsc via
# MeetSheetsPageUtils.normalized_rows (the same helper meet_sheets_page_
# generator.rb uses), filtered down to just the Place == "1" (or, for a
# co-ed year's event with both a girls' and a boys' entry but only one real
# winner, whichever one actually has "1" - see the build script that wrote
# those two years' CSVs) row per event/season/gender. A newly added season's
# results.csv therefore gets its champion picked up here automatically, no
# page to remember to update.
require_relative "meet_sheets_page_utils"

module Awards
  class EventChampionsPageGenerator < Jekyll::Generator
    safe true

    RAW_ROOT = %w[swimming-diving bsc].freeze
    DIR = "sports/swimming-diving/meets/conference/champions".freeze

    # Traditional BSC meet order.
    EVENTS = [
      "200 Yard Medley Relay",
      "200 Yard Freestyle",
      "200 Yard IM",
      "50 Yard Freestyle",
      "1 Meter Diving",
      "100 Yard Butterfly",
      "100 Yard Freestyle",
      "500 Yard Freestyle",
      "200 Yard Freestyle Relay",
      "100 Yard Backstroke",
      "100 Yard Breaststroke",
      "400 Yard Freestyle Relay",
    ].freeze

    def generate(site)
      individual = MeetSheetsPageUtils.normalized_rows(site, RAW_ROOT, :individual, "individual_results", multi_meet: false)
      relay = MeetSheetsPageUtils.normalized_rows(site, RAW_ROOT, :relay, "relay_results", multi_meet: false)
      diving = MeetSheetsPageUtils.normalized_rows(site, RAW_ROOT, :diving, "diving_results", multi_meet: false)
      high_schools = MeetSheetsPageUtils.high_school_names(site)

      champions = []
      (individual + diving).each do |row|
        next unless row["Place"].to_s == "1"

        champions << champion_row(row, name_for(row["First Name"], row["Last Name"]),
                                   high_schools[row["School"]] || row["School"],
                                   row["Finals Time"] || row["Finals Score"])
      end
      relay.each do |row|
        next unless row["Place"].to_s == "1"

        champions << champion_row(row, relay_name_for(row), high_schools[row["Team"]] || row["Team"], row["Finals Time"])
      end

      site.data["event_champions"] = champions
      site.data["event_champion_links"] = EVENTS.map { |name| { "title" => name, "url" => "/#{DIR}/#{slug(name)}/" } }

      EVENTS.each { |name| site.pages << build_page(site, name) }
    end

    private

    def build_page(site, name)
      page = Jekyll::PageWithoutAFile.new(site, site.source, DIR, "#{slug(name)}.html")
      page.content = ""
      page.data.merge!(
        "layout" => "bsc-event-champions",
        "title" => "#{name} Bay State Conference Champions",
        "permalink" => "/#{DIR}/#{slug(name)}/",
        "breadcrumb" => name,
        "event_name" => name
      )
      page
    end

    def champion_row(row, name, school, time)
      {
        "Event Name" => row["Event Name"],
        "School Year" => row["School Year"],
        "Season" => row["Season"],
        "Gender" => row["Gender"],
        "Name" => name,
        "School" => school,
        "Time" => time,
      }
    end

    # A single-letter First Name means only an initial survives in the
    # source data (see scripts/bsc/event-champions/ and the "Initial as
    # first_name" convention that build script's relay rows use) - render
    # it "K. Whitman" rather than the bare "K Whitman".
    def name_for(first, last)
      return last.to_s if first.to_s.empty?
      first.length == 1 ? "#{first}. #{last}" : "#{first} #{last}"
    end

    def relay_name_for(row)
      (1..4).filter_map do |i|
        last = row["Last Name #{i}"]
        next if last.to_s.empty?
        name_for(row["First Name #{i}"], last)
      end.join(", ")
    end

    def slug(name)
      name.downcase.gsub(/[^a-z0-9]+/, "-").gsub(/\A-+|-+\z/, "")
    end
  end
end

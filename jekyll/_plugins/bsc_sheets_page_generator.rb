# Generates the BSC meet's Results/Psych Sheet/Heat Sheet pages from the raw
# per-meet CSVs under jekyll/_data/swimming-diving/bsc/<year>/<season>/<meet>/
# {individual,relay,diving}_results.csv (loaded automatically by Jekyll's
# _data mechanism). FIELD_MAPS/normalized_rows rename each raw snake_case
# column to the Title Case key assets/js/bsc-sheet-tex.js expects.
#
# All three sheet kinds are just different sorts/groupings of the same rows:
# Results sorts by Place; Psych Sheet sorts by Seed Time (Seed Score
# descending for diving); Heat Sheet groups by Heat/Flight then sorts by
# Lane. Each sheet page uses the bsc-sheet layout, which hands its `events`
# data to assets/js/bsc-sheet-tex.js to build the PDF client-side.
#
# <year> and <season> each get their own thin generated page (build_year_page/
# build_season_page) purely so page_tree_generator.rb's breadcrumbs have a
# real page to read a label off of at every segment. Seasons are enumerated
# from whatever data actually exists, not a hardcoded list. The season page
# doubles as the meet hub: team scores (from team_scores.csv) plus the three
# sheet links, Heat Sheet first since that's the one people want fastest.
#
# Also generates /sports/swimming-diving/bsc/latest/, a permanent link that
# always redirects to the most recent year/season with any data - same
# redirect_to pattern as schedule_page_generator.rb's current-season page -
# so the BSC hub page can offer a one-click path to the latest meet instead
# of making every visitor drill through year -> season.

module BscSheets
  class PageGenerator < Jekyll::Generator
    safe true

    RAW_ROOT = %w[swimming-diving bsc].freeze
    # bsc/ also holds non-year data (awards/, rankings.csv) - only descend
    # into keys shaped like a school year.
    SCHOOL_YEAR_PATTERN = /\A\d{4}-\d{4}\z/

    SEASON_LABELS = { "fall" => "Fall", "winter" => "Winter" }.freeze
    SEASON_ORDER = { "fall" => 0, "winter" => 1 }.freeze

    FIELD_MAPS = {
      individual: [
        %w[event_num Event\ Num], %w[event_name Event\ Name], %w[gender Sex],
        %w[heat Heat], %w[lane Lane], %w[place Place], %w[points Points],
        %w[first_name First\ Name], %w[last_name Last\ Name], %w[year Year],
        %w[school School], %w[seed_time Seed\ Time], %w[finals_time Finals\ Time],
        %w[disqualified Disqualified], %w[exhibition Exhibition], %w[qualifier Qualifier],
      ],
      relay: [
        %w[event_num Event\ Num], %w[event_name Event\ Name], %w[gender Sex],
        %w[heat Heat], %w[lane Lane], %w[place Place], %w[points Points],
        %w[team Team], %w[relay Relay],
        %w[first_name_1 First\ Name\ 1], %w[last_name_1 Last\ Name\ 1], %w[year_1 Year\ 1],
        %w[first_name_2 First\ Name\ 2], %w[last_name_2 Last\ Name\ 2], %w[year_2 Year\ 2],
        %w[first_name_3 First\ Name\ 3], %w[last_name_3 Last\ Name\ 3], %w[year_3 Year\ 3],
        %w[first_name_4 First\ Name\ 4], %w[last_name_4 Last\ Name\ 4], %w[year_4 Year\ 4],
        %w[seed_time Seed\ Time], %w[finals_time Finals\ Time],
        %w[disqualified Disqualified], %w[exhibition Exhibition], %w[qualifier Qualifier],
      ],
      diving: [
        %w[event_num Event\ Num], %w[event_name Event\ Name], %w[gender Sex],
        %w[heat Heat], %w[lane Lane], %w[place Place], %w[points Points],
        %w[first_name First\ Name], %w[last_name Last\ Name], %w[year Year],
        %w[school School], %w[seed_score Seed\ Score], %w[finals_score Finals\ Score],
        %w[disqualified Disqualified], %w[qualifier Qualifier],
      ],
    }.freeze

    # Heat Sheet first - that's the one people want fastest access to.
    SHEETS = [
      { slug: "heat-sheet", title: "Heat Sheet" },
      { slug: "psych-sheet", title: "Psych Sheet" },
      { slug: "results", title: "Results" },
    ].freeze

    SEX_LABELS = { "F" => "Girls", "M" => "Boys" }.freeze

    SEASON_PAGE_CONTENT = <<~LIQUID
      {% include rankings-table.html heading="Girls Team Scores" entries=page.girls_team_scores %}
      {% include rankings-table.html heading="Boys Team Scores" entries=page.boys_team_scores %}
      {% include link-list.html heading="Meet Documents" items=page.sheet_links open_in_new_tab=true %}
      {% include link-list.html heading="Archive" items=page.archive_links %}
    LIQUID

    def generate(site)
      individual = normalized_rows(site, :individual, "individual_results")
      relay = normalized_rows(site, :relay, "relay_results")
      diving = normalized_rows(site, :diving, "diving_results")

      year_seasons = (individual + relay + diving).map { |r| [r["School Year"], r["Season"]] }.uniq
      years = year_seasons.map(&:first).uniq.sort.reverse

      site.pages << build_latest_meet_redirect(site, years, year_seasons) if years.any?

      years.each do |year|
        seasons = year_seasons.select { |y, _| y == year }.map(&:last).sort_by { |s| SEASON_ORDER[s] || 99 }
        site.pages << build_year_page(site, year)

        seasons.each do |season|
          site.pages << build_season_page(site, year, season)

          grouped = group_by_event(
            individual.select { |r| r["School Year"] == year && r["Season"] == season },
            relay.select { |r| r["School Year"] == year && r["Season"] == season },
            diving.select { |r| r["School Year"] == year && r["Season"] == season }
          )

          SHEETS.each { |sheet| site.pages << build_sheet_page(site, sheet, year, season, grouped) }
        end
      end
    end

    private

    def normalized_rows(site, kind, filename)
      field_map = FIELD_MAPS.fetch(kind)
      rows = []
      (site.data.dig(*RAW_ROOT) || {}).each do |school_year, seasons|
        next unless school_year.match?(SCHOOL_YEAR_PATTERN)

        seasons.each do |season, meets|
          meets.each_value do |files|
            (files[filename] || []).each do |raw_row|
              rows << field_map.each_with_object({ "School Year" => school_year, "Season" => season }) do |(src, dst), row|
                row[dst] = raw_row[src]
              end
            end
          end
        end
      end
      rows
    end

    def build_latest_meet_redirect(site, years, year_seasons)
      latest_year = years.first
      latest_season = year_seasons.select { |y, _| y == latest_year }
                                   .map(&:last)
                                   .max_by { |s| SEASON_ORDER[s] || 99 }

      dir = "sports/swimming-diving/bsc"
      page = Jekyll::PageWithoutAFile.new(site, site.source, dir, "latest.html")
      page.content = ""
      page.data.merge!(
        "layout" => "page",
        "title" => "Latest Bay State Conference Meet",
        "permalink" => "/#{dir}/latest/",
        "redirect_to" => "/#{dir}/#{latest_year}/#{latest_season}/",
        "exclude_from_directory" => true
      )
      page
    end

    def build_year_page(site, year)
      dir = "sports/swimming-diving/bsc/#{year}"
      page = Jekyll::PageWithoutAFile.new(site, site.source, dir, "index.html")
      page.content = "{% include directory-listing.html %}"
      page.data.merge!(
        "layout" => "page",
        "title" => "#{en_dash(year)} Bay State Conference Meet",
        "permalink" => "/#{dir}/",
        "breadcrumb" => en_dash(year)
      )
      page
    end

    def build_season_page(site, year, season)
      dir = "sports/swimming-diving/bsc/#{year}/#{season}"
      team_scores = team_scores_for(site, year, season)
      page = Jekyll::PageWithoutAFile.new(site, site.source, dir, "index.html")
      page.content = SEASON_PAGE_CONTENT
      page.data.merge!(
        "layout" => "page",
        "title" => "#{SEASON_LABELS[season] || season} #{en_dash(year)} Bay State Conference Meet",
        "permalink" => "/#{dir}/",
        "breadcrumb" => SEASON_LABELS[season] || season,
        "girls_team_scores" => scores_for_gender(team_scores, "F"),
        "boys_team_scores" => scores_for_gender(team_scores, "M"),
        "sheet_links" => SHEETS.map { |sheet| { "title" => sheet[:title], "url" => "/#{dir}/#{sheet[:slug]}/" } },
        "archive_links" => [
          {
            "title" => "Full Meet Archive",
            "url" => "/sports/swimming-diving/archive/?path=meet-results/by-meet-and-year/bay-state-conference/#{year}-#{season}"
          }
        ]
      )
      page
    end

    def team_scores_for(site, year, season)
      rows = []
      (site.data.dig(*RAW_ROOT, year, season) || {}).each_value do |files|
        rows.concat(files["team_scores"] || [])
      end
      rows
    end

    def scores_for_gender(team_scores, gender)
      team_scores.select { |row| row["gender"] == gender }
                 .sort_by { |row| row["rank"].to_i }
                 .map { |row| { "Place" => row["rank"], "School" => row["school_name"], "Score" => row["score"] } }
    end

    def build_sheet_page(site, sheet, year, season, grouped)
      dir = "sports/swimming-diving/bsc/#{year}/#{season}"
      page = Jekyll::PageWithoutAFile.new(site, site.source, dir, "#{sheet[:slug]}.html")
      page.content = ""
      page.data.merge!(
        "layout" => "bsc-sheet",
        "title" => "#{SEASON_LABELS[season] || season} #{en_dash(year)} Bay State Conference #{sheet[:title]}",
        "permalink" => "/#{dir}/#{sheet[:slug]}/",
        "breadcrumb" => sheet[:title],
        "sheet_kind" => sheet[:slug],
        "events" => events_for(sheet[:slug], grouped)
      )
      page
    end

    def group_by_event(individual, relay, diving)
      tagged = individual.map { |r| [r, "individual"] } +
               relay.map { |r| [r, "relay"] } +
               diving.map { |r| [r, "diving"] }

      by_event = {}
      tagged.each do |row, kind|
        key = row["Event Num"]
        by_event[key] ||= {
          "event_num" => key,
          "event_name" => row["Event Name"],
          "sex_label" => SEX_LABELS[row["Sex"]] || row["Sex"],
          "kind" => kind,
          "rows" => [],
        }
        by_event[key]["rows"] << row
      end

      by_event.values.sort_by { |event| event["event_num"].to_i }
    end

    def events_for(sheet_kind, grouped_events)
      grouped_events.map do |event|
        entries = sheet_kind == "heat-sheet" ? heats_for(event["rows"]) : sorted_rows(sheet_kind, event["kind"], event["rows"])
        event.slice("event_num", "event_name", "sex_label", "kind").merge("entries" => entries)
      end
    end

    def sorted_rows(sheet_kind, kind, rows)
      if sheet_kind == "psych-sheet"
        rows.sort_by { |row| seed_sort_key(kind, row) }
      else
        rows.sort_by { |row| place_sort_key(row) }
      end
    end

    def heats_for(rows)
      by_heat = rows.group_by { |row| row["Heat"] }.reject { |heat, _| heat.to_s.empty? }
      by_heat.keys.sort_by(&:to_i).map do |heat|
        { "heat" => heat, "entries" => by_heat[heat].sort_by { |row| row["Lane"].to_i } }
      end
    end

    def place_sort_key(row)
      row["Place"].to_s.empty? ? Float::INFINITY : row["Place"].to_f
    end

    def seed_sort_key(kind, row)
      value = kind == "diving" ? row["Seed Score"] : row["Seed Time"]
      return Float::INFINITY if value.to_s.empty? || value == "NT"
      kind == "diving" ? -value.to_f : time_to_seconds(value)
    end

    def time_to_seconds(value)
      value.split(":").map(&:to_f).inject(0) { |acc, part| (acc * 60) + part }
    end

    def en_dash(year)
      year.sub("-", "–")
    end
  end
end

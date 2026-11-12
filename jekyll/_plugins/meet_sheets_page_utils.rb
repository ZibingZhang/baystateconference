# Shared helpers for generating a Results/Psych Sheet/Heat Sheet set of pages
# from the raw per-meet CSVs under jekyll/_data/swimming-diving/<root>/
# <year>/<season>/[<meet>/]{individual,relay,diving}_results.csv +
# team_scores.csv (see scripts/extract_swim_meet.py for how those CSVs get
# built from a meet's official Results/Psych Sheet PDFs).
#
# Used by meet_sheets_page_generator.rb for all three sources it drives (Bay
# State Conference, MIAA Sectionals, MIAA States). Kept as a plain module (not
# a Jekyll::Generator itself) specifically so it isn't picked up and auto-run
# by Jekyll's generator discovery - only that one Generator class calls into
# it.
#
# A sheet is only generated when its CSVs actually have the column(s) it
# needs: Heat Sheet needs a non-blank Heat on at least one row (grouping by a
# universally-blank Heat would produce an empty page - true of any meet whose
# only companion document was a Psych Sheet rather than an actual Heat Sheet,
# since a Psych Sheet ranks by seed time with no lane/heat assigned yet);
# Psych Sheet needs a non-blank Seed Time/Seed Score on at least one row.
# Results has no such requirement - a meet always has finishers.
module MeetSheetsPageUtils
  SCHOOL_YEAR_PATTERN = /\A\d{4}-\d{4}\z/

  SEASON_LABELS = { "fall" => "Fall", "winter" => "Winter" }.freeze
  SEASON_ORDER = { "fall" => 0, "winter" => 1 }.freeze

  GENDER_LABELS = { "F" => "Girls", "M" => "Boys" }.freeze

  FIELD_MAPS = {
    individual: [
      %w[event_num Event\ Num], %w[event_name Event\ Name], %w[gender Gender],
      %w[heat Heat], %w[lane Lane], %w[place Place], %w[points Points],
      %w[first_name First\ Name], %w[last_name Last\ Name], %w[year Year],
      %w[school School], %w[seed_time Seed\ Time], %w[finals_time Finals\ Time],
      %w[status Status], %w[exhibition Exhibition], %w[qualifier Qualifier],
    ],
    relay: [
      %w[event_num Event\ Num], %w[event_name Event\ Name], %w[gender Gender],
      %w[heat Heat], %w[lane Lane], %w[place Place], %w[points Points],
      %w[team Team], %w[relay Relay],
      %w[first_name_1 First\ Name\ 1], %w[last_name_1 Last\ Name\ 1], %w[year_1 Year\ 1],
      %w[first_name_2 First\ Name\ 2], %w[last_name_2 Last\ Name\ 2], %w[year_2 Year\ 2],
      %w[first_name_3 First\ Name\ 3], %w[last_name_3 Last\ Name\ 3], %w[year_3 Year\ 3],
      %w[first_name_4 First\ Name\ 4], %w[last_name_4 Last\ Name\ 4], %w[year_4 Year\ 4],
      %w[seed_time Seed\ Time], %w[finals_time Finals\ Time],
      %w[status Status], %w[exhibition Exhibition], %w[qualifier Qualifier],
    ],
    diving: [
      %w[event_num Event\ Num], %w[event_name Event\ Name], %w[gender Gender],
      %w[heat Heat], %w[lane Lane], %w[place Place], %w[points Points],
      %w[first_name First\ Name], %w[last_name Last\ Name], %w[year Year],
      %w[school School], %w[seed_score Seed\ Score], %w[finals_score Finals\ Score],
      %w[status Status], %w[qualifier Qualifier],
    ],
  }.freeze

  # Heat Sheet first - that's the one people want fastest access to (matches
  # bsc_sheets_page_generator.rb's SHEETS ordering).
  SHEET_DEFS = [
    { slug: "heat-sheet", title: "Heat Sheet", available: ->(rows) { rows.any? { |r| !r["Heat"].to_s.strip.empty? } } },
    { slug: "psych-sheet", title: "Psych Sheet",
      available: ->(rows) { rows.any? { |r| !r["Seed Time"].to_s.strip.empty? || !r["Seed Score"].to_s.strip.empty? } } },
    { slug: "results", title: "Results", available: ->(_rows) { true } },
  ].freeze

  module_function

  # Reads every {individual,relay,diving}_results.csv under site.data.dig(*raw_root),
  # tagging each row with "School Year"/"Season" (and "Meet", when multi_meet
  # is true - a sectional-style raw_root nests one more level, keyed by meet
  # slug, before the CSV filenames).
  def normalized_rows(site, raw_root, kind, filename, multi_meet:)
    field_map = FIELD_MAPS.fetch(kind)
    rows = []
    (site.data.dig(*raw_root) || {}).each do |school_year, seasons|
      next unless school_year.match?(SCHOOL_YEAR_PATTERN)

      seasons.each do |season, meets_or_files|
        if multi_meet
          meets_or_files.each do |meet, files|
            append_rows!(rows, field_map, files[filename], "School Year" => school_year, "Season" => season, "Meet" => meet)
          end
        else
          append_rows!(rows, field_map, meets_or_files[filename], "School Year" => school_year, "Season" => season)
        end
      end
    end
    rows
  end

  def append_rows!(rows, field_map, raw_rows, tags)
    (raw_rows || []).each do |raw_row|
      rows << field_map.each_with_object(tags.dup) { |(src, dst), row| row[dst] = raw_row[src] }
    end
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
        "gender_label" => GENDER_LABELS[row["Gender"]] || row["Gender"],
        "kind" => kind,
        "rows" => [],
      }
      by_event[key]["rows"] << row
    end

    by_event.values.sort_by { |event| event["event_num"].to_i }
  end

  def events_for(sheet_slug, grouped_events)
    grouped_events.map do |event|
      entries = sheet_slug == "heat-sheet" ? heats_for(event["rows"]) : sorted_rows(sheet_slug, event["kind"], event["rows"])
      event.slice("event_num", "event_name", "gender_label", "kind").merge("entries" => entries)
    end
  end

  def sorted_rows(sheet_slug, kind, rows)
    if sheet_slug == "psych-sheet"
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

  # One {heading, entries} group per Gender, or per Gender/Division when a
  # "division" column is present - MIAA States team_scores.csv has one for
  # some years (two divisions scored separately within the same meet) and not
  # others (combined scoring), so this branches on whether any row actually
  # has one rather than assuming either shape. "school_name"/"school" covers
  # both the current schema (scripts/extract_swim_meet.py's output) and the
  # older schema some historical States team_scores.csv files predate it use.
  def team_score_groups(team_scores)
    has_division = team_scores.any? { |row| !row["division"].to_s.strip.empty? }

    GENDER_LABELS.filter_map do |code, gender_label|
      gender_rows = team_scores.select { |row| row["gender"] == code }
      next if gender_rows.empty?

      if has_division
        divisions = gender_rows.map { |row| row["division"] }.uniq.sort
        divisions.map do |division|
          rows = gender_rows.select { |row| row["division"] == division }
          { "heading" => "#{gender_label} #{division} Team Scores", "entries" => score_rows(rows) }
        end
      else
        { "heading" => "#{gender_label} Team Scores", "entries" => score_rows(gender_rows) }
      end
    end.flatten
  end

  def score_rows(rows)
    rows.sort_by { |row| row["rank"].to_i }
        .map { |row| { "Place" => row["rank"], "School" => row["school_name"] || row["school"], "Score" => row["score"] } }
  end

  # Only the sheets whose required column(s) actually have data in this
  # meet's rows - e.g. a meet whose seed times came from a Psych Sheet merge
  # (no heat/lane) gets a Psych Sheet link but no Heat Sheet link.
  def available_sheets(rows)
    SHEET_DEFS.select { |sheet| sheet[:available].call(rows) }
  end

  def en_dash(year)
    year.sub("-", "–")
  end

  # Sets "latest_meet_url" on the hand-authored hub page at /<dir>/ (e.g.
  # sports/swimming-diving/sectionals/index.md) to the /<dir>/latest/
  # redirect's URL once any per-swimmer data exists, so that page can show a
  # "Latest Meet" link (mirroring bsc_sheets_page_generator.rb's /bsc/latest/
  # icon-link) instead of its placeholder text before any data exists -
  # see qualifying_standards_page_generator.rb for the same
  # site.pages.find-and-merge pattern into a static page.
  def inject_latest_meet_url(site, dir, available)
    index_page = site.pages.find { |page| page.url == "/#{dir}/" }
    return unless index_page

    index_page.data["latest_meet_url"] = available ? "/#{dir}/latest/" : nil
  end
end

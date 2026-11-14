# Shared helpers for the three generators that build the Bay State Conference
# game schedule UI from _data/schedule/games.csv: schedule_page_generator.rb
# (per-sport/year pages), school_schedule_page_generator.rb (per-school/year
# pages), and todays_games_generator.rb (today's-games homepage/schedules-index
# widgets). Kept as a plain module (not a Jekyll::Generator itself) specifically
# so it isn't picked up and auto-run by Jekyll's generator discovery - only
# those three Generator classes call into it.
require "date"

module SchedulePageUtils
  GENDER_ORDER = { "Girls" => 0, "Boys" => 1, "Coed" => 2 }.freeze

  module_function

  # Distinct Bay State Conference schools (not every opponent - a school not
  # in _data/schools.yaml, e.g. a non-conference or tournament "opponent",
  # never becomes a filter option) appearing in games, for the "filter by
  # school" control - only rendered at all (see schedule-filter.html) when
  # there's more than one.
  def schools_for(games, bsc_school_names)
    teams = (games.map { |g| g["team_1"] } + games.map { |g| g["team_2"] }).uniq
    (teams & bsc_school_names).sort
  end

  # Distinct levels (Varsity/Sub-Varsity/...) across games, Varsity first then
  # alphabetical - for the "filter by level" control, only rendered at all
  # (see schedule-filter.html) when there's more than one.
  def levels_for(games)
    games.map { |g| g["level"] }.uniq.sort_by { |level| [level == "Varsity" ? 0 : 1, level.to_s] }
  end

  # The "school" filter attribute schedule-filter.html/schedule-filter.js use
  # to show/hide rows - both team names, since either could be the one a
  # visitor picks.
  def school_filter_for(game)
    [game["team_1"], game["team_2"]].compact.join("|")
  end

  # 24-hour time strings (and "TBA", forced last via "99:99") already sort
  # correctly as strings.
  def time_sort_key(time_of_day)
    time_of_day == "TBA" ? "99:99" : (time_of_day || "99:99")
  end

  def format_date(date)
    return nil if date.nil? || date.empty?

    Date.strptime(date, "%Y-%m-%d").strftime("%b %-d, %Y")
  rescue ArgumentError
    date
  end

  def format_time(time_of_day)
    return nil if time_of_day.nil? || time_of_day.empty?
    return time_of_day if time_of_day == "TBA"

    DateTime.strptime(time_of_day, "%H:%M").strftime("%-I:%M %p")
  rescue ArgumentError
    time_of_day
  end

  def en_dash(year)
    year.sub("-", "–")
  end
end

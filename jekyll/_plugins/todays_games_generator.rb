# Precomputes today's Varsity games for _includes/todays-games.html, since
# Liquid alone can't do the custom multi-key sort the homepage list needs
# (chronological, then Girls before Boys/Coed, then sport/team names
# alphabetically) - mirrors schedule_page_generator.rb's SEX_ORDER/sort_key/
# school_filter conventions, just scoped to today's date and the Varsity
# level instead of a whole sport/year. Also computes the distinct sport/
# school lists todays-games.html's filter chips use (schedule-filter.html
# only renders a chip row when there's more than one distinct value).
#
# "Today" is site.time (when the site was built), not the visitor's local
# day, since this is a static site - see .github/workflows/jekyll.yaml's
# daily scheduled build (timed after arbiterlive's daily fetch) for how this
# stays fresh.
require "date"

module Schedule
  class TodaysGamesGenerator < Jekyll::Generator
    safe true

    DATA_PATH = %w[schedule games].freeze

    SEX_ORDER = { "Girls" => 0, "Boys" => 1, "Coed" => 2 }.freeze

    def generate(site)
      games = site.data.dig(*DATA_PATH) || []
      bsc_school_names = (site.data["schools"] || []).map { |s| s["school-name"] }
      today = site.time.strftime("%Y-%m-%d")

      todays_games = games.select { |g| g["date"] == today && g["level"] == "Varsity" }
      todays_games = todays_games.map { |g| decorate(g) }
      todays_games.sort_by! { |g| g["sort_key"] }

      site.data["schedule"]["todays_games"] = todays_games
      site.data["schedule"]["todays_sports"] = todays_games.map { |g| g["sport"] }.uniq.sort
      site.data["schedule"]["todays_schools"] =
        ((todays_games.map { |g| g["team_1"] } + todays_games.map { |g| g["team_2"] }).uniq & bsc_school_names).sort
    end

    private

    # 24-hour time strings (and "TBA", forced last via "99:99") already sort
    # correctly as strings, same trick as schedule_page_generator.rb.
    def decorate(game)
      time_key = game["time"] == "TBA" ? "99:99" : (game["time"] || "99:99")
      game.merge(
        "display_time" => format_time(game["time"]),
        "school_filter" => [game["team_1"], game["team_2"]].compact.join("|"),
        "sort_key" => [
          time_key,
          SEX_ORDER[game["sex"]] || 99,
          game["sport"].to_s.downcase,
          game["team_1"].to_s.downcase,
          game["team_2"].to_s.downcase
        ]
      )
    end

    def format_time(time_of_day)
      return nil if time_of_day.nil? || time_of_day.empty?
      return time_of_day if time_of_day == "TBA"

      DateTime.strptime(time_of_day, "%H:%M").strftime("%-I:%M %p")
    rescue ArgumentError
      time_of_day
    end
  end
end

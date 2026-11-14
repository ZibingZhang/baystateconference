# Precomputes today's games for _includes/todays-games.html, since Liquid
# alone can't do the custom multi-key sort the homepage/schedules-index lists
# need (chronological, then Girls before Boys/Coed, then sport/team names
# alphabetically) - mirrors schedule_page_generator.rb's GENDER_ORDER/sort_key/
# school_filter conventions, just scoped to today's date instead of a whole
# sport/year. Also computes the distinct sport/school/level lists
# todays-games.html's filter chips use (schedule-filter.html only renders a
# chip row when there's more than one distinct value).
#
# Builds two variants: "todays_games" (Varsity only, for the homepage) and
# "todays_games_all" (every level, for /schedules/) - see todays-games.html's
# include.all_levels param.
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

    GENDER_ORDER = { "Girls" => 0, "Boys" => 1, "Coed" => 2 }.freeze

    def generate(site)
      games = site.data.dig(*DATA_PATH) || []
      bsc_school_names = (site.data["schools"] || []).map { |s| s["school-name"] }
      today = site.time.strftime("%Y-%m-%d")

      todays_all = games.select { |g| g["date"] == today }

      todays_varsity = todays_all.select { |g| g["level"] == "Varsity" }
      site.data["schedule"]["todays_games"] = build_games(todays_varsity)
      site.data["schedule"]["todays_sports"] = sports_for(todays_varsity)
      site.data["schedule"]["todays_schools"] = schools_for(todays_varsity, bsc_school_names)

      site.data["schedule"]["todays_games_all"] = build_games(todays_all)
      site.data["schedule"]["todays_sports_all"] = sports_for(todays_all)
      site.data["schedule"]["todays_schools_all"] = schools_for(todays_all, bsc_school_names)
      site.data["schedule"]["todays_levels_all"] = levels_for(todays_all)
    end

    private

    def build_games(games)
      decorated = games.map { |g| decorate(g) }
      decorated.sort_by! { |g| g["sort_key"] }
      decorated
    end

    def sports_for(games)
      games.map { |g| g["sport"] }.uniq.sort
    end

    def schools_for(games, bsc_school_names)
      ((games.map { |g| g["team_1"] } + games.map { |g| g["team_2"] }).uniq & bsc_school_names).sort
    end

    # Varsity first, then alphabetical - mirrors schedule_page_generator.rb's
    # levels_for.
    def levels_for(games)
      games.map { |g| g["level"] }.uniq.sort_by { |level| [level == "Varsity" ? 0 : 1, level.to_s] }
    end

    # 24-hour time strings (and "TBA", forced last via "99:99") already sort
    # correctly as strings, same trick as schedule_page_generator.rb.
    def decorate(game)
      time_key = game["time"] == "TBA" ? "99:99" : (game["time"] || "99:99")
      game.merge(
        "display_time" => format_time(game["time"]),
        "school_filter" => [game["team_1"], game["team_2"]].compact.join("|"),
        "sort_key" => [
          time_key,
          GENDER_ORDER[game["gender"]] || 99,
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

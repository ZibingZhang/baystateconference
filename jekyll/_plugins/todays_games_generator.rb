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
require_relative "schedule_page_utils"

module Schedule
  class TodaysGamesGenerator < Jekyll::Generator
    safe true

    DATA_PATH = %w[schedule games].freeze

    def generate(site)
      games = site.data.dig(*DATA_PATH) || []
      bsc_school_names = (site.data["schools"] || []).map { |s| s["school-name"] }
      today = site.time.strftime("%Y-%m-%d")

      todays_all = games.select { |g| g["date"] == today }

      todays_varsity = todays_all.select { |g| g["level"] == "Varsity" }
      site.data["schedule"]["todays_games"] = build_games(todays_varsity)
      site.data["schedule"]["todays_sports"] = sports_for(todays_varsity)
      site.data["schedule"]["todays_schools"] = SchedulePageUtils.schools_for(todays_varsity, bsc_school_names)

      site.data["schedule"]["todays_games_all"] = build_games(todays_all)
      site.data["schedule"]["todays_sports_all"] = sports_for(todays_all)
      site.data["schedule"]["todays_schools_all"] = SchedulePageUtils.schools_for(todays_all, bsc_school_names)
      site.data["schedule"]["todays_levels_all"] = SchedulePageUtils.levels_for(todays_all)
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

    def decorate(game)
      game.merge(
        "display_time" => SchedulePageUtils.format_time(game["time"]),
        "school_filter" => SchedulePageUtils.school_filter_for(game),
        "sort_key" => [
          SchedulePageUtils.time_sort_key(game["time"]),
          SchedulePageUtils::GENDER_ORDER[game["gender"]] || 99,
          game["sport"].to_s.downcase,
          game["team_1"].to_s.downcase,
          game["team_2"].to_s.downcase
        ]
      )
    end
  end
end

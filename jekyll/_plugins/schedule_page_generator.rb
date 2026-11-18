# Generates one page per Sport/School Year of games
# (sports/<sport-slug>/schedule/<school-year>/) straight from
# _data/schedule/games.csv, so a sport gets a schedule page automatically
# the moment its rows show up in that CSV - no matching page to remember.
# The CSV itself is fetched from ArbiterLive by arbiterlive/arbiter_schedule.py
# and dropped in at build time (see .github/workflows for how CI does this);
# it's fine for it to be absent entirely (a fresh checkout that hasn't run
# the fetch script yet), in which case no schedule pages get generated at all.
#
# Each page's games are every Bay State Conference matchup in that sport
# that year, split into one table per Gender (e.g. "Boys") - not per school,
# since a game's two rows have already been resolved into one by
# resolve_game_pairs() in arbiter_schedule.py. Level (Varsity/Sub-Varsity/...)
# is a column within each table rather than its own grouping, since a single
# gender often has just the two or three levels rendering that split
# unnecessary.
#
# A sport's hand-authored schedule/index.md picks these generated pages up
# automatically via directory-listing.html (see page_tree_generator.rb),
# newest-first thanks to its `default_sort: desc` front matter - so a year
# appears in the directory the moment its first CSV row does.
#
# Also generates /sports/<slug>/schedule/current-season/, a permanent link
# that always redirects to whichever year is "current" per the Jul 1
# rollover (see current_school_year). Both this and the current year's page
# always exist for every sport, even one with zero rows in the CSV (e.g. a
# newer/less common sport ArbiterLive doesn't track for any Bay State
# Conference school yet) - that year's page just renders with no games and a
# note instead of 404ing, since sports.yaml is the source of truth for which
# sports exist, not which ones happen to have data yet. Historical years
# only get a page when the CSV actually has rows for them, though.
# `exclude_from_directory: true` keeps the redirect out of the directory
# listing/sitemap (see page_tree_generator.rb) since it's meant to be
# reached only by direct link, not browsed to.
require "date"
require_relative "schedule_page_utils"
require_relative "year_pager_utils"

module Schedule
  class PageGenerator < Jekyll::Generator
    safe true

    DATA_PATH = %w[schedule games].freeze

    def generate(site)
      games = site.data.dig(*DATA_PATH) || []
      sports = site.data["sports"] || []
      bsc_school_names = (site.data["schools"] || []).map { |s| s["school-name"] }
      current_year = current_school_year

      sports.each do |sport|
        slug = sport["url"].to_s.delete_prefix("/sports/").delete_suffix("/")
        sport_games = games.select { |g| g["sport"] == sport["title"] }

        years = sport_games.map { |g| g["school_year"] }.compact.uniq
        years << current_year unless years.include?(current_year)
        years.sort!.reverse!

        years.each_with_index do |year, index|
          site.pages << build_page(site, sport, slug, year, sport_games, bsc_school_names, years, index)
        end

        site.pages << build_current_season_redirect(site, slug, current_year)
      end
    end

    private

    # A school year runs roughly Jul-Jun, so "now" belongs to the year that
    # started this past July (or, Jan-Jun, last July).
    def current_school_year(today = Date.today)
      first_year = today.month >= 7 ? today.year : today.year - 1
      "#{first_year}-#{first_year + 1}"
    end

    def build_current_season_redirect(site, slug, current_year)
      dir = "sports/#{slug}/schedule"
      page = Jekyll::PageWithoutAFile.new(site, site.source, dir, "current-season.html")
      page.content = ""
      page.data.merge!(
        "layout" => "page",
        "title" => "Current Season",
        "permalink" => "/#{dir}/current-season/",
        "redirect_to" => "/#{dir}/#{current_year}/",
        "exclude_from_directory" => true
      )

      page.data["nav"] = slug if site.data.dig("navigation", slug)

      page
    end

    def build_page(site, sport, slug, year, sport_games, bsc_school_names, years, index)
      dir = "sports/#{slug}/schedule"
      page = Jekyll::PageWithoutAFile.new(site, site.source, dir, "#{year}.html")
      page.content = ""
      page.data.merge!(
        "layout" => "schedule",
        "title" => "#{SchedulePageUtils.en_dash(year)} #{sport['title']} Schedule",
        "permalink" => "/#{dir}/#{year}/",
        "breadcrumb" => SchedulePageUtils.en_dash(year),
        "sport_slug" => slug,
        "groups" => groups_for(sport_games, year),
        "schools" => schools_for(sport_games, year, bsc_school_names),
        "levels" => levels_for(sport_games, year),
        "genders" => genders_for(sport_games, year)
      )
      page.data.merge!(
        YearPagerUtils.links(
          years, index, title_for: SchedulePageUtils.method(:en_dash), url_for: ->(y) { "/#{dir}/#{y}/" }
        )
      )

      page.data["nav"] = slug if site.data.dig("navigation", slug)

      page
    end

    def groups_for(sport_games, year)
      year_games = sport_games.select { |g| g["school_year"] == year }

      genders = year_games.map { |g| g["gender"] }.uniq
      genders.sort_by! { |gender| SchedulePageUtils::GENDER_ORDER[gender] || 99 }

      genders.map do |gender|
        rows = year_games.select { |g| g["gender"] == gender }
        rows = rows.map { |g| decorate(g) }
        rows.sort_by! { |g| g["sort_key"] }

        {
          "heading" => gender,
          "entries" => rows,
        }
      end
    end

    # Scoped to this sport/year; see SchedulePageUtils.schools_for for the
    # filter-option rule itself.
    def schools_for(sport_games, year, bsc_school_names)
      year_games = sport_games.select { |g| g["school_year"] == year }
      SchedulePageUtils.schools_for(year_games, bsc_school_names)
    end

    # Scoped to this sport/year; see SchedulePageUtils.levels_for for the
    # filter-option rule itself.
    def levels_for(sport_games, year)
      year_games = sport_games.select { |g| g["school_year"] == year }
      SchedulePageUtils.levels_for(year_games)
    end

    # Distinct genders (Girls/Boys/Coed) played this sport/year, in
    # GENDER_ORDER, for the "filter by gender" control (see
    # schedule-filter.html).
    def genders_for(sport_games, year)
      year_games = sport_games.select { |g| g["school_year"] == year }
      genders = year_games.map { |g| g["gender"] }.uniq
      genders.sort_by { |gender| SchedulePageUtils::GENDER_ORDER[gender] || 99 }
    end

    # arbiter_schedule.py already splits ArbiterLive's date_time into clean
    # ISO 8601 "date"/"time" columns (resolving the actual calendar year,
    # since ArbiterLive's own string has none) - this just reformats them
    # for display and builds a plain string sort key (ISO dates/24-hour
    # times already sort correctly as strings; "TBA" times sort after any
    # real time since "T" > any digit). Also builds the "school" filter
    # attribute schedule-filter.html/schedule-filter.js use to show/hide
    # rows - both team names, since either could be the one a visitor picks.
    def decorate(game)
      game.merge(
        "date" => SchedulePageUtils.format_date(game["date"]),
        "time" => SchedulePageUtils.format_time(game["time"]),
        "school_filter" => SchedulePageUtils.school_filter_for(game),
        "sort_key" => [game["date"] || "9999-99-99", SchedulePageUtils.time_sort_key(game["time"])]
      )
    end
  end
end

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
# that year, split into one table per Sex (e.g. "Boys") - not per school,
# since a game's two rows have already been resolved into one by
# resolve_game_pairs() in arbiter_schedule.py. Level (Varsity/Sub-Varsity/...)
# is a column within each table rather than its own grouping, since a single
# sex often has just the two or three levels rendering that split
# unnecessary.
#
# A sport's hand-authored schedule/index.md picks these generated pages up
# automatically via directory-listing.html (see page_tree_generator.rb),
# newest-first thanks to its `default_sort: desc` front matter - so a year
# appears in the directory the moment its first CSV row does.
#
# Also generates /sports/<slug>/schedule/current-season/, a permanent link
# that always redirects to whichever year is "current" per the Jul 1
# rollover (see current_school_year) - only when that year's page actually
# exists, so it's never a dead link. `exclude_from_directory: true` keeps it
# out of the directory listing/sitemap (see page_tree_generator.rb) since
# it's meant to be reached only by direct link, not browsed to.
require "date"

module Schedule
  class PageGenerator < Jekyll::Generator
    safe true

    DATA_PATH = %w[schedule games].freeze

    SEX_ORDER = { "Girls" => 0, "Boys" => 1, "Coed" => 2 }.freeze

    def generate(site)
      games = site.data.dig(*DATA_PATH) || []
      return if games.empty?

      sports = site.data["sports"] || []
      current_year = current_school_year

      sports.each do |sport|
        slug = sport["url"].to_s.delete_prefix("/sports/").delete_suffix("/")
        sport_games = games.select { |g| g["sport"] == sport["title"] }
        next if sport_games.empty?

        years = sport_games.map { |g| g["school_year"] }.compact.uniq.sort.reverse

        years.each_with_index do |year, index|
          previous_year = years[index + 1]
          next_year = index.zero? ? nil : years[index - 1]
          site.pages << build_page(site, sport, slug, year, sport_games, previous_year, next_year)
        end

        if years.include?(current_year)
          site.pages << build_current_season_redirect(site, slug, current_year)
        end
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

    def build_page(site, sport, slug, year, sport_games, previous_year, next_year)
      dir = "sports/#{slug}/schedule"
      page = Jekyll::PageWithoutAFile.new(site, site.source, dir, "#{year}.html")
      page.content = ""
      page.data.merge!(
        "layout" => "schedule",
        "title" => "#{en_dash(year)} #{sport['title']} Schedule",
        "permalink" => "/#{dir}/#{year}/",
        "breadcrumb" => en_dash(year),
        "groups" => groups_for(sport_games, year),
        "previous_url" => previous_year && "/#{dir}/#{previous_year}/",
        "previous_title" => previous_year && en_dash(previous_year),
        "next_url" => next_year && "/#{dir}/#{next_year}/",
        "next_title" => next_year && en_dash(next_year)
      )

      page.data["nav"] = slug if site.data.dig("navigation", slug)

      page
    end

    def groups_for(sport_games, year)
      year_games = sport_games.select { |g| g["school_year"] == year }

      sexes = year_games.map { |g| g["sex"] }.uniq
      sexes.sort_by! { |sex| SEX_ORDER[sex] || 99 }

      sexes.map do |sex|
        rows = year_games.select { |g| g["sex"] == sex }
        rows = rows.map { |g| decorate(g) }
        rows.sort_by! { |g| g["sort_key"] }

        {
          "heading" => sex,
          "entries" => rows,
        }
      end
    end

    # arbiter_schedule.py already splits ArbiterLive's date_time into clean
    # ISO 8601 "date"/"time" columns (resolving the actual calendar year,
    # since ArbiterLive's own string has none) - this just reformats them
    # for display and builds a plain string sort key (ISO dates/24-hour
    # times already sort correctly as strings; "TBA" times sort after any
    # real time since "T" > any digit).
    def decorate(game)
      game.merge(
        "date" => format_date(game["date"]),
        "time" => format_time(game["time"]),
        "sort_key" => [game["date"] || "9999-99-99", game["time"] == "TBA" ? "99:99" : (game["time"] || "99:99")]
      )
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
end

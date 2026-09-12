# Generates, for every School/School Year with at least one game:
#   schools/<school-slug>/schedule/<school-year>/            - a grid of
#     sport cards (mirrors sports/index.md's sport-grid.html), one per sport
#     that school played that year
#   schools/<school-slug>/schedule/<school-year>/<sport-slug>/ - that one
#     sport's actual games that year, split into one table per Sex (e.g.
#     "Boys") - same shape as the per-sport pages schedule_page_generator.rb
#     builds, just for one school instead of every school in that sport
#
# Both are built from _data/schedule/games.csv, the same source
# schedule_page_generator.rb builds the per-sport pages from - see that
# file's header comment for the CSV/build details this shares (absence
# handling, Jul 1 "current season" rollover, etc).
#
# Also sets site.data["schools_with_current_season_schedule"] (an array of
# school slugs) so school.html can link to a school's current-season
# schedule only when that page actually exists - not every school
# necessarily has one (e.g. its ArbiterLive fetch failed, or it fields no
# teams at all yet).
require "date"

module SchoolSchedule
  class PageGenerator < Jekyll::Generator
    safe true

    DATA_PATH = %w[schedule games].freeze

    SEX_ORDER = { "Girls" => 0, "Boys" => 1, "Coed" => 2 }.freeze

    def generate(site)
      games = site.data.dig(*DATA_PATH) || []
      schools = site.data["schools"] || []
      sports = site.data["sports"] || []
      current_year = current_school_year
      current_slugs = []

      schools.each do |school|
        name = school["school-name"]
        slug = Jekyll::Utils.slugify(school["town"].to_s)
        school_games = games.select { |g| g["team_1"] == name || g["team_2"] == name }
        next if school_games.empty?

        years = school_games.map { |g| g["school_year"] }.compact.uniq.sort.reverse

        years.each_with_index do |year, index|
          previous_year = years[index + 1]
          next_year = index.zero? ? nil : years[index - 1]
          site.pages << build_year_page(site, sports, slug, year, school_games, previous_year, next_year)

          sport_titles_for(school_games, year).each do |sport_title|
            site.pages << build_sport_page(
              site, name, sports, slug, sport_title, year, school_games, years, index
            )
          end
        end

        if years.include?(current_year)
          site.pages << build_current_season_redirect(site, slug, current_year)
          current_slugs << slug
        end
      end

      site.data["schools_with_current_season_schedule"] = current_slugs
    end

    private

    # A school year runs roughly Jul-Jun, so "now" belongs to the year that
    # started this past July (or, Jan-Jun, last July). Matches
    # schedule_page_generator.rb's identical method.
    def current_school_year(today = Date.today)
      first_year = today.month >= 7 ? today.year : today.year - 1
      "#{first_year}-#{first_year + 1}"
    end

    def sport_titles_for(school_games, year)
      school_games.select { |g| g["school_year"] == year }.map { |g| g["sport"] }.uniq
    end

    # Looks a sport up by title in _data/sports.yaml, so the card grid uses
    # the exact same icon/url-slug as that sport's own page, rather than
    # re-deriving a slug from the title (which could disagree - e.g.
    # "Track & Field" slugifies differently than its actual "track-and-field"
    # url segment).
    def sport_data(sports, title)
      sports.find { |s| s["title"] == title }
    end

    def build_year_page(site, sports, slug, year, school_games, previous_year, next_year)
      dir = "schools/#{slug}/schedule"
      page = Jekyll::PageWithoutAFile.new(site, site.source, dir, "#{year}.html")
      page.content = ""
      page.data.merge!(
        "layout" => "school-schedule-year",
        "title" => "#{en_dash(year)} Schedule",
        "permalink" => "/#{dir}/#{year}/",
        "breadcrumb" => en_dash(year),
        "sport_cards" => sport_cards_for(sports, school_games, year, dir),
        "previous_url" => previous_year && "/#{dir}/#{previous_year}/",
        "previous_title" => previous_year && en_dash(previous_year),
        "next_url" => next_year && "/#{dir}/#{next_year}/",
        "next_title" => next_year && en_dash(next_year)
      )
      page
    end

    def sport_cards_for(sports, school_games, year, dir)
      titles = sport_titles_for(school_games, year)

      sports.select { |sport| titles.include?(sport["title"]) }.map do |sport|
        slug = sport["url"].to_s.delete_prefix("/sports/").delete_suffix("/")
        { "title" => sport["title"], "icon" => sport["icon"], "url" => "/#{dir}/#{year}/#{slug}/" }
      end
    end

    def build_sport_page(site, name, sports, school_slug, sport_title, year, school_games, years, index)
      sport_slug = sport_data(sports, sport_title)&.fetch("url", nil)&.delete_prefix("/sports/")&.delete_suffix("/") ||
        Jekyll::Utils.slugify(sport_title)

      dir = "schools/#{school_slug}/schedule/#{year}/#{sport_slug}"

      previous_year = years[index + 1..].find { |y| sport_titles_for(school_games, y).include?(sport_title) }
      next_year = years[0...index].reverse.find { |y| sport_titles_for(school_games, y).include?(sport_title) }
      base_dir = "schools/#{school_slug}/schedule"

      page = Jekyll::PageWithoutAFile.new(site, site.source, dir, "index.html")
      page.content = ""
      page.data.merge!(
        "layout" => "school-schedule",
        "title" => "#{en_dash(year)} #{sport_title} Schedule",
        "permalink" => "/#{dir}/",
        "breadcrumb" => sport_title,
        "groups" => groups_for(school_games, year, sport_title, name),
        "previous_url" => previous_year && "/#{base_dir}/#{previous_year}/#{sport_slug}/",
        "previous_title" => previous_year && en_dash(previous_year),
        "next_url" => next_year && "/#{base_dir}/#{next_year}/#{sport_slug}/",
        "next_title" => next_year && en_dash(next_year)
      )
      page
    end

    def build_current_season_redirect(site, slug, current_year)
      dir = "schools/#{slug}/schedule"
      page = Jekyll::PageWithoutAFile.new(site, site.source, dir, "current-season.html")
      page.content = ""
      page.data.merge!(
        "layout" => "page",
        "title" => "Current Season",
        "permalink" => "/#{dir}/current-season/",
        "redirect_to" => "/#{dir}/#{current_year}/",
        "exclude_from_directory" => true
      )
      page
    end

    # One group per Sex (e.g. "Boys") within the one sport this page is
    # scoped to - the sport itself is implicit from the page/URL, so it's
    # not repeated in the heading the way the picker page's cards are.
    def groups_for(school_games, year, sport_title, name)
      rows = school_games.select do |g|
        g["school_year"] == year && g["sport"] == sport_title
      end

      sexes = rows.map { |g| g["sex"] }.uniq
      sexes.sort_by! { |sex| SEX_ORDER[sex] || 99 }

      sexes.map do |sex|
        sex_rows = rows.select { |g| g["sex"] == sex }
        sex_rows = sex_rows.map { |g| decorate(g, name) }
        sex_rows.sort_by! { |g| g["sort_key"] }

        { "heading" => sex, "entries" => sex_rows }
      end
    end

    # Reorients a game (stored as an orientation-agnostic team_1/team_2 pair)
    # to this one school's point of view: who the opponent was, whether this
    # school won, and the score with this school's number first.
    def decorate(game, name)
      opponent = game["team_1"] == name ? game["team_2"] : game["team_1"]

      result = nil
      if game["winner"] == name
        result = "W"
      elsif game["winner"] == opponent
        result = "L"
      elsif game["winner"] == "Tie"
        result = "T"
      end

      score = game["score"]
      if score && score.include?("-") && game["team_2"] == name
        away, home = score.split("-", 2)
        score = "#{home}-#{away}"
      end

      game.merge(
        "opponent" => opponent,
        "home" => game["home_team"] == name,
        "result" => result,
        "score" => score,
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

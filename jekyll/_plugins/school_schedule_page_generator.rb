# Generates one page per School/School Year of games
# (schools/<school-slug>/schedule/<school-year>/) straight from
# _data/schedule/games.csv - the same source schedule_page_generator.rb
# builds the per-sport pages from, just filtered/grouped the other way
# (by Sport within one school, instead of by Sex within one sport across
# every school). See that file's header comment for the CSV/build details
# this shares (absence handling, Jul 1 "current season" rollover, etc).
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
          site.pages << build_page(site, name, slug, year, school_games, previous_year, next_year)
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

    def build_page(site, name, slug, year, school_games, previous_year, next_year)
      dir = "schools/#{slug}/schedule"
      page = Jekyll::PageWithoutAFile.new(site, site.source, dir, "#{year}.html")
      page.content = ""
      page.data.merge!(
        "layout" => "school-schedule",
        "title" => "#{en_dash(year)} Schedule",
        "permalink" => "/#{dir}/#{year}/",
        "breadcrumb" => en_dash(year),
        "groups" => groups_for(school_games, year, name),
        "previous_url" => previous_year && "/#{dir}/#{previous_year}/",
        "previous_title" => previous_year && en_dash(previous_year),
        "next_url" => next_year && "/#{dir}/#{next_year}/",
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

    # One group per Sport/Sex combination (e.g. "Boys Football") rather than
    # per Sport with Sex as its own column - "Boys" and "Football" read as
    # one team name, not two independent facts worth separate columns.
    def groups_for(school_games, year, name)
      year_games = school_games.select { |g| g["school_year"] == year }

      keys = year_games.map { |g| [g["sport"], g["sex"]] }.uniq
      keys.sort_by! { |sport, sex| [sport.to_s, SEX_ORDER[sex] || 99] }

      keys.map do |sport, sex|
        rows = year_games.select { |g| g["sport"] == sport && g["sex"] == sex }
        rows = rows.map { |g| decorate(g, name) }
        rows.sort_by! { |g| g["sort_key"] }

        { "heading" => [sex, sport].compact.join(" "), "entries" => rows }
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

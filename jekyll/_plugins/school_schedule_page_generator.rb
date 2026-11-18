# Generates, for every School/School Year with at least one game:
#   schools/<school-slug>/schedule/<school-year>/            - a grid of
#     sport cards (mirrors sports/index.md's sport-grid.html), one per sport
#     that school played that year
#   schools/<school-slug>/schedule/<school-year>/<sport-slug>/ - that one
#     sport's actual games that year, split into one table per Gender (e.g.
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
#
# Similarly sets site.data["schools_with_current_season_sport_schedule"]
# (an array of "<school-slug>:<sport-slug>" strings) so a sport's own school
# page (sports/<sport>/schools/<school>/, built by sport_school_page_generator.rb)
# can link straight to that sport's current-season schedule instead of the
# school's general one - again, only when that sport/school/year actually
# has games. There's no participation flag anywhere (schools.yaml's
# `sport.<slug>` map is just hand-authored extras) to say whether a school
# fields a given sport at all, so when this is absent, school.html just
# notes there's no current-season schedule for that sport rather than
# claiming the school doesn't play it.
require "date"
require_relative "schedule_page_utils"

module SchoolSchedule
  class PageGenerator < Jekyll::Generator
    safe true

    DATA_PATH = %w[schedule games].freeze

    def generate(site)
      games = site.data.dig(*DATA_PATH) || []
      schools = site.data["schools"] || []
      sports = site.data["sports"] || []
      current_year = current_school_year
      current_slugs = []
      current_sport_slugs = []

      schools.each do |school|
        name = school["school-name"]
        slug = Jekyll::Utils.slugify(school["town"].to_s)
        school_games = games.select { |g| g["team_1"] == name || g["team_2"] == name }
        next if school_games.empty?

        years = school_games.map { |g| g["school_year"] }.compact.uniq.sort.reverse
        oldest_year = years.last
        latest_year = years.first

        # Precomputed once per school rather than re-deriving per (year,
        # sport) page below - each sport's own previous/next/oldest/latest
        # years are a subset of `years` (a sport need not have games every
        # year), but scanning school_games again for every page would make
        # this O(years^2) instead of O(years). Built by iterating `years`
        # (already newest-first) in order, so every value lands sorted the
        # same way for free.
        sport_years_by_title = Hash.new { |hash, title| hash[title] = [] }
        years.each do |year|
          sport_titles_for(school_games, year).each { |title| sport_years_by_title[title] << year }
        end

        years.each_with_index do |year, index|
          previous_year = years[index + 1]
          next_year = index.zero? ? nil : years[index - 1]
          site.pages << build_year_page(site, sports, slug, year, school_games, previous_year, next_year,
                                         oldest_year, latest_year)

          sport_titles_for(school_games, year).each do |sport_title|
            site.pages << build_sport_page(
              site, name, sports, slug, sport_title, year, school_games, sport_years_by_title[sport_title]
            )
          end
        end

        if years.include?(current_year)
          site.pages << build_current_season_redirect(site, slug, current_year)
          current_slugs << slug

          sport_titles_for(school_games, current_year).each do |sport_title|
            sport_slug = sport_data(sports, sport_title)&.fetch("url", nil)&.delete_prefix("/sports/")&.delete_suffix("/") ||
              Jekyll::Utils.slugify(sport_title)
            site.pages << build_sport_current_season_redirect(site, slug, sport_slug, current_year)
            current_sport_slugs << "#{slug}:#{sport_slug}"
          end
        end
      end

      site.data["schools_with_current_season_schedule"] = current_slugs
      site.data["schools_with_current_season_sport_schedule"] = current_sport_slugs
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

    def build_year_page(site, sports, slug, year, school_games, previous_year, next_year, oldest_year, latest_year)
      dir = "schools/#{slug}/schedule"
      page = Jekyll::PageWithoutAFile.new(site, site.source, dir, "#{year}.html")
      page.content = ""
      page.data.merge!(
        "layout" => "school-schedule-year",
        "title" => "#{SchedulePageUtils.en_dash(year)} Schedule",
        "permalink" => "/#{dir}/#{year}/",
        "breadcrumb" => SchedulePageUtils.en_dash(year),
        "sport_cards" => sport_cards_for(sports, school_games, year, dir),
        "previous_url" => previous_year && "/#{dir}/#{previous_year}/",
        "previous_title" => previous_year && SchedulePageUtils.en_dash(previous_year),
        "next_url" => next_year && "/#{dir}/#{next_year}/",
        "next_title" => next_year && SchedulePageUtils.en_dash(next_year),
        "oldest_url" => (year != oldest_year) && "/#{dir}/#{oldest_year}/",
        "oldest_title" => (year != oldest_year) && SchedulePageUtils.en_dash(oldest_year),
        "latest_url" => (year != latest_year) && "/#{dir}/#{latest_year}/",
        "latest_title" => (year != latest_year) && SchedulePageUtils.en_dash(latest_year)
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

    def build_sport_page(site, name, sports, school_slug, sport_title, year, school_games, sport_years)
      sport_slug = sport_data(sports, sport_title)&.fetch("url", nil)&.delete_prefix("/sports/")&.delete_suffix("/") ||
        Jekyll::Utils.slugify(sport_title)

      dir = "schools/#{school_slug}/schedule/#{year}/#{sport_slug}"

      # sport_years (newest-first) is precomputed once per school by the
      # caller - re-deriving it here per page would mean re-scanning
      # school_games for every year again.
      sport_index = sport_years.index(year)
      previous_year = sport_years[sport_index + 1]
      next_year = sport_index.zero? ? nil : sport_years[sport_index - 1]
      oldest_year = sport_years.last
      latest_year = sport_years.first
      base_dir = "schools/#{school_slug}/schedule"

      page = Jekyll::PageWithoutAFile.new(site, site.source, dir, "index.html")
      page.content = ""
      page.data.merge!(
        "layout" => "school-schedule",
        "title" => "#{SchedulePageUtils.en_dash(year)} #{sport_title} Schedule",
        "permalink" => "/#{dir}/",
        "breadcrumb" => sport_title,
        "school_slug" => school_slug,
        "sport_slug" => sport_slug,
        "groups" => groups_for(school_games, year, sport_title, name),
        "levels" => levels_for(school_games, year, sport_title),
        "genders" => genders_for(school_games, year, sport_title),
        "previous_url" => previous_year && "/#{base_dir}/#{previous_year}/#{sport_slug}/",
        "previous_title" => previous_year && SchedulePageUtils.en_dash(previous_year),
        "next_url" => next_year && "/#{base_dir}/#{next_year}/#{sport_slug}/",
        "next_title" => next_year && SchedulePageUtils.en_dash(next_year),
        "oldest_url" => (year != oldest_year) && "/#{base_dir}/#{oldest_year}/#{sport_slug}/",
        "oldest_title" => (year != oldest_year) && SchedulePageUtils.en_dash(oldest_year),
        "latest_url" => (year != latest_year) && "/#{base_dir}/#{latest_year}/#{sport_slug}/",
        "latest_title" => (year != latest_year) && SchedulePageUtils.en_dash(latest_year)
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

    def build_sport_current_season_redirect(site, slug, sport_slug, current_year)
      dir = "schools/#{slug}/schedule/current-season"
      page = Jekyll::PageWithoutAFile.new(site, site.source, dir, "#{sport_slug}.html")
      page.content = ""
      page.data.merge!(
        "layout" => "page",
        "title" => "Current Season",
        "permalink" => "/#{dir}/#{sport_slug}/",
        "redirect_to" => "/schools/#{slug}/schedule/#{current_year}/#{sport_slug}/",
        "exclude_from_directory" => true
      )
      page
    end

    # Scoped to this school/sport/year; see SchedulePageUtils.levels_for for
    # the filter-option rule itself.
    def levels_for(school_games, year, sport_title)
      rows = school_games.select { |g| g["school_year"] == year && g["sport"] == sport_title }
      SchedulePageUtils.levels_for(rows)
    end

    # Distinct genders (Girls/Boys/Coed) this school/sport/year has games at,
    # in GENDER_ORDER, for the "filter by gender" control (see
    # schedule-filter.html).
    def genders_for(school_games, year, sport_title)
      rows = school_games.select { |g| g["school_year"] == year && g["sport"] == sport_title }
      genders = rows.map { |g| g["gender"] }.uniq
      genders.sort_by { |gender| SchedulePageUtils::GENDER_ORDER[gender] || 99 }
    end

    # One group per Gender (e.g. "Boys") within the one sport this page is
    # scoped to - the sport itself is implicit from the page/URL, so it's
    # not repeated in the heading the way the picker page's cards are.
    def groups_for(school_games, year, sport_title, name)
      rows = school_games.select do |g|
        g["school_year"] == year && g["sport"] == sport_title
      end

      genders = rows.map { |g| g["gender"] }.uniq
      genders.sort_by! { |gender| SchedulePageUtils::GENDER_ORDER[gender] || 99 }

      genders.map do |gender|
        gender_rows = rows.select { |g| g["gender"] == gender }
        gender_rows = gender_rows.map { |g| decorate(g, name) }
        gender_rows.sort_by! { |g| g["sort_key"] }

        { "heading" => gender, "entries" => gender_rows }
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
        "date" => SchedulePageUtils.format_date(game["date"]),
        "time" => SchedulePageUtils.format_time(game["time"]),
        "sort_key" => [game["date"] || "9999-99-99", SchedulePageUtils.time_sort_key(game["time"])]
      )
    end
  end
end

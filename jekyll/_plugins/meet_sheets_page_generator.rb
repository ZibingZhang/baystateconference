# Generates the Results/Psych Sheet/Heat Sheet pages for all three swimming
# & diving meet sources - Bay State Conference, MIAA Sectionals, MIAA States -
# from the raw per-meet CSVs under jekyll/_data/swimming-diving/<raw_root>/
# <year>/<season>/[<meet>/]{individual,relay,diving}_results.csv +
# team_scores.csv (see scripts/extract_swim_meet.py for how those CSVs get
# built from a meet's official Results/Psych Sheet PDFs, and
# meet_sheets_page_utils.rb for the shared event-grouping/sorting/sheet-
# availability/team-scoring logic every source here uses identically).
#
# Mirrors ranking_page_generator.rb's SOURCES-array pattern: one Generator,
# one config entry per source, since the three only actually differ in a
# handful of ways:
#
#   raw_root           - _data path, e.g. %w[swimming-diving bsc]
#   dir                - site path, e.g. "sports/swimming-diving/bsc"
#   nested_meet_data   - does the raw _data nest one more level, keyed by a
#                        meet slug, before the CSV filenames? True for
#                        Sectionals (one key per concurrent meet - North/
#                        South in Fall, +Central/West in Winter); false for
#                        BSC and States (CSVs sit directly under
#                        <year>/<season>/ - BSC only ever has the one meet,
#                        so there's no meet slug to key by).
#   separate_meet_pages - does each meet get its own hub page one level below
#                        the season page (true - only Sectionals, since North
#                        and South each need their own team scores + sheet
#                        links), or does the season page simply *become* the
#                        (sole) meet's hub page (false - BSC and States)?
#                        Requires nested_meet_data.
#   meet_labels/meet_order - (separate_meet_pages sources only) meet slug ->
#                        display label/sort position, e.g.
#                        "north" => "North Sectional".
#   hub_label          - (!separate_meet_pages sources only) the one meet's
#                        constant display label, e.g. "Bay State Conference
#                        Meet"/"State Meet", standing in for meet_labels.
#   year_title_suffix / season_title_suffix - trailing words for the year
#                        page's and (separate_meet_pages only) season
#                        directory page's <title>, e.g. "Sectional Meets".
#   latest_title       - the /latest/ redirect page's <title>.
#   archive_slug       - this source's folder name under the archive's
#                        Documents > By Meet and Season.
#
# Every page below a <year> is otherwise identical in shape and content
# regardless of source: a hub page (team scores + Unofficial Meet Documents + Archive
# link-list) and, below it, whichever of Heat Sheet/Psych Sheet/Results the
# data actually supports (see meet_sheets_page_utils.rb's SHEET_DEFS). <year> (and,
# for separate_meet_pages sources, <season>) get their own thin
# directory-listing page purely so page_tree_generator.rb's breadcrumbs (and
# directory-listing.html, which only lists children that are real pages)
# have something to point at.
require_relative "meet_sheets_page_utils"

module MeetSheets
  class PageGenerator < Jekyll::Generator
    safe true

    SOURCES = [
      {
        raw_root: %w[swimming-diving bsc],
        dir: "sports/swimming-diving/bsc",
        nested_meet_data: false,
        separate_meet_pages: false,
        hub_label: "Bay State Conference Meet",
        year_title_suffix: "Bay State Conference Meet",
        latest_title: "Latest Bay State Conference Meet",
        archive_slug: "bay-state-conference",
      },
      {
        raw_root: %w[swimming-diving miaa sectionals],
        dir: "sports/swimming-diving/sectionals",
        nested_meet_data: true,
        separate_meet_pages: true,
        # Every meet slug this source's data has ever used (back to 1972) -
        # Eastern Mass split into North/South in 1978; Winter sectionals
        # added a 3rd/4th concurrent meet in different years under
        # different names before settling on Central/West.
        meet_labels: {
          "eastern-mass" => "Eastern Mass Sectional",
          "north" => "North Sectional",
          "south" => "South Sectional",
          "central-south" => "Central-South Sectional",
          "west" => "West Sectional",
          "western-mass" => "Western Mass Sectional",
          "central-west" => "Central/West Sectional",
        },
        meet_order: {
          "eastern-mass" => 0, "north" => 0, "south" => 1,
          "central-south" => 2, "central-west" => 2, "west" => 3, "western-mass" => 3,
        },
        year_title_suffix: "Sectional Meets",
        season_title_suffix: "Sectional Meets",
        latest_title: "Latest Sectional Meet",
        archive_slug: "sectionals",
      },
      {
        raw_root: %w[swimming-diving miaa states],
        dir: "sports/swimming-diving/states",
        nested_meet_data: false,
        separate_meet_pages: false,
        hub_label: "State Meet",
        year_title_suffix: "State Meets",
        latest_title: "Latest State Meet",
        archive_slug: "states",
      },
    ].freeze

    HUB_CONTENT = <<~LIQUID
      {% for group in page.team_score_groups %}
      {% include rankings-table.html heading=group.heading entries=group.entries %}
      {% endfor %}
      {% include link-list.html heading="Unofficial Meet Documents" items=page.sheet_links open_in_new_tab=true %}
      {% include link-list.html heading="See Also" items=page.archive_links %}
    LIQUID

    # link-list.html auto-detects "http"-prefixed urls as external (new tab,
    # external-link icon) - no open_in_new_tab needed for this one.
    GITHUB_REPO_TREE_URL = "https://github.com/ZibingZhang/baystateconference/tree/master".freeze

    def generate(site)
      SOURCES.each { |source| generate_source(site, source) }
    end

    private

    def generate_source(site, source)
      individual = MeetSheetsPageUtils.normalized_rows(site, source[:raw_root], :individual, "individual_results", multi_meet: source[:nested_meet_data])
      relay = MeetSheetsPageUtils.normalized_rows(site, source[:raw_root], :relay, "relay_results", multi_meet: source[:nested_meet_data])
      diving = MeetSheetsPageUtils.normalized_rows(site, source[:raw_root], :diving, "diving_results", multi_meet: source[:nested_meet_data])
      all_rows = individual + relay + diving

      # A source without separate_meet_pages has at most one meet per season
      # regardless of how many (identically-ignored) keys nested_meet_data
      # found - ["Meet"] is simply dropped from every grouping key below, so
      # BSC's always-"bay-state-conference" key never needs special-casing.
      triples = if source[:separate_meet_pages]
                  all_rows.map { |r| [r["School Year"], r["Season"], r["Meet"]] }.uniq
                else
                  all_rows.map { |r| [r["School Year"], r["Season"], nil] }.uniq
                end
      years = triples.map(&:first).uniq.sort.reverse

      years.each do |year|
        site.pages << build_year_page(site, source, year)

        seasons = triples.select { |y, _, _| y == year }.map { |_, s, _| s }.uniq
        seasons.sort_by! { |s| MeetSheetsPageUtils::SEASON_ORDER[s] || 99 }

        seasons.each do |season|
          meets = if source[:separate_meet_pages]
                    m = triples.select { |y, s, _| y == year && s == season }.map { |_, _, meet| meet }.uniq
                    m.sort_by! { |meet| source[:meet_order][meet] || 99 }
                    site.pages << build_season_directory_page(site, source, year, season)
                    m
                  else
                    [nil]
                  end

          meets.each do |meet|
            rows = all_rows.select do |r|
              r["School Year"] == year && r["Season"] == season &&
                (!source[:separate_meet_pages] || r["Meet"] == meet)
            end
            sheets = MeetSheetsPageUtils.available_sheets(rows)
            team_scores = team_scores_for(site, source, year, season, meet)
            hub_dir = meet ? "#{source[:dir]}/#{year}/#{season}/#{meet}" : "#{source[:dir]}/#{year}/#{season}"
            hub_label = meet ? meet_label(source, meet) : source[:hub_label]

            site.pages << build_hub_page(site, source, year, season, meet, hub_dir, hub_label, team_scores, sheets)

            grouped = MeetSheetsPageUtils.group_by_event(
              individual.select { |r| r["School Year"] == year && r["Season"] == season && (!source[:separate_meet_pages] || r["Meet"] == meet) },
              relay.select { |r| r["School Year"] == year && r["Season"] == season && (!source[:separate_meet_pages] || r["Meet"] == meet) },
              diving.select { |r| r["School Year"] == year && r["Season"] == season && (!source[:separate_meet_pages] || r["Meet"] == meet) }
            )
            sheets.each { |sheet| site.pages << build_sheet_page(site, source, year, season, hub_dir, hub_label, sheet, grouped) }
          end
        end
      end

      site.pages << build_latest_meet_redirect(site, source, triples) unless triples.empty?
      MeetSheetsPageUtils.inject_latest_meet_url(site, source[:dir], !triples.empty?)
    end

    def build_latest_meet_redirect(site, source, triples)
      latest_year = triples.map(&:first).uniq.sort.max
      latest_season = triples.select { |y, _, _| y == latest_year }
                              .map { |_, s, _| s }
                              .max_by { |s| MeetSheetsPageUtils::SEASON_ORDER[s] || 99 }

      page = Jekyll::PageWithoutAFile.new(site, site.source, source[:dir], "latest.html")
      page.content = ""
      page.data.merge!(
        "layout" => "page",
        "title" => source[:latest_title],
        "permalink" => "/#{source[:dir]}/latest/",
        "redirect_to" => "/#{source[:dir]}/#{latest_year}/#{latest_season}/",
        "exclude_from_directory" => true
      )
      page
    end

    def build_year_page(site, source, year)
      dir = "#{source[:dir]}/#{year}"
      page = Jekyll::PageWithoutAFile.new(site, site.source, dir, "index.html")
      page.content = "{% include directory-listing.html %}"
      page.data.merge!(
        "layout" => "page",
        "title" => "#{MeetSheetsPageUtils.en_dash(year)} #{source[:year_title_suffix]}",
        "permalink" => "/#{dir}/",
        "breadcrumb" => MeetSheetsPageUtils.en_dash(year)
      )
      page
    end

    def build_season_directory_page(site, source, year, season)
      dir = "#{source[:dir]}/#{year}/#{season}"
      page = Jekyll::PageWithoutAFile.new(site, site.source, dir, "index.html")
      page.content = "{% include directory-listing.html %}"
      page.data.merge!(
        "layout" => "page",
        "title" => "#{MeetSheetsPageUtils.en_dash(year)} #{season_label(season)} #{source[:season_title_suffix]}",
        "permalink" => "/#{dir}/",
        "breadcrumb" => season_label(season)
      )
      page
    end

    def build_hub_page(site, source, year, season, meet, dir, hub_label, team_scores, sheets)
      page = Jekyll::PageWithoutAFile.new(site, site.source, dir, "index.html")
      page.content = HUB_CONTENT
      page.data.merge!(
        "layout" => "page",
        "title" => "#{MeetSheetsPageUtils.en_dash(year)} #{season_label(season)} #{hub_label}",
        "permalink" => "/#{dir}/",
        "breadcrumb" => source[:separate_meet_pages] ? hub_label : season_label(season),
        "team_score_groups" => MeetSheetsPageUtils.team_score_groups(team_scores, site),
        "sheet_links" => sheets.map { |sheet| { "title" => sheet[:title], "url" => "/#{dir}/#{sheet[:slug]}/" } },
        "archive_links" => [
          {
            "title" => "Full Meet Archive",
            "url" => "/sports/swimming-diving/archive/?path=documents/by-meet-and-season/#{source[:archive_slug]}/#{year}-#{season}"
          },
          {
            "title" => "Raw CSV Files",
            "url" => raw_data_github_url(site, source, year, season, meet)
          }
        ]
      )
      page
    end

    # The official Results/Psych Sheet PDFs these CSVs were extracted from
    # (see the file header) aren't the only source some meets draw from -
    # e.g. the Bay State Conference meet also merges in a MeetMobile live
    # capture - so this points at the actual _data CSVs themselves, already
    # reconciled across every source, rather than at any one input PDF.
    def raw_data_github_url(site, source, year, season, meet)
      path = ["jekyll", "_data", *source[:raw_root], year, season]
      if source[:nested_meet_data]
        slug = meet || site.data.dig(*source[:raw_root], year, season)&.keys&.first
        path << slug if slug
      end
      "#{GITHUB_REPO_TREE_URL}/#{path.join('/')}"
    end

    def build_sheet_page(site, source, year, season, dir, hub_label, sheet, grouped)
      page = Jekyll::PageWithoutAFile.new(site, site.source, dir, "#{sheet[:slug]}.html")
      page.content = ""
      page.data.merge!(
        "layout" => "bsc-sheet",
        "title" => "#{MeetSheetsPageUtils.en_dash(year)} #{season_label(season)} #{hub_label} #{sheet[:title]}",
        "permalink" => "/#{dir}/#{sheet[:slug]}/",
        "breadcrumb" => sheet[:title],
        "sheet_kind" => sheet[:slug],
        "events" => MeetSheetsPageUtils.events_for(sheet[:slug], grouped)
      )
      page
    end

    def team_scores_for(site, source, year, season, meet)
      base = site.data.dig(*source[:raw_root], year, season)
      return [] unless base

      files = if source[:nested_meet_data]
                meet ? base[meet] : base.values.first
              else
                base
              end
      (files || {})["team_scores"] || []
    end

    def season_label(season)
      MeetSheetsPageUtils::SEASON_LABELS[season] || season
    end

    def meet_label(source, meet)
      source[:meet_labels][meet] || meet.split("-").map(&:capitalize).join(" ")
    end
  end
end

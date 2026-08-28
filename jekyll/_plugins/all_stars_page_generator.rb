# Generates one page per school year for the Bay State Conference All-Stars
# (sports/swimming-diving/awards/bsc/all-stars/YYYY-YYYY/) straight
# from the Year column of _data/.../all-stars.csv, so adding a new season's
# entries to the CSV is enough on its own — no matching .md file to remember.
# A year with no rows simply has no page yet; add its first entry and the
# page appears on the next build.
#
# Also exposes site.data["all_star_years"] (newest first, en-dash titles) so
# the index page's directory listing stays in sync with the CSV too, instead
# of being a hand-maintained internal_links list.
module Awards
  class AllStarsPageGenerator < Jekyll::Generator
    safe true

    DATA_PATH = %w[swimming-diving bsc awards all-stars].freeze
    DIR = "sports/swimming-diving/awards/bsc/all-stars".freeze

    def generate(site)
      entries = DATA_PATH.reduce(site.data) { |data, key| data[key] || {} }
      years = entries.map { |entry| entry["Year"] }.compact.uniq.sort.reverse

      site.data["all_star_years"] = years.map do |year|
        { "title" => en_dash(year), "url" => "/#{DIR}/#{year}/" }
      end

      years.each do |year|
        page = Jekyll::PageWithoutAFile.new(site, site.source, DIR, "#{year}.html")
        page.content = ""
        page.data.merge!(
          "layout" => "bsc-all-star",
          "title" => "#{en_dash(year)} All-Stars",
          "permalink" => "/#{DIR}/#{year}/",
          "breadcrumb" => year,
          "year" => year
        )
        site.pages << page
      end
    end

    private

    def en_dash(year)
      year.sub("-", "–")
    end
  end
end

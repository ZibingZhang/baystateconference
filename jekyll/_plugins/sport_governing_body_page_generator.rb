# Generates the /<sport>/organizations/miaa/ and /<sport>/organizations/nfhs/
# hub pages straight from _data/sports.yaml, so adding a new sport (or a new
# governing body link for an existing one) is enough on its own - no matching
# miaa/index.md or nfhs/index.md file to remember. A sport with no
# external_links.<body> entry (e.g. Rugby has no "nfhs", since NFHS doesn't
# sanction it) simply gets no page for that body.
#
# Each generated page's body is just `{% include miaa.md %}` (or nfhs.md) -
# the same shared include used before these pages were generated - plus, if
# set, that sport's page_content.about.<body> freeform content from the data
# file. See the comment atop _data/sports.yaml for the full field reference.
#
# Generated pages skip Jekyll's normal front-matter-defaults pass (there's no
# YAML front matter to read), so the `nav: <sport>` values set in
# _config.yaml's `defaults:` scopes never apply to them the way they do for
# hand-written pages under sports/<sport>/. Set it explicitly here instead,
# falling back to the sport-agnostic nav if that sport has no nav data file
# of its own yet.
module SportGoverningBody
  class PageGenerator < Jekyll::Generator
    safe true

    TITLES = {
      "miaa" => "Massachusetts Interscholastic Athletic Association",
      "nfhs" => "National Federation of State High School Associations",
    }.freeze

    def generate(site)
      sports = site.data["sports"] || []

      sports.each do |sport|
        slug = sport["url"].to_s.delete_prefix("/").delete_suffix("/")
        slug = "#{slug}/organizations"
        external_links = sport["external_links"] || {}

        TITLES.each do |body, title|
          next unless external_links[body]

          site.pages << build_page(site, sport, slug, body, title)
        end
      end
    end

    private

    def build_page(site, sport, slug, body, title)
      dir = "#{slug}/#{body}"
      page = Jekyll::PageWithoutAFile.new(site, site.source, dir, "index.md")
      page.content = page_content(sport, body)
      page.data.merge!(
        "layout" => "page",
        "title" => title,
        "permalink" => "/#{dir}/"
      )

      sport_slug = sport["url"].to_s.split("/").last
      page.data["nav"] = sport_slug if site.data.dig("navigation", sport_slug)

      page
    end

    def page_content(sport, body)
      content = +"{% include #{body}.md %}\n"

      extra = sport.dig("page_content", "about", body)
      content << "\n#{extra}\n" if extra

      content
    end
  end
end

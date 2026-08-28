# Generates the /<sport>/miaa/ and /<sport>/nfhs/ "About" hub pages straight
# from _data/sports.yaml, so adding a new sport (or a new governing body link
# for an existing one) is enough on its own - no matching miaa/index.md or
# nfhs/index.md file to remember. A sport with no external_links.<body> entry
# (e.g. Rugby has no "nfhs", since NFHS doesn't sanction it) simply gets no
# page for that body.
#
# Each generated page's body is just `{% include miaa.md %}` (or nfhs.md) -
# the same shared include used before these pages were generated - plus, if
# set, that sport's page_content.about.<body> freeform content from the data
# file. See the comment atop _data/sports.yaml for the full field reference.
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

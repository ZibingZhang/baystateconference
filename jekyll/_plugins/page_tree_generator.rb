# Builds a nested tree of every generated HTML page from their URLs, for the
# site map page (swimming-diving/directory.md) to render as an actual
# expandable folder structure. Doing this as a flat-to-nested walk in Liquid
# would mean hand-rolling a stack machine with no real recursion or mutable
# state to lean on; a Jekyll generator gets a straightforward tree in a dozen
# lines of Ruby instead, exposed to Liquid as plain data via site.data.
#
# Each node: { "segment" => "emisca", "url" => "/swimming-diving/emisca/" or
# nil, "title" => "...", "children" => [...] }. A node has a url/title only
# when that path segment is itself a real page (e.g. "emisca" is both a page
# and a folder containing "awards"); segments that are pure path components
# with no page of their own (rare on this site) are folders with a nil url.
#
# A page can set `sitemap: false` in its front matter to be left out
# entirely — e.g. individual qualifying-standards seasons shouldn't each get
# listed, just the index page that links to all of them.
module SiteMap
  class PageTreeGenerator < Jekyll::Generator
    safe true
    priority :low

    EXCLUDED_URLS = ["/404.html", "/swimming-diving/directory/"].freeze

    def generate(site)
      root = new_node("")

      site.pages.each do |page|
        next unless page.output_ext == ".html"
        next if page.data["redirect_to"]
        next if page.data["sitemap"] == false
        next if EXCLUDED_URLS.include?(page.url)

        segments = page.url.split("/").reject(&:empty?)
        next if segments.empty?

        node = segments.reduce(root) do |current, segment|
          current["children"].find { |child| child["segment"] == segment } || begin
            child = new_node(segment)
            current["children"] << child
            child
          end
        end

        node["url"] = page.url
        node["title"] = page.data["title"] || page.url
      end

      sort_children!(root)
      site.data["page_tree"] = root["children"]
    end

    private

    def new_node(segment)
      { "segment" => segment, "url" => nil, "title" => nil, "children" => [] }
    end

    def sort_children!(node)
      node["children"].sort_by! { |child| child["segment"] }
      node["children"].each { |child| sort_children!(child) }
    end
  end
end

# Builds a nested tree of every generated HTML page from their URLs, for the
# site map page (resources/directory.md) to render as an actual
# expandable folder structure. Doing this as a flat-to-nested walk in Liquid
# would mean hand-rolling a stack machine with no real recursion or mutable
# state to lean on; a Jekyll generator gets a straightforward tree in a dozen
# lines of Ruby instead, exposed to Liquid as plain data via site.data.
#
# Each node: { "segment" => "emisca", "url" => "/sports/swimming-diving/emisca/" or
# nil, "title" => "...", "breadcrumb" => "..." or nil, "sort" => "desc" or nil,
# "label" => "...", "acronym_label" => "...", "matched_acronym" => true/false,
# "children" => [...] }. A node has a url/title only when that path segment is
# itself a real page (e.g. "emisca" is both a page and a folder containing
# "awards"); segments that are pure path components with no page of their own
# (rare on this site) are folders with a nil url. "breadcrumb" mirrors the
# page's own `breadcrumb` front matter (see _includes/breadcrumbs.html),
# exposed here so directory-listing.html can label a child the same short way
# its own breadcrumb trail would. "label" is "breadcrumb" if set, else
# "acronym_label" - the precedence breadcrumbs.html uses for every ancestor
# crumb and directory-listing.html uses for a folder's own summary.
# "acronym_label"/"matched_acronym" come from title-casing the segment, with
# any whole-segment or per-word override from _data/acronyms.yaml applied
# (see url-label.html) - directory-listing.html falls back to a child's own
# "title" when neither "breadcrumb" nor an acronym match applies, the same
# precedence breadcrumbs.html uses for a page's own (last) crumb.
#
# "sort" mirrors a page's own `default_sort: desc` front matter, letting a
# folder of generated children (e.g. school-year pages, newest added last)
# list newest-first instead of the default ascending-by-segment order -
# without that flag, alphabetical/numeric segments like "1972-1973" would
# list oldest-first.
#
# A page with `exclude_from_directory: true` in its front matter is skipped
# entirely, so it never appears in a parent's directory-listing.html nor in
# the sitewide resources/directory.md tree - for a page meant to be reachable
# only by direct link (or from within a page that isn't itself part of this
# tree). This is independent of jekyll-sitemap's own `sitemap: false`, so a
# page can be hidden from both directories while still appearing in
# sitemap.xml.
#
# Besides building that tree, this generator also precomputes, for every HTML
# page, the data breadcrumbs.html and directory-listing.html need to render
# themselves: each page's ancestor crumbs (`page.breadcrumb_ancestors`, an
# array of {"label", "path"}), its own crumb's acronym fallback
# (`page.breadcrumb_current_label`/`breadcrumb_current_matched_acronym`), and
# its directory children (`page.directory_nodes`). Those two includes used to
# recompute this by walking site.data.page_tree from the root in Liquid on
# every render (802 times for breadcrumbs.html alone) - slow, since Liquid's
# per-tag interpretation overhead dwarfs the cost of the walk itself. Doing
# the walk once per page here in Ruby, during the already-fast GENERATE
# phase, and handing the includes a flat array to iterate removed most of
# that cost (see the commit that introduced this for before/after numbers).
module SiteMap
  class PageTreeGenerator < Jekyll::Generator
    safe true
    priority :low

    EXCLUDED_URLS = ["/404.html", "/resources/directory/"].freeze

    def generate(site)
      root = new_node("")

      site.pages.each do |page|
        next unless page.output_ext == ".html"
        next if page.data["redirect_to"]
        next if page.data["exclude_from_directory"]
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
        node["breadcrumb"] = page.data["breadcrumb"]
        node["sort"] = page.data["default_sort"]
      end

      sort_children!(root)

      acronyms = site.data["acronyms"] || {}
      assign_labels!(root, acronyms)
      site.data["page_tree"] = root["children"]

      attach_breadcrumb_data(site, root, acronyms)
    end

    private

    def new_node(segment)
      {
        "segment" => segment,
        "url" => nil,
        "title" => nil,
        "breadcrumb" => nil,
        "sort" => nil,
        "label" => nil,
        "acronym_label" => nil,
        "matched_acronym" => false,
        "children" => [],
      }
    end

    def sort_children!(node)
      node["children"].sort_by! { |child| child["segment"] }
      node["children"].reverse! if node["sort"] == "desc"
      node["children"].each { |child| sort_children!(child) }
    end

    def assign_labels!(node, acronyms)
      label, matched = acronym_label(node["segment"], acronyms)
      node["acronym_label"] = label
      node["matched_acronym"] = matched
      node["label"] = node["breadcrumb"] || label
      node["children"].each { |child| assign_labels!(child, acronyms) }
    end

    # Mirrors url-label.html: a whole-segment override from acronyms.yaml
    # wins outright, otherwise each hyphen-separated word is either replaced
    # by its own acronyms.yaml entry or title-cased.
    def acronym_label(segment, acronyms)
      full_override = acronyms[segment]
      return [full_override, true] if full_override

      matched = false
      words = segment.split("-").map do |word|
        override = acronyms[word]
        if override
          matched = true
          override
        else
          word.capitalize
        end
      end
      [words.join(" "), matched]
    end

    # Breadcrumbs render for every HTML page regardless of its own
    # exclude_from_directory/redirect_to status - only whether an *ancestor*
    # segment made it into the tree above matters, so this walks site.pages
    # again rather than reusing the exclusion-filtered loop above.
    def attach_breadcrumb_data(site, root, acronyms)
      site.pages.each do |page|
        next unless page.output_ext == ".html"

        segments = page.url.split("/").reject(&:empty?)
        next if segments.empty?

        ancestors = []
        path = ""
        cursor = root["children"]

        segments.each_with_index do |segment, index|
          path += "/#{segment}"
          match = cursor&.find { |child| child["segment"] == segment }
          cursor = match && match["children"]

          next if index == segments.length - 1

          label = match ? match["label"] : acronym_label(segment, acronyms).first
          ancestors << { "label" => label, "path" => path }
        end

        current_label, current_matched = acronym_label(segments.last, acronyms)

        page.data["breadcrumb_ancestors"] = ancestors
        page.data["breadcrumb_current_label"] = current_label
        page.data["breadcrumb_current_matched_acronym"] = current_matched
        page.data["directory_nodes"] = cursor || []
      end
    end
  end
end

# Precomputes the rendered HTML for each named nav bar (one Liquid render
# per entry in _data/navigation/, e.g. ~26) instead of letting header.html's
# {% include nav-items.html %} re-render the same markup on every one of the
# site's 1391+ pages - nav-items.html's output depends only on which nav bar
# a page uses (page.nav / the per-path default in _config.yaml), never on
# the page itself, so almost all of those renders are literally identical
# output. header.html looks up the cached HTML by nav name instead of
# including the template directly. See the commit that introduced
# page_tree_generator.rb's breadcrumb precomputation for the same rationale
# applied to breadcrumbs.
module SiteMap
  class NavigationRenderer < Jekyll::Generator
    safe true
    priority :low

    NAV_ITEMS_INCLUDE = "_includes/nav-items.html"

    def generate(site)
      template = Liquid::Template.parse(File.read(site.in_source_dir(NAV_ITEMS_INCLUDE)))

      rendered = {}
      (site.data["navigation"] || {}).each do |nav_name, nav|
        rendered[nav_name] = template.render!(
          { "include" => { "nav" => nav } },
          :registers => { :site => site }
        )
      end

      site.data["rendered_nav"] = rendered
    end
  end
end

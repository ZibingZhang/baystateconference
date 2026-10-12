# Generates, for every sport in _data/sports.yaml (except Swimming & Diving,
# which already has these hand-authored under
# sports/swimming-diving/schools/ with its own pool/instagram info_extra):
#   sports/<sport-slug>/schools/              - a directory listing of that
#     sport's school pages (via directory-listing.html, same as swimming's
#     hand-written schools/index.md)
#   sports/<sport-slug>/schools/<school-slug>/ - that one school's page
#     (layout: school), same shape as the generic /schools/<school-slug>/
#     pages but scoped under the sport, with `sport_slug` set so the layout
#     also renders that school's `sport.<sport-slug>` data generically (see
#     sport-info-rows.html) - a sport-specific fact just needs a key under
#     the school in schools.yaml, no partial to write.
#
# Built from _data/sports.yaml and _data/schools.yaml, so a new sport or
# school just needs a data entry - no page to hand-write.
module SportSchool
  class PageGenerator < Jekyll::Generator
    safe true

    EXCLUDED_SPORT_SLUGS = ["swimming-diving"].freeze

    def generate(site)
      sports = site.data["sports"] || []
      schools = site.data["schools"] || []

      sports.each do |sport|
        slug = sport_slug(sport)
        next if EXCLUDED_SPORT_SLUGS.include?(slug)

        dir = "sports/#{slug}/schools"
        site.pages << build_index_page(site, dir, sport)

        schools.each do |school|
          site.pages << build_school_page(site, dir, slug, school)
        end
      end
    end

    private

    def sport_slug(sport)
      sport["url"].to_s.delete_prefix("/sports/").delete_suffix("/")
    end

    def build_index_page(site, dir, sport)
      page = Jekyll::PageWithoutAFile.new(site, site.source, dir, "index.html")
      page.content = "{% include directory-listing.html %}"
      page.data.merge!(
        "layout" => "page",
        "title" => "#{sport['title']} Schools",
        "permalink" => "/#{dir}/",
        "breadcrumb" => "Schools"
      )
      page
    end

    def build_school_page(site, dir, sport_slug, school)
      school_slug = Jekyll::Utils.slugify(school["town"].to_s)
      school_dir = "#{dir}/#{school_slug}"
      page = Jekyll::PageWithoutAFile.new(site, site.source, school_dir, "index.html")
      page.content = ""
      page.data.merge!(
        "layout" => "school",
        "title" => school["school-name"],
        "permalink" => "/#{school_dir}/",
        "breadcrumb" => school["town"],
        "school" => school["town"],
        "sport_slug" => sport_slug
      )
      page
    end
  end
end

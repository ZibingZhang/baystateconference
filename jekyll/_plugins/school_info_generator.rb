# Attaches each `layout: school` page's corresponding _data/schools.yaml
# record to page.data["school_info"], replacing the
# `site.data.schools | where: 'town', page.school | first` Liquid scan
# school.html ran on every render (260 pages) with one Ruby pass over
# site.data["schools"] (10 entries) done here instead.
#
# Must run at :low priority, same as page_tree_generator.rb and for the
# same reason: sport_school_page_generator.rb's 240 generated school pages
# don't exist in site.pages yet during the :normal-priority generate pass
# that creates them, unless this runs after it.
module SchoolInfo
  class Generator < Jekyll::Generator
    safe true
    priority :low

    def generate(site)
      schools_by_town = {}
      (site.data["schools"] || []).each do |school|
        schools_by_town[school["town"]] ||= school # first match wins, matching Liquid's `| first`
      end

      site.pages.each do |page|
        next unless page.data["layout"] == "school"

        page.data["school_info"] = schools_by_town[page.data["school"]]
      end
    end
  end
end

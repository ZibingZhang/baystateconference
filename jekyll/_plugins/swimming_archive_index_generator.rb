# Builds the swimming/diving file-browser's index.json at every site build,
# by generating the Documents branch from the flat, explicitly-tagged
# entries in _data/file-browser/sports/swimming-diving/archive/files.json
# and adding them onto the hand-maintained base tree in
# _data/file-browser/sports/swimming-diving/archive/index.json (currently
# just "Other Sites" - a flat list of external links that only ever need to
# appear once, so there's no tagging/multi-indexing for them to benefit
# from). Lets jekyll/assets/js/file-browser.js and
# jekyll/_includes/file-browser.html stay untouched - this only ever needs
# to reproduce the same nested-folder tree shape they already expect.
#
# Each files.json entry carries an s3Path plus explicit "year"/"season"
# fields and a "tags" array holding exactly one document-type/"results" tag
# and (when relevant) exactly one meet tag. s3Path itself is never inspected
# here: it's just an opaque storage locator that may change independently of
# this metadata, so every fact the tree needs is duplicated onto the entry
# as a tag/field instead of being parsed back out of it.
#
# "Results" is a document type like any other, so every results entry shows
# up under Documents > By Type > Results and Documents > By School Year
# alongside the rest. Documents > By Meet and Documents > By Meet and School
# Year are both meet-centric views spanning every document type: a document
# shows up there whenever it carries a meet tag (e.g. a Sectionals-specific
# Psych Sheet), not just results.
#
# The standalone, top-level Results folder is a separate, narrower view
# scoped to "results"-tagged entries only (its By Meet and By School Year),
# except for its own By Meet and School Year, which - like Documents' - is
# every meet-tagged document, so season-wide documents (e.g. the Format
# PDFs) correctly stay out of it while a Sectionals-specific Psych Sheet
# still shows up alongside that meet's results.

require "json"

module SwimmingArchiveIndex
  class PageGenerator < Jekyll::Generator
    safe true

    TAGGED_FILES_DATA_PATH = %w[file-browser sports swimming-diving archive files files].freeze
    BASE_DATA_PATH = %w[file-browser sports swimming-diving archive index files].freeze
    OUTPUT_DIR = "assets/data/file-browser/sports/swimming-diving/archive".freeze

    DOCUMENT_TYPE_DISPLAY_NAMES = {
      "qualifying-standards" => "Qualifying Standards",
      "format" => "Swimming & Diving Format",
      "schedules" => "Schedules",
      "logistics" => "Logistics",
      "administrative" => "Administrative",
      "reference" => "Reference",
      "psych-sheets" => "Psych Sheets",
      "programs" => "Programs",
      "athletes" => "Athletes",
      "entries" => "Entries",
      "entry-order" => "Entry Order",
      "list-of-teams" => "List of Teams",
      "all-stars" => "All-Stars",
      "team-scores" => "Team Scores",
      "heat-sheets" => "Heat Sheets",
      "diving-entries" => "Diving Entries",
      "results" => "Results",
    }.freeze

    VALID_TYPE_TAGS = DOCUMENT_TYPE_DISPLAY_NAMES.keys.freeze

    MEET_DISPLAY_NAMES = {
      "bay-state-conference" => "Bay State Conference",
      "sectionals" => "Sectionals",
      "states" => "States",
    }.freeze

    # The substring actually worth stripping out of a file's own name when
    # it's already sitting in that meet's folder - not always the same as
    # the display name above, since names use inconsistent phrasing (e.g.
    # singular "State"/"Sectional", not "States"/"Sectionals"). Naive and
    # best-effort: if an entry's name doesn't happen to contain this exact
    # text (e.g. a Bay State Conference entry just named after the host
    # school, or a "Western Mass" sectional), it's left alone.
    MEET_NAME_STRIP_TERMS = {
      "bay-state-conference" => "Bay State Conference",
      "sectionals" => "Sectional",
      "states" => "State",
    }.freeze

    SEASON_LABELS = { "fall" => "Fall", "winter" => "Winter" }.freeze
    SEASON_ORDER = { "fall" => 0, "winter" => 1 }.freeze

    def generate(site)
      entries = site.data.dig(*TAGGED_FILES_DATA_PATH) || []
      validate!(entries)
      base_files = site.data.dig(*BASE_DATA_PATH) || []

      tree = {
        "files" => [
          documents_folder(entries),
          results_folder(entries),
          *base_files,
        ],
      }

      site.pages << build_json_page(site, tree)
    end

    private

    def build_json_page(site, tree)
      page = Jekyll::PageWithoutAFile.new(site, site.source, OUTPUT_DIR, "index.json")
      page.content = JSON.pretty_generate(tree)
      page.data.merge!("layout" => nil, "permalink" => "/#{OUTPUT_DIR}/index.json")
      page
    end

    def validate!(entries)
      errors = []

      entries.each_with_index do |entry, i|
        unless entry.key?("s3Path")
          errors << "entry #{i} (#{entry['name']}): missing \"s3Path\""
          next
        end

        tags = entry["tags"] || []

        unless entry["year"].to_s.match?(/\A\d{4}-\d{4}\z/)
          errors << "entry #{i} (#{entry['name']}): missing/invalid \"year\""
        end
        unless SEASON_LABELS.key?(entry["season"])
          errors << "entry #{i} (#{entry['name']}): missing/invalid \"season\""
        end

        unknown = tags - VALID_TYPE_TAGS - MEET_DISPLAY_NAMES.keys
        errors << "entry #{i} (#{entry['name']}): unknown tag(s) #{unknown}" if unknown.any?

        type_tags = tags & VALID_TYPE_TAGS
        if type_tags.length != 1
          errors << "entry #{i} (#{entry['name']}): expected exactly one type tag, got #{type_tags}"
        end

        meet_tags = tags & MEET_DISPLAY_NAMES.keys
        errors << "entry #{i} (#{entry['name']}): expected at most one meet tag, got #{meet_tags}" if meet_tags.length > 1
        if type_tags == ["results"] && meet_tags.empty?
          errors << "entry #{i} (#{entry['name']}): \"results\" entries require a meet tag"
        end
      end

      raise "Invalid jekyll/_data/file-browser/.../archive/files.json:\n#{errors.join("\n")}" if errors.any?
    end

    def type_tag(entry)
      ((entry["tags"] || []) & VALID_TYPE_TAGS).first
    end

    def meet_tag(entry)
      ((entry["tags"] || []) & MEET_DISPLAY_NAMES.keys).first
    end

    def leaf_for(entry, strip_year: false, strip_season: false, strip_meet: nil)
      name = entry["name"]
      name = name.sub(entry["year"], "") if strip_year
      name = name.sub(SEASON_LABELS[entry["season"]], "") if strip_season && SEASON_LABELS[entry["season"]]
      name = name.sub(MEET_NAME_STRIP_TERMS[strip_meet], "") if strip_meet && MEET_NAME_STRIP_TERMS[strip_meet]
      { "name" => name.gsub(/\s+/, " ").strip, "s3Path" => entry["s3Path"] }
    end

    def sort_key(entry)
      [entry["year"], SEASON_ORDER[entry["season"]] || 99, entry["name"]]
    end

    def year_folders_for(entries)
      by_year = entries.group_by { |e| e["year"] }
      years = by_year.keys.sort
      folder_children = years.map do |year|
        { "name" => year, "files" => by_year[year].sort_by { |e| sort_key(e) }.map { |e| leaf_for(e, strip_year: true) } }
      end
      { "name" => "By School Year", "sort" => "desc", "files" => folder_children }
    end

    def documents_folder(entries)
      by_type = DOCUMENT_TYPE_DISPLAY_NAMES.filter_map do |slug, display_name|
        matching = entries.select { |e| type_tag(e) == slug }
        next if matching.empty?

        flat_type_folder(display_name, matching)
      end

      {
        "name" => "Documents",
        "files" => [
          { "name" => "By Type", "files" => by_type },
          year_folders_for(entries),
          by_meet_folder(entries),
          by_meet_and_school_year_folder(entries),
        ],
      }
    end

    def flat_type_folder(display_name, matching)
      { "name" => display_name, "sort" => "desc", "files" => matching.sort_by { |e| sort_key(e) }.map { |e| leaf_for(e) } }
    end

    def flat_by_meet(entries)
      MEET_DISPLAY_NAMES.filter_map do |slug, meet_name|
        matching = entries.select { |e| meet_tag(e) == slug }
        next if matching.empty?

        { "name" => meet_name, "sort" => "desc", "files" => matching.sort_by { |e| sort_key(e) }.map { |e| leaf_for(e, strip_meet: slug) } }
      end
    end

    def by_meet_folder(entries)
      { "name" => "By Meet", "files" => flat_by_meet(entries) }
    end

    def results_folder(entries)
      results = entries.select { |e| type_tag(e) == "results" }

      {
        "name" => "Results",
        "files" => [
          { "name" => "By Meet", "files" => flat_by_meet(results) },
          year_folders_for(results),
          by_meet_and_school_year_folder(entries),
        ],
      }
    end

    def by_meet_and_school_year_folder(entries)
      by_meet_and_school_year = MEET_DISPLAY_NAMES.filter_map do |slug, meet_name|
        matching = entries.select { |e| meet_tag(e) == slug }
        next if matching.empty?

        by_year_season = matching.group_by { |e| [e["year"], e["season"]] }
        subfolders = by_year_season.keys.sort.map do |year, season|
          {
            "name" => "#{year} #{SEASON_LABELS[season]}",
            "files" => by_year_season[[year, season]].sort_by { |e| sort_key(e) }.map { |e| leaf_for(e, strip_year: true, strip_season: true, strip_meet: slug) },
          }
        end

        { "name" => meet_name, "sort" => "desc", "files" => subfolders }
      end

      { "name" => "By Meet and School Year", "files" => by_meet_and_school_year }
    end
  end
end

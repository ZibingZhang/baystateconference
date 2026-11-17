# Turns a school's flat `instagram` list (see _data/schools.yaml's comment
# for the entry shape: url + optional sport/gender/level/tags) into the rows
# a school page actually renders, for each of three mutually-exclusive
# contexts:
#   - the athletic department's own account(s) - tagged "athletic-department",
#     shown once on every page regardless of sport
#   - a sport's team-wide account(s) - `sport` matches, no `gender` tag,
#     shown once above any gender sections
#   - a sport's gender-specific account(s) - `sport` matches and `gender`
#     equals the section being rendered (case-insensitively, since `gender`
#     is lowercase "boys"/"girls" but section names - also used as display
#     headers - are capitalized "Boys"/"Girls")
#
# Doing the tag-matching and label-building here in Ruby, rather than with
# nested Liquid includes, is deliberate: Jekyll's `include` tag doesn't
# isolate Liquid variable scope (an `assign` inside an included template
# leaks back into its caller), which already caused one real bug when a
# previous version of this rendering lived in a recursive Liquid include.
# Returning a plain array of rows keeps the template side a flat, single-
# level `{% for %}` loop with no assigns to clobber - see
# _includes/instagram-rows.html.
module InstagramRowsFilter
  DEPARTMENT_TAG = "athletic-department"
  GENDER_DISPLAY_ORDER = %w[girls boys].freeze

  def instagram_department_rows(instagram)
    rows_for(instagram) { |entry| tags_for(entry).include?(DEPARTMENT_TAG) }
  end

  def instagram_sport_rows(instagram, sport_slug, gender = nil)
    rows_for(instagram) do |entry|
      Array(entry["sport"]).include?(sport_slug) &&
        (gender.nil? ? entry["gender"].nil? : entry["gender"].to_s.casecmp?(gender.to_s))
    end
  end

  # A sport only needs an explicit `sections` map in schools.yaml when it has
  # non-Instagram content to group by gender too (e.g. swim's win-count
  # section_extra, which can apply to a gender with no Instagram account at
  # all). Otherwise the gender split is already fully described by whichever
  # genders actually show up among that sport's Instagram entries, so this
  # builds the same shape sport-info-sections.html already expects
  # (section name => facts hash, here always empty) straight from that list -
  # no need for a schools.yaml stub whose only job is flagging "yes, render
  # Girls/Boys headers here."
  def instagram_section_names(instagram, sport_slug)
    return {} unless instagram

    present = instagram.filter_map { |entry| entry["gender"]&.downcase if Array(entry["sport"]).include?(sport_slug) }.uniq
    ordered = GENDER_DISPLAY_ORDER.select { |gender| present.include?(gender) }
    ordered += (present - GENDER_DISPLAY_ORDER).sort
    ordered.each_with_object({}) { |gender, hash| hash[humanize(gender)] = {} }
  end

  private

  def rows_for(instagram)
    return [] unless instagram

    instagram.select { |entry| yield entry }.map { |entry| row_for(entry) }
  end

  def row_for(entry)
    tags = tags_for(entry)
    is_department = tags.include?(DEPARTMENT_TAG)
    base_label = is_department ? "A.D. Instagram" : "Instagram"

    suffix = [entry["level"], *(tags - [DEPARTMENT_TAG])].compact.map { |word| humanize(word) }
    label = suffix.empty? ? base_label : "#{base_label} (#{suffix.join(', ')})"

    {
      "label" => label,
      "url" => entry["url"],
      "username" => entry["url"].split("/")[3]
    }
  end

  def tags_for(entry)
    Array(entry["tags"])
  end

  def humanize(word)
    word.to_s.split(/[-_]/).map { |part| part.capitalize }.join(" ")
  end
end

Liquid::Template.register_filter(InstagramRowsFilter)

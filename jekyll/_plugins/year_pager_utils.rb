# Shared by every page generator that chains a run of year pages together
# with previous/next/oldest/latest links for year-pager.html (all_stars,
# dual_meet_results, meet_sheets, qualifying_standards, schedule,
# school_schedule) - computes that eight-key link hash once per page from a
# newest-first `years` list and the current year's index in it, so each
# generator supplies only how a year becomes a URL/title.
module YearPagerUtils
  module_function

  # `years` must be newest-first and `index` the current page's index into
  # it - every caller already has both while building that page (from its
  # own `each_with_index`), so this never re-derives them and stays O(1)
  # per page rather than O(years) or worse.
  def links(years, index, title_for:, url_for:)
    year = years[index]
    oldest_year = years.last
    latest_year = years.first
    previous_year = years[index + 1]
    next_year = index.zero? ? nil : years[index - 1]

    {
      "previous_url" => previous_year && url_for.call(previous_year),
      "previous_title" => previous_year && title_for.call(previous_year),
      "next_url" => next_year && url_for.call(next_year),
      "next_title" => next_year && title_for.call(next_year),
      "oldest_url" => (year != oldest_year) && url_for.call(oldest_year),
      "oldest_title" => (year != oldest_year) && title_for.call(oldest_year),
      "latest_url" => (year != latest_year) && url_for.call(latest_year),
      "latest_title" => (year != latest_year) && title_for.call(latest_year)
    }
  end
end

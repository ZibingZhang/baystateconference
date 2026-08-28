{%- comment -%}
  Shared "About > NFHS" content for every sport. Included from the page each
  sport_governing_body_page_generator.rb generates at /<sport>/nfhs/ (not
  used as a `layout:`, since Jekyll layouts are only Liquid-rendered and
  never passed through the Markdown converter - the footnote/bold syntax
  below needs to go through kramdown, which only happens for content
  included into a page's own body).

  Looks up the current sport's entry in site.data.sports (matched by the
  page's own first URL segment, e.g. "/baseball/nfhs/" -> "/baseball/") to
  render its Resources links (external_links.nfhs) and, if present, a
  Directory section of internal_links.nfhs - see the field reference atop
  _data/sports.yaml.
{%- endcomment -%}
{%- assign url_segments = page.url | split: "/" -%}
{%- assign sport_slug = url_segments[1] -%}
{%- assign sport_url = "/" | append: sport_slug | append: "/" -%}
{%- assign sport = site.data.sports | where: "url", sport_url | first -%}

The __National Federation of State High School Associations (NFHS)__ is the national governing body that writes the playing rules for high school sports and activities across the United States. Its membership is made up of the individual state athletic associations, such as the MIAA.[^1]

[^1]: <https://en.wikipedia.org/wiki/National_Federation_of_State_High_School_Associations>

{% include link-list.html heading="Resources" items=sport.external_links.nfhs %}

{% include link-list.html heading="Directory" items=sport.internal_links.nfhs %}

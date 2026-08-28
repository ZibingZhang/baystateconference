{%- comment -%}
  Shared "About > MIAA" content for every sport. Included from the page each
  sport_governing_body_page_generator.rb generates at /<sport>/miaa/ (not
  used as a `layout:`, since Jekyll layouts are only Liquid-rendered and
  never passed through the Markdown converter - the footnote/bold syntax
  below needs to go through kramdown, which only happens for content
  included into a page's own body).

  Looks up the current sport's entry in site.data.sports (matched by the
  page's own first URL segment, e.g. "/baseball/miaa/" -> "/baseball/") to
  render its Resources links (external_links.miaa) and, if present, a
  Directory section of internal_links.miaa - see the field reference atop
  _data/sports.yaml.
{%- endcomment -%}
{%- assign url_segments = page.url | split: "/" -%}
{%- assign sport_slug = url_segments[1] -%}
{%- assign sport_url = "/" | append: sport_slug | append: "/" -%}
{%- assign sport = site.data.sports | where: "url", sport_url | first -%}

The __Massachusetts Interscholastic Athletic Association (MIAA)__ is the governing body for interscholastic sports among public and most private secondary schools in Massachusetts. Member schools are grouped into leagues and conferences, like the Bay State Conference, which handle regular-season scheduling, while the MIAA oversees postseason tournament play statewide.[^1]

[^1]: <https://en.wikipedia.org/wiki/Massachusetts_Interscholastic_Athletic_Association>

{% include link-list.html heading="Resources" items=sport.external_links.miaa %}

{% include link-list.html heading="Directory" items=sport.internal_links.miaa %}

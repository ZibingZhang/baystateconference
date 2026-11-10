---
layout: page
title: Sectional Championship Meets
permalink: /sports/swimming-diving/sectionals/
breadcrumb: Sectionals
countdowns:
  - label: "Sectionals"
    date: "2026-11-08"
external_links:
  - title: MIAA Website
    url: https://www.miaa.net/swimming-diving
resource_links:
  - title: Qualifying Standards
    url: /sports/swimming-diving/resources/miaa-qualifying-standards/
internal_links:
  - title: Archive
    url: /sports/swimming-diving/archive/?path=meet-results/by-meet-and-year/sectionals
  - title: Rankings
    url: /sports/swimming-diving/sectionals/rankings/
  - title: Records
    url: /sports/swimming-diving/sectionals/records/
---

{%- comment -%}
  Placeholder - there's no per-meet results CSV for Sectionals yet (unlike
  BSC's jekyll/_data/swimming-diving/bsc/<year>/<season>/<meet>/*.csv). Once
  that data pipeline exists, this is the seam: add a generator analogous to
  bsc_sheets_page_generator.rb and replace the "Results will be posted..."
  paragraph below with its output.
{%- endcomment -%}

The north and south fall sectional championship meets will take place on November 8th.

Results will be posted after each meet.

{% include link-list.html heading="See Also" items=page.internal_links %}

{% assign resources = page.resource_links | concat: page.external_links %}
{% include link-list.html heading="Resources" items=resources %}

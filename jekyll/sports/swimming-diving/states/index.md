---
layout: page
title: State Championship Meets
permalink: /sports/swimming-diving/states/
breadcrumb: States
countdowns:
  - label: "States"
    date: "2026-11-15T16:45"
external_links:
  - title: MIAA Website
    url: https://www.miaa.net/swimming-diving
resource_links:
  - title: Qualifying Standards
    url: /sports/swimming-diving/resources/miaa-qualifying-standards/
internal_links:
  - title: Archive
    url: /sports/swimming-diving/archive/?path=meet-results/by-meet-and-year/states
  - title: Rankings
    url: /sports/swimming-diving/states/rankings/
  - title: Records
    url: /sports/swimming-diving/states/records/
---

{%- comment -%}
  Placeholder - there's no per-meet results CSV for States yet (unlike
  BSC's jekyll/_data/swimming-diving/bsc/<year>/<season>/<meet>/*.csv). Once
  that data pipeline exists, this is the seam: add a generator analogous to
  bsc_sheets_page_generator.rb and replace the "Results will be posted..."
  paragraph below with its output.
{%- endcomment -%}

The fall state championship meet will take place on November 15th at MIT.

Schedule:

- 3:00 PM: doors open for teams
- 3:30 PM: doors open for spectators
- 4:15 PM: meet starts

Results will be posted after each meet.

{% include link-list.html heading="See Also" items=page.internal_links %}

{% assign resources = page.resource_links | concat: page.external_links %}
{% include link-list.html heading="Resources" items=resources %}

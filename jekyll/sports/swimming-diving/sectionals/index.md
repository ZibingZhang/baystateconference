---
layout: page
title: Sectional Championship Meets
permalink: /sports/swimming-diving/sectionals/
breadcrumb: Sectionals
default_sort: desc
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
    url: /sports/swimming-diving/archive/?path=documents/by-meet-and-season/sectionals
  - title: Rankings
    url: /sports/swimming-diving/sectionals/rankings/
  - title: Records
    url: /sports/swimming-diving/sectionals/records/
---

The north and south fall sectional championship meets will take place on November 8th.

{%- if page.latest_meet_url %}
{% include icon-link.html icon="calendar_month" label="Latest Meet" url=page.latest_meet_url %}
{%- else %}

Results will be posted after each meet.
{%- endif %}

{% include link-list.html heading="See Also" items=page.internal_links %}

{% assign resources = page.resource_links | concat: page.external_links %}
{% include link-list.html heading="Resources" items=resources %}

{% include directory-listing.html heading="Past Meets" searchable=true %}

---
layout: page
title: State Championship Meets
permalink: /sports/swimming-diving/states/
breadcrumb: States
default_sort: desc
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
    url: /sports/swimming-diving/archive/?path=documents/by-meet-and-season/states
  - title: Rankings
    url: /sports/swimming-diving/states/rankings/
  - title: Records
    url: /sports/swimming-diving/states/records/
---

The fall state championship meet will take place on November 15th at MIT.

Schedule:

- 3:00 PM: doors open for teams
- 3:30 PM: doors open for spectators
- 4:15 PM: meet starts

{%- if page.latest_meet_url %}
{% include icon-link.html icon="calendar_month" label="Latest Meet" url=page.latest_meet_url %}
{%- else %}

Results will be posted after each meet.
{%- endif %}

{% include link-list.html heading="See Also" items=page.internal_links %}

{% assign resources = page.resource_links | concat: page.external_links %}
{% include link-list.html heading="Resources" items=resources %}

{% include directory-listing.html heading="Past Meets" searchable=true %}

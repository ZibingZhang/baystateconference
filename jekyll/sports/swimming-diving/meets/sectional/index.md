---
layout: page
title: Sectional Championship Meets
permalink: /sports/swimming-diving/meets/sectional/
breadcrumb: Sectional
default_sort: desc
countdowns:
  - label: "Girls Sectionals"
    date: "2027-02-06T07:00"
  - label: "Boys Sectionals"
    date: "2027-02-07T07:00"
external_links:
  - title: MIAA Website
    url: https://www.miaa.net/swimming-diving
resource_links:
  - title: Qualifying Standards
    url: /sports/swimming-diving/resources/miaa-qualifying-standards/
  - title: MIAA School Abbreviations
    url: /sports/swimming-diving/resources/miaa-school-abbreviations/
internal_links:
  - title: Archive
    url: /sports/swimming-diving/archive/?path=documents/by-meet-and-season/sectional
  - title: Rankings
    url: /sports/swimming-diving/meets/sectional/rankings/
  - title: Records
    url: /sports/swimming-diving/meets/sectional/records/
---

{%- if page.latest_meet_url %}
{% include icon-link.html icon="calendar_month" label="Latest Meet" url=page.latest_meet_url %}
{%- else %}

Results will be posted after each meet.
{%- endif %}

## Meet Schedule

### Girls Sectionals — 2/6/27 at MIT

| | South | North |
| --- | --- | --- |
| Team doors open | 7:00 AM | 2:30 PM |
| Warm-up begins | 7:15 AM | 2:45 PM |
| Spectator doors open | 7:30 AM | 3:00 PM |
| Meet begins | 8:15 AM | 3:45 PM |
| Meet ends (approx.) | 11:15 AM | 6:45 PM |

### Boys Sectionals — 2/7/27 at MIT

| | South | North |
| --- | --- | --- |
| Team doors open | 7:00 AM | 2:30 PM |
| Warm-up begins | 7:15 AM | 2:45 PM |
| Spectator doors open | 7:30 AM | 3:00 PM |
| Meet begins | 8:15 AM | 3:45 PM |
| Meet ends (approx.) | 11:15 AM | 6:45 PM |

{% include link-list.html heading="See Also" items=page.internal_links %}

{% assign resources = page.resource_links | concat: page.external_links %}
{% include link-list.html heading="Resources" items=resources %}

{% include directory-listing.html heading="Past Meets" searchable=true %}

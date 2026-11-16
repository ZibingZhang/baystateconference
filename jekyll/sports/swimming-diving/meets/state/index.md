---
layout: page
title: State Championship Meets
permalink: /sports/swimming-diving/meets/state/
breadcrumb: State
default_sort: desc
countdowns:
  - label: "Girls States"
    date: "2027-02-13T12:00"
  - label: "Boys States"
    date: "2027-02-14T12:00"
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
    url: /sports/swimming-diving/archive/?path=documents/by-meet-and-season/state
  - title: Rankings
    url: /sports/swimming-diving/meets/state/rankings/
  - title: Records
    url: /sports/swimming-diving/meets/state/records/
---

{%- if page.latest_meet_url %}
{% include icon-link.html icon="calendar_month" label="Latest Meet" url=page.latest_meet_url %}
{%- else %}

Results will be posted after each meet.
{%- endif %}

## Meet Schedule

### Girls States — 2/13/27 at BU

|                      | D2       | D1      |
|----------------------|----------|---------|
| Team doors open      | 12:00 PM | 5:00 PM |
| Warm-up begins       | 12:15 PM | 5:15 PM |
| Spectator doors open | 12:30 PM | 5:30 PM |
| Meet begins          | 1:15 PM  | 6:15 PM |
| Meet ends (approx.)  | 4:15 PM  | 9:15 PM |

### Boys States — 2/14/27 at BU

|                      | D2       | D1      |
|----------------------|----------|---------|
| Team doors open      | 12:00 PM | 5:00 PM |
| Warm-up begins       | 12:15 PM | 5:15 PM |
| Spectator doors open | 12:30 PM | 5:30 PM |
| Meet begins          | 1:15 PM  | 6:15 PM |
| Meet ends (approx.)  | 4:15 PM  | 9:15 PM |

{% include link-list.html heading="See Also" items=page.internal_links %}

{% assign resources = page.resource_links | concat: page.external_links %}
{% include link-list.html heading="Resources" items=resources %}

{% include directory-listing.html heading="Past Meets" searchable=true %}

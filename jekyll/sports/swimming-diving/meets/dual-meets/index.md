---
layout: page
title: Dual Meets
permalink: /sports/swimming-diving/meets/dual-meets/
default_sort: desc
internal_links:
  - title: Rankings
    url: /sports/swimming-diving/meets/dual-meets/rankings/
---

{%- assign all_meets = site.data.swimming-diving["dual-meet-results"] -%}
{%- assign school_years = all_meets | map: "School Year" | uniq | sort -%}
{%- assign current_school_year = school_years | last -%}
{%- assign current_meets = all_meets | where: "School Year", current_school_year -%}

{%- assign season_gender_keys = "" | split: "" -%}
{%- for meet in current_meets -%}
  {%- assign key = meet["Season"] | append: "|" | append: meet["Gender"] -%}
  {%- assign season_gender_keys = season_gender_keys | push: key -%}
{%- endfor -%}
{%- assign season_gender_keys = season_gender_keys | uniq -%}

{%- for key in season_gender_keys -%}
  {%- assign parts = key | split: "|" -%}
  {%- assign season = parts[0] -%}
  {%- assign gender = parts[1] -%}
  {%- assign group_meets = current_meets | where: "Season", season | where: "Gender", gender -%}
  {%- assign gender_label = "Girls" -%}
  {%- if gender == "M" -%}
    {%- assign gender_label = "Boys" -%}
  {%- endif -%}
  {%- capture heading -%}{{ gender_label }} {{ season | capitalize }}{%- endcapture -%}
  {%- include dual-meet-results-group.html heading=heading entries=group_meets -%}
{%- endfor -%}

{% include link-list.html heading="See Also" items=page.internal_links %}

{% include directory-listing.html heading="Past Seasons" searchable=true %}

---
layout: page
title: Dual Meets Results
permalink: /sports/swimming-diving/dual-meets/results/
breadcrumb: Results
default_sort: desc
internal_links:
  - title: Rankings
    url: /sports/swimming-diving/dual-meets/rankings/
---

{%- assign all_meets = site.data.swimming-diving["dual-meet-results"] -%}
{%- assign school_years = all_meets | map: "School Year" | uniq | sort -%}
{%- assign current_school_year = school_years | last -%}
{%- assign current_meets = all_meets | where: "School Year", current_school_year -%}

{%- assign season_sex_keys = "" | split: "" -%}
{%- for meet in current_meets -%}
  {%- assign key = meet["Season"] | append: "|" | append: meet["Sex"] -%}
  {%- assign season_sex_keys = season_sex_keys | push: key -%}
{%- endfor -%}
{%- assign season_sex_keys = season_sex_keys | uniq -%}

{%- for key in season_sex_keys -%}
  {%- assign parts = key | split: "|" -%}
  {%- assign season = parts[0] -%}
  {%- assign sex = parts[1] -%}
  {%- assign group_meets = current_meets | where: "Season", season | where: "Sex", sex -%}
  {%- assign sex_label = "Girls" -%}
  {%- if sex == "M" -%}
    {%- assign sex_label = "Boys" -%}
  {%- endif -%}
  {%- capture heading -%}{{ sex_label }} {{ season | capitalize }}{%- endcapture -%}
  {%- include dual-meet-results-group.html heading=heading entries=group_meets -%}
{%- endfor -%}

{% include link-list.html heading="See Also" items=page.internal_links %}

{% include directory-listing.html searchable=true %}

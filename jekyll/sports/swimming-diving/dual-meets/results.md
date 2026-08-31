---
layout: page
title: Dual Meets Results
permalink: /sports/swimming-diving/dual-meets/results/
breadcrumb: Results
internal_links:
  - title: Rankings
    url: /sports/swimming-diving/dual-meets/rankings/
---

{%- assign meets = site.data.swimming-diving["dual-meet-results"] -%}
{%- assign teams = "" | split: "" -%}
{%- for meet in meets -%}
  {%- assign teams = teams | push: meet["Team 1"] -%}
  {%- assign teams = teams | push: meet["Team 2"] -%}
{%- endfor -%}
{%- assign teams = teams | uniq | sort -%}

## Head-to-Head

<table class="dual-meet-matrix">
  <thead>
    <tr>
      <th></th>
      {%- for team in teams -%}
      <th><div class="dual-meet-matrix-vertical-label">{{ team }}</div></th>
      {%- endfor -%}
    </tr>
  </thead>
  <tbody>
    {%- for row_team in teams -%}
    <tr>
      <th>{{ row_team }}</th>
      {%- for col_team in teams -%}
        {%- if row_team == col_team -%}
        <td class="dual-meet-matrix-diagonal">—</td>
        {%- else -%}
          {%- assign match1 = meets | where: "Team 1", row_team | where: "Team 2", col_team -%}
          {%- assign match2 = meets | where: "Team 1", col_team | where: "Team 2", row_team -%}
          {%- assign match = match1 | concat: match2 | first -%}

          {%- assign date_display = match["Date"] | date: "%b %-d, %Y" -%}
          {%- if match["Date"] == nil or match["Date"] == "" -%}
            {%- assign date_display = "date TBD" -%}
          {%- endif -%}

          {%- assign location_display = match["Location"] -%}
          {%- if location_display == nil or location_display == "" -%}
            {%- assign location_display = "location TBD" -%}
          {%- endif -%}

          {%- assign has_score = false -%}
          {%- if match["Team 1 Score"] != nil and match["Team 1 Score"] != "" and match["Team 2 Score"] != nil and match["Team 2 Score"] != "" -%}
            {%- assign has_score = true -%}
          {%- endif -%}

          {%- if has_score -%}
            {%- if match["Team 1"] == row_team -%}
              {%- assign row_score = match["Team 1 Score"] -%}
              {%- assign col_score = match["Team 2 Score"] -%}
            {%- else -%}
              {%- assign row_score = match["Team 2 Score"] -%}
              {%- assign col_score = match["Team 1 Score"] -%}
            {%- endif -%}
            {%- assign row_score_num = row_score | plus: 0 -%}
            {%- assign col_score_num = col_score | plus: 0 -%}
            {%- capture tooltip -%}{{ row_team }} {{ row_score }} – {{ col_team }} {{ col_score }} · {{ date_display }} @ {{ location_display }}{%- endcapture -%}
            {%- if row_score_num > col_score_num -%}
            <td class="dual-meet-matrix-win" tabindex="0" data-tooltip="{{ tooltip | escape }}">{{ row_score }}–{{ col_score }}</td>
            {%- elsif row_score_num < col_score_num -%}
            <td class="dual-meet-matrix-loss" tabindex="0" data-tooltip="{{ tooltip | escape }}">{{ row_score }}–{{ col_score }}</td>
            {%- else -%}
            <td class="dual-meet-matrix-tie" tabindex="0" data-tooltip="{{ tooltip | escape }}">{{ row_score }}–{{ col_score }}</td>
            {%- endif -%}
          {%- else -%}
            {%- capture tooltip -%}{{ row_team }} vs {{ col_team }} · {{ date_display }} @ {{ location_display }}{%- endcapture -%}
            <td class="dual-meet-matrix-tbd" tabindex="0" data-tooltip="{{ tooltip | escape }}"></td>
          {%- endif -%}
        {%- endif -%}
      {%- endfor -%}
    </tr>
    {%- endfor -%}
  </tbody>
</table>

<details class="dual-meet-results">
  <summary>Table View</summary>

  <table>
    <thead>
      <tr>
        <th>Team 1</th>
        <th>Team 2</th>
        <th>Date</th>
        <th>Location</th>
        <th>Team 1 Score</th>
        <th>Team 2 Score</th>
      </tr>
    </thead>
    <tbody>
      {%- for meet in meets -%}
      <tr>
        <td>{{ meet["Team 1"] }}</td>
        <td>{{ meet["Team 2"] }}</td>
        <td>{{ meet["Date"] | date: "%b %-d, %Y" }}</td>
        <td>{{ meet["Location"] }}</td>
        <td>{{ meet["Team 1 Score"] }}</td>
        <td>{{ meet["Team 2 Score"] }}</td>
      </tr>
      {%- endfor -%}
    </tbody>
  </table>
</details>

{% include link-list.html heading="See Also" items=page.internal_links %}

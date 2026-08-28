---
layout: page
title: Dual Meets Results
permalink: /sports/swimming-diving/dual-meets/results/
breadcrumb: Results
internal_links:
  - title: Rankings
    url: /sports/swimming-diving/dual-meets/rankings/
---

{%- assign meets = site.data.swimming-diving["dual-meet-schedule"] -%}

<table>
  <thead>
    <tr>
      <th>Date</th>
      <th>Team 1</th>
      <th>Team 2</th>
      <th>Location</th>
      <th>Score</th>
    </tr>
  </thead>
  <tbody>
    {%- for meet in meets -%}
    <tr>
      <td>{{ meet["Date"] | date: "%b %-d, %Y" }}</td>
      <td>{{ meet["Team 1"] }}</td>
      <td>{{ meet["Team 2"] }}</td>
      <td>{{ meet["Location"] }}</td>
      <td>{{ meet["Score"] | default: "TBD" }}</td>
    </tr>
    {%- endfor -%}
  </tbody>
</table>

{% include link-list.html heading="See Also" items=page.internal_links %}

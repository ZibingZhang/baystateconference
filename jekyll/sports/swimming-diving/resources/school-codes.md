---
layout: page
title: MIAA School Abbreviations
permalink: /sports/swimming-diving/resources/school-codes/
breadcrumb: MIAA School Abbreviations
external_links:
  - title: 2026-2027 School Abbreviations
    url: https://www.miaa.net/sites/default/files/2026-05/2026-2027-school-abbreviations.pdf
---

Results, Psych Sheets, and Heat Sheets identify each athlete's school by its 4-letter MIAA abbreviation rather than its full name.
Use this table to look one up.

{% include link-list.html heading="See Also" items=page.external_links %}

{% assign schools = site.data["high-schools"] | sort: "CODE" %}

<table>
  <thead>
    <tr>
      <th>Code</th>
      <th>School</th>
    </tr>
  </thead>
  <tbody>
    {%- for school in schools -%}
    {%- if school.CODE -%}
    <tr>
      <td>{{ school.CODE }}</td>
      <td>{{ school.School }}</td>
    </tr>
    {%- endif -%}
    {%- endfor -%}
  </tbody>
</table>

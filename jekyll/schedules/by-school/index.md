---
layout: page
title: Schedules by School
permalink: /schedules/by-school/
breadcrumb: By School
---

Every school's current-season schedule (every sport it fields, together).

<div class="directory-browser link-list">
  <ul class="directory-tree">
    {%- for school in site.data.schools -%}
    {%- assign school-slug = school.town | slugify -%}
    {%- if site.data.schools_with_current_season_schedule contains school-slug -%}
    <li class="directory-file">
      <a href="{{ '/schools/' | append: school-slug | append: '/schedule/current-season/' | relative_url }}">
        <span class="material-symbols-outlined" aria-hidden="true">tab</span>
        <span>{{ school.school-name }}</span>
      </a>
    </li>
    {%- endif -%}
    {%- endfor -%}
  </ul>
</div>

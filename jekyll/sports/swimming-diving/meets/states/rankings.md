---
layout: page
title: States Rankings
permalink: /sports/swimming-diving/meets/states/rankings/
breadcrumb: Rankings
exclude_from_directory: true
---

{%- for group in page.groups -%}
{%- include rankings-summary-table.html heading=group.heading years=group.years divisions=group.divisions -%}
{%- endfor -%}

<script src="{{ '/assets/js/collapsible-group.js' | relative_url }}" defer></script>
<script src="{{ '/assets/js/rankings-filter.js' | relative_url }}" defer></script>

---
layout: page
title: Bay State Conference Meet Records
permalink: /sports/swimming-diving/meets/conference/records/
breadcrumb: Records
exclude_from_directory: true
---

{%- assign meet_records = site.data['swimming-diving']['bsc']['meet-records'] -%}
{%- assign girls_fall = meet_records | where: 'Gender', 'F' | where: 'Season', 'Fall' -%}
{%- assign boys_fall = meet_records | where: 'Gender', 'M' | where: 'Season', 'Fall' -%}
{%- assign boys_winter = meet_records | where: 'Gender', 'M' | where: 'Season', 'Winter' -%}

{%- include records-table.html heading="Girls" entries=girls_fall -%}
{%- include records-table.html heading="Boys — Fall" entries=boys_fall -%}
{%- include records-table.html heading="Boys — Winter" entries=boys_winter -%}
<script src="{{ '/assets/js/collapsible-group.js' | relative_url }}" defer></script>

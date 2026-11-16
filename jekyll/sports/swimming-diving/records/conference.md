---
layout: page
title: Bay State Conference Records
permalink: /sports/swimming-diving/records/conference/
breadcrumb: Conference
---

{%- assign records = site.data['swimming-diving']['bsc']['records'] -%}
{%- assign girls = records | where: 'Gender', 'F' -%}
{%- assign boys = records | where: 'Gender', 'M' -%}

{%- include records-table.html heading="Girls" entries=girls -%}
{%- include records-table.html heading="Boys" entries=boys -%}
<script src="{{ '/assets/js/collapsible-group.js' | relative_url }}" defer></script>

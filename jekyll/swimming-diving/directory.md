---
layout: page
title: Site Map
permalink: /swimming-diving/directory/
---

<div class="directory-browser">
  <div class="file-browser-search">
    <span class="fa-solid fa-magnifying-glass" aria-hidden="true"></span>
    <input type="text" class="file-browser-search-input" placeholder="Search files and pages…" aria-label="Search files and pages">
  </div>
  {%- include directory-tree.html nodes=site.data.page_tree -%}
</div>

<script src="{{ '/assets/js/fuzzy-score.js' | relative_url }}" defer></script>
<script src="{{ '/assets/js/directory-search.js' | relative_url }}" defer></script>

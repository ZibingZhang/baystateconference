---
layout: page
title: Directory
permalink: /resources/directory/
---

<div class="directory-browser">
  <div class="file-browser-search">
    <span class="material-symbols-outlined" aria-hidden="true">search</span>
    <input type="text" class="file-browser-search-input" placeholder="Search files and pages…" aria-label="Search files and pages">
    <button type="button" class="directory-expand-toggle" aria-pressed="false" aria-label="Expand all" title="Expand all">
      <span class="material-symbols-outlined" aria-hidden="true">unfold_more</span>
    </button>
  </div>
  {%- include directory-tree.html nodes=site.data.page_tree -%}
</div>

<script src="{{ '/assets/js/fuzzy-score.js' | relative_url }}" defer></script>
<script src="{{ '/assets/js/search-controls.js' | relative_url }}" defer></script>
<script src="{{ '/assets/js/directory-search.js' | relative_url }}" defer></script>

function initLinkListSearch(container) {
  const input = container.querySelector(".file-browser-search-input");
  const sortToggle = container.querySelector(".file-browser-sort-toggle");
  const tagsList = container.querySelector(".file-browser-tags");
  const list = container.querySelector(":scope > .directory-tree");
  const empty = container.querySelector(":scope > .file-browser-empty");

  if (!input || !list) return;

  const tagFilter = createTagFilter({ input, tagsList, onChange: applyFilter });
  const sortState = createSortToggle(sortToggle, () => {
    sortItems();
    applyFilter();
  });

  function itemName(item) {
    return item.querySelector("a span:last-child").textContent;
  }

  function sortItems() {
    const items = [...list.querySelectorAll(":scope > .directory-file")];
    items.sort((a, b) => itemName(a).localeCompare(itemName(b)));
    if (sortState.descending) items.reverse();
    items.forEach((item) => list.appendChild(item));
  }

  function applyFilter() {
    const queries = activeQueries(tagFilter, input);
    const items = [...list.querySelectorAll(":scope > .directory-file")];
    let visibleCount = 0;

    items.forEach((item) => {
      const name = itemName(item).toLowerCase();
      const matches = queries.every((query) => fuzzyScore(query, name) !== null);
      item.hidden = !matches;
      if (matches) visibleCount += 1;
    });

    if (empty) empty.hidden = visibleCount > 0;
  }

  input.addEventListener("input", applyFilter);

  sortItems();
}

function initLinkListSearches() {
  document.querySelectorAll(".link-list.searchable").forEach(initLinkListSearch);
}

initLinkListSearches();

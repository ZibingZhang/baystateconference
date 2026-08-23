function initLinkListSearch(container) {
  const input = container.querySelector(".file-browser-search-input");
  const sortToggle = container.querySelector(".file-browser-sort-toggle");
  const list = container.querySelector(":scope > .directory-tree");
  const empty = container.querySelector(":scope > .file-browser-empty");

  if (!input || !list) return;

  let sortDescending = false;

  function itemName(item) {
    return item.querySelector("a span:last-child").textContent;
  }

  function sortItems() {
    const items = [...list.querySelectorAll(":scope > .directory-file")];
    items.sort((a, b) => itemName(a).localeCompare(itemName(b)));
    if (sortDescending) items.reverse();
    items.forEach((item) => list.appendChild(item));
  }

  function updateSortToggle() {
    if (!sortToggle) return;
    const icon = sortToggle.querySelector(".fa-solid");
    const label = sortDescending ? "Sort A to Z" : "Sort Z to A";
    icon.className = sortDescending ? "fa-solid fa-arrow-down-z-a" : "fa-solid fa-arrow-down-a-z";
    sortToggle.setAttribute("aria-label", label);
    sortToggle.title = label;
    sortToggle.setAttribute("aria-pressed", String(sortDescending));
  }

  function applyFilter() {
    const query = input.value.trim().toLowerCase();
    const items = [...list.querySelectorAll(":scope > .directory-file")];
    let visibleCount = 0;

    items.forEach((item) => {
      const matches = fuzzyScore(query, itemName(item).toLowerCase()) !== null;
      item.hidden = !matches;
      if (matches) visibleCount += 1;
    });

    if (empty) empty.hidden = visibleCount > 0;
  }

  input.addEventListener("input", applyFilter);

  if (sortToggle) {
    sortToggle.addEventListener("click", () => {
      sortDescending = !sortDescending;
      updateSortToggle();
      sortItems();
      applyFilter();
    });
  }

  sortItems();
}

function initLinkListSearches() {
  document.querySelectorAll(".link-list.searchable").forEach(initLinkListSearch);
}

initLinkListSearches();

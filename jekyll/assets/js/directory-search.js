// Filters the directory tree in place: a leaf is shown when its name is a
// fuzzy match for the query; a folder is shown when its own name matches
// (in which case all of its children are shown too, unfiltered) or when any
// descendant matches. Folders are expanded/collapsed to track visibility so
// results are never hidden inside a closed <details>, and clearing the
// query restores the default fully-expanded, fully-visible tree.
function filterDirectoryList(list, query) {
  let anyVisible = false;

  [...list.children].forEach((li) => {
    let visible;

    if (li.classList.contains("directory-file")) {
      const name = li.querySelector("a").textContent.toLowerCase();
      visible = fuzzyScore(query, name) !== null;
    } else if (li.classList.contains("directory-folder")) {
      const details = li.querySelector(":scope > details");
      const summary = details.querySelector(":scope > summary");
      const childList = details.querySelector(":scope > .directory-tree");
      const ownMatch = fuzzyScore(query, summary.textContent.trim().toLowerCase()) !== null;
      const childVisible = filterDirectoryList(childList, ownMatch ? "" : query);

      visible = ownMatch || childVisible;
      details.open = visible;
    }

    li.hidden = !visible;
    if (visible) anyVisible = true;
  });

  return anyVisible;
}

// Toggles every folder in the tree open or closed at once. Tracks its own
// expanded/collapsed state rather than reading it back from the DOM, so a
// single click always moves every folder uniformly even if individual
// <details> were left in a mixed state by hand or by a search filter.
function initDirectoryExpandToggle(tree, button) {
  if (!tree || !button) return;

  let expanded = false;

  function update() {
    const icon = button.querySelector(".material-symbols-outlined");
    const label = expanded ? "Collapse all" : "Expand all";
    icon.textContent = expanded ? "unfold_less" : "unfold_more";
    button.setAttribute("aria-label", label);
    button.title = label;
    button.setAttribute("aria-pressed", String(expanded));
  }

  button.addEventListener("click", () => {
    expanded = !expanded;
    tree.querySelectorAll("details").forEach((details) => {
      details.open = expanded;
    });
    update();
  });

  update();
}

function initDirectorySearch() {
  const browser = document.querySelector(".directory-browser");
  const input = browser ? browser.querySelector(".file-browser-search-input") : null;
  const tree = browser ? browser.querySelector(":scope > .directory-tree") : null;
  const expandToggle = browser ? browser.querySelector(".directory-expand-toggle") : null;

  if (!input || !tree) return;

  initDirectoryExpandToggle(tree, expandToggle);

  const initialQuery = parseSearchQueryFromLocation();
  if (initialQuery) {
    input.value = initialQuery;
    filterDirectoryList(tree, initialQuery.trim().toLowerCase());
  }

  input.addEventListener("input", () => {
    filterDirectoryList(tree, input.value.trim().toLowerCase());
    syncSearchQueryToUrl(input.value.trim());
  });
}

initDirectorySearch();

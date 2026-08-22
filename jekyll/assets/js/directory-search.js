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

function initDirectorySearch() {
  const browser = document.querySelector(".directory-browser");
  const input = browser ? browser.querySelector(".file-browser-search-input") : null;
  const tree = browser ? browser.querySelector(":scope > .directory-tree") : null;

  if (!input || !tree) return;

  input.addEventListener("input", () => {
    filterDirectoryList(tree, input.value.trim().toLowerCase());
  });
}

initDirectorySearch();

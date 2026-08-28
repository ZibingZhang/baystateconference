// Shared search-bar controls used by both file-browser.js and
// link-list-search.js, so a feature added to one search bar (tag chips,
// sort toggle) is available to the other for free.

// Manages the set of committed filter tags for a search bar: rendering the
// chip list, adding a tag from the input on Enter, and removing one on
// click. `onChange` fires after any mutation so the caller can re-filter.
function createTagFilter({ input, tagsList, onChange }) {
  let tags = [];

  function render() {
    if (!tagsList) return;
    tagsList.innerHTML = "";

    tags.forEach((tag, index) => {
      const li = document.createElement("li");
      li.className = "file-browser-tag";

      const label = document.createElement("span");
      label.className = "file-browser-tag-label";
      label.textContent = tag;

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "file-browser-tag-remove";
      removeBtn.setAttribute("aria-label", `Remove filter "${tag}"`);
      removeBtn.addEventListener("click", () => {
        tags.splice(index, 1);
        render();
        onChange();
      });

      const icon = document.createElement("span");
      icon.className = "material-symbols-outlined";
      icon.textContent = "close";
      icon.setAttribute("aria-hidden", "true");
      removeBtn.appendChild(icon);

      li.append(label, removeBtn);
      tagsList.appendChild(li);
    });

    tagsList.hidden = tags.length === 0;
  }

  function add(value) {
    const tag = value.trim().toLowerCase();
    if (tag.length === 0 || tags.includes(tag)) return;
    tags.push(tag);
    if (input) input.value = "";
    render();
    onChange();
  }

  // Replaces the committed tag set without firing onChange, so callers can
  // seed tags from external state (e.g. the URL) without triggering a
  // redundant re-write of that same state.
  function set(newTags) {
    tags = [...newTags];
    render();
  }

  if (input) {
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      add(input.value);
    });
  }

  render();

  return {
    get tags() {
      return [...tags];
    },
    add,
    set,
  };
}

// The committed tags ANDed with whatever's still being typed, so results
// narrow as soon as a tag lands and again on every keystroke after it.
function activeQueries(tagFilter, input) {
  const liveQuery = input ? input.value.trim().toLowerCase() : "";
  const queries = [...tagFilter.tags];
  if (liveQuery.length > 0) queries.push(liveQuery);
  return queries;
}

// Manages the A-Z/Z-A sort toggle button's state and icon/label, calling
// `onChange(descending)` whenever it's clicked. `initialDescending` seeds the
// starting state for lists that are server-rendered Z-A (e.g. newest-first
// school-year folders via `directory_sort: desc`), so the button's label and
// the first sortItems() pass agree with what's already on the page instead
// of silently flipping it back to A-Z.
function createSortToggle(button, onChange, initialDescending = false) {
  let descending = initialDescending;

  function update() {
    if (!button) return;
    const icon = button.querySelector(".material-symbols-outlined");
    const label = descending ? "Sort A to Z" : "Sort Z to A";
    icon.textContent = descending ? "arrow_downward" : "arrow_upward";
    button.setAttribute("aria-label", label);
    button.title = label;
    button.setAttribute("aria-pressed", String(descending));
  }

  if (button) {
    button.addEventListener("click", () => {
      descending = !descending;
      update();
      onChange(descending);
    });
  }

  update();

  return {
    get descending() {
      return descending;
    },
  };
}

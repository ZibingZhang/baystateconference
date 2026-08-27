function joinPath(...segments) {
  return segments
    .map((segment) => segment.replace(/^\/+|\/+$/g, ""))
    .filter((segment) => segment.length > 0)
    .join("/");
}

function encodePathSegments(path) {
  return path
    .split("/")
    .filter((segment) => segment.length > 0)
    .map(encodeURIComponent)
    .join("/");
}

function slugify(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

function encodePathNames(names) {
  return names.map((name) => encodeURIComponent(slugify(name))).join("/");
}

function decodePathSlugs(value) {
  if (!value) return [];
  return value.split("/").filter((segment) => segment.length > 0).map(decodeURIComponent);
}

function parseSlugsFromLocation() {
  const params = new URLSearchParams(window.location.search);
  return decodePathSlugs(params.get("path"));
}

function encodeTagsParam(tags) {
  return tags.map(encodeURIComponent).join(",");
}

function decodeTagsParam(value) {
  if (!value) return [];
  return value.split(",").filter((segment) => segment.length > 0).map(decodeURIComponent);
}

function parseTagsFromLocation() {
  const params = new URLSearchParams(window.location.search);
  return decodeTagsParam(params.get("tags"));
}

function findFilesAtPath(rootFiles, pathNames) {
  let current = rootFiles;

  for (const name of pathNames) {
    const match = current.find((item) => item.name === name && Array.isArray(item.files));
    if (!match) return rootFiles;
    current = match.files;
  }

  return current;
}

// Resolves URL path slugs (lowercase, dash-separated) back to the tree's
// actual display names, so breadcrumbs and rendering always use real names.
function resolvePathSlugs(rootFiles, slugSegments) {
  let current = rootFiles;
  const resolvedNames = [];

  for (const slug of slugSegments) {
    const match = current.find((item) => Array.isArray(item.files) && slugify(item.name) === slug);
    if (!match) break;
    resolvedNames.push(match.name);
    current = match.files;
  }

  return { files: current, path: resolvedNames };
}

function isPlainClick(event) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function isEditableElement(el) {
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

function fileExtension(name) {
  const match = name.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toUpperCase() : "FILE";
}

const FILE_ICON_CLASSES = {
  PDF: "fa-file-pdf",
  TXT: "fa-file-lines",
  HTML: "fa-file-code",
  HTM: "fa-file-code",
};

function fileIconClass(name) {
  return FILE_ICON_CLASSES[fileExtension(name)] || "fa-file";
}

// Walks the whole tree (not just the current folder) so the count reflects
// every file, including ones nested in subfolders that aren't shown yet.
// The same file often appears under more than one folder grouping (e.g. "By
// Type" and "By School Year"), so entries are deduped by their target
// (s3Path/url/externalUrl) to count each underlying file once.
function countFilesByType(files, counts = { extensions: {}, internal: 0, external: 0, total: 0 }, seen = new Set()) {
  for (const item of files) {
    if (Array.isArray(item.files)) {
      countFilesByType(item.files, counts, seen);
    } else if (item.s3Path) {
      if (seen.has(item.s3Path)) continue;
      seen.add(item.s3Path);
      const ext = fileExtension(item.name);
      counts.extensions[ext] = (counts.extensions[ext] || 0) + 1;
      counts.total += 1;
    } else if (item.externalUrl) {
      if (seen.has(item.externalUrl)) continue;
      seen.add(item.externalUrl);
      counts.external += 1;
      counts.total += 1;
    } else if (item.url) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      counts.internal += 1;
      counts.total += 1;
    }
  }
  return counts;
}

function pluralize(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function formatFileCountSummary(counts) {
  const parts = Object.entries(counts.extensions)
    .sort((a, b) => b[1] - a[1])
    .map(([ext, count]) => pluralize(count, ext));

  if (counts.internal > 0) parts.push(`${counts.internal} internal`);
  if (counts.external > 0) parts.push(`${counts.external} external`);

  return parts.join(", ");
}

// Wires a button that toggles a popover open/closed, closing it on an
// outside click or Escape. Kept generic (no file-browser-specific logic)
// since the open/close/outside-click dance is the same for any such button.
function initPopoverToggle(button, popover) {
  if (!button || !popover) return;

  function close() {
    popover.hidden = true;
    button.setAttribute("aria-expanded", "false");
  }

  function open() {
    popover.hidden = false;
    button.setAttribute("aria-expanded", "true");
  }

  button.addEventListener("click", () => {
    if (popover.hidden) open();
    else close();
  });

  document.addEventListener("click", (event) => {
    if (popover.hidden) return;
    if (button.contains(event.target) || popover.contains(event.target)) return;
    close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !popover.hidden) close();
  });
}

function initFileBrowser(browser) {
  const src = browser.dataset.src;
  const list = browser.querySelector(".file-browser-list");
  const empty = browser.querySelector(".file-browser-empty");
  const error = browser.querySelector(".file-browser-error");
  const loading = browser.querySelector(".file-browser-loading");
  const input = browser.querySelector(".file-browser-search-input");
  const tagsList = browser.querySelector(".file-browser-tags");
  const sortToggle = browser.querySelector(".file-browser-sort-toggle");
  const shortcutsToggle = browser.querySelector(".file-browser-shortcuts-toggle");
  const shortcutsPopover = browser.querySelector(".file-browser-shortcuts-popover");
  const backBtn = browser.querySelector(".file-browser-nav-back");
  const forwardBtn = browser.querySelector(".file-browser-nav-forward");
  const countEl = browser.querySelector(".file-browser-count");

  if (!src || !list) return;

  const pageUrl = browser.dataset.pageUrl || "/";
  const baseurl = browser.dataset.baseurl || "";
  const s3BucketRoot = browser.dataset.s3BucketRoot || "";

  let rootFiles = [];
  let currentPath = [];
  // Anchors for the currently rendered rows, in display order, so arrow-key
  // navigation can move real focus between them.
  let itemElements = [];
  // Parallel to itemElements: the folder path a row navigates to, or null
  // for file rows. Lets the Enter handler tell folders (which get a
  // deliberate, explicit "navigate + refocus search" step below) apart from
  // files (which just get the browser's native link-activation).
  let itemFolderPaths = [];

  // Independent back/forward stack, Finder-style: navigating to a new
  // folder truncates anything ahead of the current position; going back
  // then forward again just walks the existing stack.
  let navHistory = [[]];
  let navIndex = 0;

  const tagFilter = createTagFilter({
    input,
    tagsList,
    onChange: () => {
      refreshList();
      updateUrlForCurrentState();
    },
  });
  const sortState = createSortToggle(sortToggle, refreshList);
  initPopoverToggle(shortcutsToggle, shortcutsPopover);

  function sortFiles(files) {
    const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name));
    if (sortState.descending) sorted.reverse();
    return sorted;
  }

  function pageHrefForPath(pathNames, tags = []) {
    const pageHref = joinPath(baseurl, pageUrl);
    const href = `/${pageHref}/`.replace(/\/+/g, "/");
    const params = [];
    if (pathNames.length > 0) params.push(`path=${encodePathNames(pathNames)}`);
    if (tags.length > 0) params.push(`tags=${encodeTagsParam(tags)}`);
    return params.length > 0 ? `${href}?${params.join("&")}` : href;
  }

  // Rewrites the current entry's query string to match currentPath and the
  // committed tag filters, without adding a browser-history entry, so the
  // address bar always reflects a URL that reproduces the same view.
  function updateUrlForCurrentState() {
    window.history.replaceState(null, "", pageHrefForPath(currentPath, tagFilter.tags));
  }

  function currentSortedFiles() {
    return sortFiles(findFilesAtPath(rootFiles, currentPath));
  }

  // Re-derives what should be on screen from (rootFiles, currentPath, sort
  // direction, filter tags, search query) and re-renders it — the single
  // place that decides display order, so fuzzy-match ranking and the A-Z/Z-A
  // toggle compose instead of fighting over the list.
  function refreshList() {
    const queries = activeQueries(tagFilter, input);
    const files = currentSortedFiles();

    let displayed;
    let emptyMessage;

    if (queries.length === 0) {
      displayed = files;
      emptyMessage = "This folder is empty.";
    } else {
      displayed = files
        .map((file) => {
          const name = file.name.toLowerCase();
          const scores = queries.map((query) => fuzzyScore(query, name));
          if (scores.some((score) => score === null)) return null;
          const totalScore = scores.reduce((sum, score) => sum + score, 0);
          return { file, score: totalScore };
        })
        .filter((entry) => entry !== null)
        .sort((a, b) => b.score - a.score)
        .map(({ file }) => file);
      emptyMessage = "No files match your search.";
    }

    renderList(displayed);

    if (empty) {
      empty.textContent = emptyMessage;
      empty.hidden = displayed.length > 0;
    }
  }

  function renderList(files) {
    list.innerHTML = "";
    itemElements = [];
    itemFolderPaths = [];

    files.forEach((item) => {
      const li = document.createElement("li");
      li.className = "file-browser-item";

      const a = document.createElement("a");
      const icon = document.createElement("span");
      icon.setAttribute("aria-hidden", "true");

      let folderPath = null;

      if (Array.isArray(item.files)) {
        folderPath = [...currentPath, item.name];
        icon.className = "fa-solid fa-folder";
        a.href = pageHrefForPath(folderPath);
        a.addEventListener("click", (event) => {
          if (!isPlainClick(event)) return;
          event.preventDefault();
          navigateTo(folderPath);
        });
      } else if (item.s3Path) {
        icon.className = `fa-solid ${fileIconClass(item.name)}`;
        a.href = `${s3BucketRoot.replace(/\/+$/, "")}/${encodePathSegments(item.s3Path)}`;
        a.target = "_blank";
        a.rel = "noopener";
      } else if (item.externalUrl) {
        icon.className = "fa-solid fa-arrow-up-right-from-square";
        a.href = item.externalUrl;
        a.target = "_blank";
        a.rel = "noopener";
        a.title = "Opens an external website in a new tab";
      } else if (item.url) {
        icon.className = "fa-solid fa-window-maximize";
        if (item.url.startsWith("/")) {
          // Site-absolute path — points outside this file browser's own page subtree.
          a.href = `/${joinPath(baseurl, item.url)}/`.replace(/\/+/g, "/");
        } else {
          a.href = `/${joinPath(baseurl, pageUrl, item.url)}/`.replace(/\/+/g, "/");
        }
      }

      const name = document.createElement("span");
      name.className = "file-browser-name";
      name.textContent = item.name;

      a.append(icon, name);

      if (Array.isArray(item.files)) {
        const count = document.createElement("span");
        count.className = "file-browser-item-count";
        count.textContent = countFilesByType(item.files).total;
        a.append(count);
      }

      li.appendChild(a);
      list.appendChild(li);
      itemElements.push(a);
      itemFolderPaths.push(folderPath);
    });
  }

  // Moves real focus to the row at `index` (clamped) and scrolls it into
  // view. For file rows, Enter/Space then activates them via the browser's
  // native anchor behavior; folder rows are handled explicitly below.
  function focusItemAt(index) {
    if (itemElements.length === 0) return;
    const clamped = Math.max(0, Math.min(index, itemElements.length - 1));
    const el = itemElements[clamped];
    el.focus();
    el.scrollIntoView({ block: "nearest" });
  }

  function handleListKeydown(event) {
    const currentIndex = itemElements.indexOf(event.target);
    const isItemFocused = currentIndex !== -1;
    const isInputFocused = event.target === input;
    if (!isItemFocused && !isInputFocused) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusItemAt(isItemFocused ? currentIndex + 1 : 0);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (isItemFocused) {
          if (currentIndex === 0) {
            if (input) input.focus();
          } else {
            focusItemAt(currentIndex - 1);
          }
        }
        break;
      case "Home":
        if (isItemFocused) {
          event.preventDefault();
          focusItemAt(0);
        }
        break;
      case "End":
        if (isItemFocused) {
          event.preventDefault();
          focusItemAt(itemElements.length - 1);
        }
        break;
      // Folders get an explicit codepath (rather than relying on the
      // browser's default Enter-triggers-click behavior, whose synthesized
      // click isn't reliably distinguishable from a real mouse click) so the
      // search box can be refocused afterward — otherwise arrow-key
      // navigation would stop working on the new page without pressing "/"
      // again. File rows fall through to the browser's native activation.
      case "Enter": {
        if (!isItemFocused) break;
        const folderPath = itemFolderPaths[currentIndex];
        if (folderPath) {
          event.preventDefault();
          navigateTo(folderPath);
          if (input) input.focus();
        }
        break;
      }
      // Also works from the search box, but only at the start/end of its
      // text, so this doesn't steal Left/Right from normal cursor movement
      // while editing a query.
      case "ArrowLeft":
        if (isItemFocused || (isInputFocused && input.selectionStart === 0 && input.selectionEnd === 0)) {
          event.preventDefault();
          goBack(true);
        }
        break;
      case "ArrowRight":
        if (
          isItemFocused ||
          (isInputFocused && input.selectionStart === input.value.length && input.selectionEnd === input.value.length)
        ) {
          event.preventDefault();
          goForward(true);
        }
        break;
    }
  }

  function updateBreadcrumbs(pathNames) {
    const breadcrumbList = document.getElementById("breadcrumb-list");
    const currentCrumb = document.getElementById("breadcrumb-current");
    if (!breadcrumbList || !currentCrumb) return;

    breadcrumbList.querySelectorAll(".breadcrumb-dynamic").forEach((el) => el.remove());

    if (pathNames.length === 0) {
      currentCrumb.hidden = false;
      return;
    }

    const pageTitle = currentCrumb.textContent;
    const pageHref = currentCrumb.dataset.href || pageHrefForPath([]);

    const rootLink = document.createElement("a");
    rootLink.href = pageHref;
    rootLink.textContent = pageTitle;
    rootLink.addEventListener("click", (event) => {
      if (!isPlainClick(event)) return;
      event.preventDefault();
      navigateTo([]);
    });

    const rootLi = document.createElement("li");
    rootLi.className = "breadcrumb-dynamic";
    rootLi.appendChild(rootLink);
    currentCrumb.before(rootLi);

    pathNames.forEach((name, index) => {
      const isLast = index === pathNames.length - 1;
      const li = document.createElement("li");
      li.className = "breadcrumb-dynamic";

      if (isLast) {
        li.textContent = name;
        li.setAttribute("aria-current", "page");
      } else {
        const segmentPath = pathNames.slice(0, index + 1);
        const link = document.createElement("a");
        link.href = pageHrefForPath(segmentPath);
        link.textContent = name;
        link.addEventListener("click", (event) => {
          if (!isPlainClick(event)) return;
          event.preventDefault();
          navigateTo(segmentPath);
        });
        li.appendChild(link);
      }

      currentCrumb.before(li);
    });

    currentCrumb.hidden = true;
  }

  function updateCount(pathNames) {
    if (!countEl) return;
    const summary = formatFileCountSummary(countFilesByType(findFilesAtPath(rootFiles, pathNames)));
    countEl.textContent = summary;
    countEl.hidden = !summary;
  }

  function applyPath(pathNames, tags = []) {
    currentPath = pathNames;
    if (input) input.value = "";
    tagFilter.set(tags);
    refreshList();
    updateBreadcrumbs(pathNames);
    updateCount(pathNames);
  }

  function updateNavButtons() {
    if (backBtn) backBtn.disabled = navIndex <= 0;
    if (forwardBtn) forwardBtn.disabled = navIndex >= navHistory.length - 1;
  }

  function recordHistory(pathNames) {
    navHistory = navHistory.slice(0, navIndex + 1);
    navHistory.push(pathNames);
    navIndex = navHistory.length - 1;
    updateNavButtons();
  }

  function navigateTo(pathNames) {
    applyPath(pathNames);
    window.history.pushState(null, "", pageHrefForPath(pathNames));
    recordHistory(pathNames);
  }

  // `focusAfterNav` re-focuses the search box afterward — used for the
  // keyboard shortcut (Left/Right on a focused row) so arrow-key navigation
  // keeps working, but not for the actual back/forward button clicks, which
  // shouldn't yank focus (and would pop up the on-screen keyboard on mobile).
  function goBack(focusAfterNav = false) {
    if (navIndex <= 0) return;
    navIndex -= 1;
    applyPath(navHistory[navIndex]);
    window.history.replaceState(null, "", pageHrefForPath(navHistory[navIndex]));
    updateNavButtons();
    if (focusAfterNav && input) input.focus();
  }

  function goForward(focusAfterNav = false) {
    if (navIndex >= navHistory.length - 1) return;
    navIndex += 1;
    applyPath(navHistory[navIndex]);
    window.history.replaceState(null, "", pageHrefForPath(navHistory[navIndex]));
    updateNavButtons();
    if (focusAfterNav && input) input.focus();
  }

  if (input) input.addEventListener("input", refreshList);

  if (backBtn) backBtn.addEventListener("click", () => goBack());
  if (forwardBtn) forwardBtn.addEventListener("click", () => goForward());

  browser.addEventListener("keydown", handleListKeydown);

  // "/" jumps into this browser's search box from anywhere on the page,
  // unless the user is already typing somewhere else.
  if (input) {
    document.addEventListener("keydown", (event) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableElement(document.activeElement)) return;
      event.preventDefault();
      input.focus();
    });
  }

  fetch(src)
    .then((response) => {
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
      return response.json();
    })
    .then((data) => {
      rootFiles = data.files;
      if (loading) loading.hidden = true;
      list.hidden = false;

      const resolved = resolvePathSlugs(rootFiles, parseSlugsFromLocation());
      applyPath(resolved.path, parseTagsFromLocation());
      navHistory = resolved.path.map((_, index) => resolved.path.slice(0, index));
      navHistory.push(resolved.path);
      navIndex = navHistory.length - 1;
      updateNavButtons();

      window.addEventListener("popstate", () => {
        const popResolved = resolvePathSlugs(rootFiles, parseSlugsFromLocation());
        applyPath(popResolved.path, parseTagsFromLocation());
        recordHistory(popResolved.path);
      });
    })
    .catch(() => {
      if (loading) loading.hidden = true;
      if (error) error.hidden = false;
    });
}

function initFileBrowsers() {
  document.querySelectorAll(".file-browser").forEach(initFileBrowser);
}

initFileBrowsers();

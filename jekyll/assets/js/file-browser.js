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

const FILE_ICON_NAMES = {
  PDF: "picture_as_pdf",
  TXT: "description",
  HTML: "code",
  HTM: "code",
};

function fileIconName(name) {
  return FILE_ICON_NAMES[fileExtension(name)] || "insert_drive_file";
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

// U+0001 as separator (never appears in real file/folder names) so that
// e.g. ["A", "BC"] and ["AB", "C"] can't collide into the same key.
const KEY_SEP = "\u0001";

function pathKey(pathNames) {
  return pathNames.join(KEY_SEP);
}

function isSelfOrDescendantKey(key, ancestorKey) {
  return key === ancestorKey || key.startsWith(ancestorKey + KEY_SEP);
}

function isAncestorSelected(pathNames, selectedKeys) {
  for (let i = 1; i < pathNames.length; i++) {
    if (selectedKeys.has(pathKey(pathNames.slice(0, i)))) return true;
  }
  return false;
}

// Counts real (s3Path) files within a subtree, deduped by s3Path — the same
// dedup convention countFilesByType uses — since external/internal links
// aren't real files and can't go in a ZIP.
function countSelectableFiles(items, seen = new Set()) {
  let total = 0;
  for (const item of items) {
    if (Array.isArray(item.files)) {
      total += countSelectableFiles(item.files, seen);
    } else if (item.s3Path) {
      if (seen.has(item.s3Path)) continue;
      seen.add(item.s3Path);
      total += 1;
    }
  }
  return total;
}

// Walks a subtree computing { total, selected } selectable-file counts,
// used to derive a folder checkbox's checked/indeterminate state.
// `inherited` becomes true once an ancestor folder's own key is selected,
// at which point every descendant file counts as selected too.
function countSelectionState(items, pathNames, selectedKeys, inherited, seen = new Set()) {
  let total = 0;
  let selected = 0;
  for (const item of items) {
    const itemPath = [...pathNames, item.name];
    const itemInherited = inherited || selectedKeys.has(pathKey(itemPath));
    if (Array.isArray(item.files)) {
      const sub = countSelectionState(item.files, itemPath, selectedKeys, itemInherited, seen);
      total += sub.total;
      selected += sub.selected;
    } else if (item.s3Path) {
      if (seen.has(item.s3Path)) continue;
      seen.add(item.s3Path);
      total += 1;
      if (itemInherited) selected += 1;
    }
  }
  return { total, selected };
}

// Derives a single row's checkbox visual state: checked, indeterminate
// (folders only), and disabled (non-file rows, empty folders, or rows
// already fully included because an ancestor folder is selected).
function computeCheckboxState(item, itemPath, selectedKeys) {
  const ancestorSelected = isAncestorSelected(itemPath, selectedKeys);

  if (Array.isArray(item.files)) {
    if (ancestorSelected) return { checked: true, indeterminate: false, disabled: true };
    const selfSelected = selectedKeys.has(pathKey(itemPath));
    const { total, selected } = countSelectionState(item.files, itemPath, selectedKeys, selfSelected);
    if (total === 0) return { checked: false, indeterminate: false, disabled: true };
    if (selected === total) return { checked: true, indeterminate: false, disabled: false };
    if (selected === 0) return { checked: false, indeterminate: false, disabled: false };
    return { checked: false, indeterminate: true, disabled: false };
  }

  if (item.s3Path) {
    if (ancestorSelected) return { checked: true, indeterminate: false, disabled: true };
    return { checked: selectedKeys.has(pathKey(itemPath)), indeterminate: false, disabled: false };
  }

  // externalUrl or internal url — not a real file, can't be zipped.
  return { checked: false, indeterminate: false, disabled: true };
}

// Walks the whole tree collecting every selected file's full path (so the
// ZIP mirrors the browsed folder structure exactly), keyed by that path. A
// file selected via more than one location in the tree (the same
// duplication countFilesByType already accounts for) ends up as multiple
// map entries pointing at the same s3Path, so it's fetched once but written
// into the ZIP at every location — see buildZipBlob.
function collectSelectedFiles(rootFiles, selectedKeys) {
  const entries = new Map();

  function collectAll(items, pathNames) {
    for (const item of items) {
      const itemPath = [...pathNames, item.name];
      if (Array.isArray(item.files)) collectAll(item.files, itemPath);
      else if (item.s3Path) entries.set(itemPath.join("/"), item.s3Path);
    }
  }

  function walk(items, pathNames) {
    for (const item of items) {
      const itemPath = [...pathNames, item.name];
      const key = pathKey(itemPath);
      if (Array.isArray(item.files)) {
        if (selectedKeys.has(key)) collectAll(item.files, itemPath);
        else walk(item.files, itemPath);
      } else if (item.s3Path && selectedKeys.has(key)) {
        entries.set(itemPath.join("/"), item.s3Path);
      }
    }
  }

  walk(rootFiles, []);
  return entries;
}

class ZipFetchError extends Error {
  constructor(s3Path, status) {
    super(`Failed to fetch ${s3Path} (${status ?? "network error"})`);
    this.s3Path = s3Path;
  }
}

// Fetches each unique s3Path once, then writes the resulting bytes into the
// zip at every entry path that maps to it (see collectSelectedFiles).
async function buildZipBlob(entries, s3BucketRoot, onProgress) {
  const zip = new JSZip();
  const uniquePaths = [...new Set(entries.values())];
  const bytesByPath = new Map();
  let completed = 0;

  for (const s3Path of uniquePaths) {
    const url = `${s3BucketRoot.replace(/\/+$/, "")}/${encodePathSegments(s3Path)}`;
    let response;
    try {
      response = await fetch(url);
    } catch {
      throw new ZipFetchError(s3Path, null);
    }
    if (!response.ok) throw new ZipFetchError(s3Path, response.status);
    bytesByPath.set(s3Path, await response.arrayBuffer());
    completed += 1;
    onProgress({ phase: "fetching", completed, total: uniquePaths.length });
  }

  for (const [entryPath, s3Path] of entries) {
    zip.file(entryPath, bytesByPath.get(s3Path));
  }

  onProgress({ phase: "compressing", percent: 0 });
  return zip.generateAsync({ type: "blob" }, (meta) => {
    onProgress({ phase: "compressing", percent: Math.round(meta.percent) });
  });
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildZipFilename() {
  const base = (document.title || "files")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return `${base || "files"}-${new Date().toISOString().slice(0, 10)}.zip`;
}

// copyTextToClipboard and createCopyLinkButton are defined in copy-link.js,
// loaded before this file.

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
  const selectToggle = browser.querySelector(".file-browser-select-toggle");
  const selectBar = browser.querySelector(".file-browser-select-bar");
  const selectCountEl = browser.querySelector(".file-browser-select-count");
  const downloadBtn = browser.querySelector(".file-browser-select-download");
  const zipStatusEl = browser.querySelector(".file-browser-zip-status");

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

  // Whether the select-files UI is active, and which nodes (by full path
  // key) are selected. selectedKeys only ever stores selection "roots" —
  // selecting a folder clears any descendant keys and stores just the
  // folder's own key — which is what keeps checkbox-state computation and
  // ZIP traversal simple.
  let isSelecting = false;
  let selectedKeys = new Set();

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

  // The shortcuts popover's markup defaults to "Ctrl"; swap in "⌘" on Mac so
  // the hint matches the modifier the jump-to-first/last handler actually
  // checks (event.metaKey there).
  if (/Mac|iPod|iPhone|iPad/.test(navigator.platform)) {
    browser.querySelectorAll(".file-browser-mod-key").forEach((el) => {
      el.textContent = "⌘";
    });
  }

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
      icon.className = "material-symbols-outlined";
      icon.setAttribute("aria-hidden", "true");

      let folderPath = null;

      if (Array.isArray(item.files)) {
        folderPath = [...currentPath, item.name];
        icon.textContent = "folder";
        a.href = pageHrefForPath(folderPath);
        a.addEventListener("click", (event) => {
          if (!isPlainClick(event)) return;
          event.preventDefault();
          navigateTo(folderPath);
        });
      } else if (item.s3Path) {
        icon.textContent = fileIconName(item.name);
        a.href = `${s3BucketRoot.replace(/\/+$/, "")}/${encodePathSegments(item.s3Path)}`;
        a.target = "_blank";
        a.rel = "noopener";
      } else if (item.externalUrl) {
        icon.textContent = "open_in_new";
        a.href = item.externalUrl;
        a.target = "_blank";
        a.rel = "noopener";
        a.title = "Opens an external website in a new tab";
      } else if (item.url) {
        icon.textContent = "tab";
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

      if (isSelecting) {
        const itemPath = [...currentPath, item.name];
        const state = computeCheckboxState(item, itemPath, selectedKeys);
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "file-browser-item-checkbox";
        checkbox.setAttribute("aria-label", `Select ${item.name}`);
        checkbox.checked = state.checked;
        checkbox.indeterminate = state.indeterminate;
        checkbox.disabled = state.disabled;
        if (!Array.isArray(item.files) && !item.s3Path) {
          checkbox.title = "Not a file — can't be included in a ZIP download";
        }
        checkbox.addEventListener("click", (event) => event.stopPropagation());
        checkbox.addEventListener("change", () => {
          setSelected(itemPath, checkbox.checked);
          updateSelectionSummary();
          refreshList();
        });
        li.append(checkbox);
      }

      li.append(a, createCopyLinkButton(a));
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

    // Cmd (Mac) / Ctrl (Windows/Linux) turns a single-row Up/Down step into a
    // jump to the first/last row — chosen over Home/End since those are
    // frequently remapped or intercepted by browsers/OSes for other things,
    // while Cmd/Ctrl+Up/Down mirrors the "jump to start/end" convention apps
    // like Mail and Slack already use for lists.
    const jumpModifier = event.metaKey || event.ctrlKey;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (isItemFocused && jumpModifier) {
          focusItemAt(itemElements.length - 1);
        } else {
          focusItemAt(isItemFocused ? currentIndex + 1 : 0);
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (isItemFocused) {
          if (jumpModifier) {
            focusItemAt(0);
          } else if (currentIndex === 0) {
            if (input) input.focus();
          } else {
            focusItemAt(currentIndex - 1);
          }
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

  // Sets/clears the selection for a node. Setting a folder selected clears
  // any of its own descendant keys first (they're now implied by the
  // folder's key), which keeps selectedKeys holding only selection roots.
  function setSelected(pathNames, checked) {
    const key = pathKey(pathNames);
    for (const k of [...selectedKeys]) {
      if (isSelfOrDescendantKey(k, key)) selectedKeys.delete(k);
    }
    if (checked) selectedKeys.add(key);
  }

  function updateSelectionSummary() {
    if (!selectCountEl || !downloadBtn) return;
    const entries = collectSelectedFiles(rootFiles, selectedKeys);
    const uniqueCount = new Set(entries.values()).size;
    selectCountEl.textContent = `${uniqueCount} selected`;
    downloadBtn.disabled = uniqueCount === 0;
  }

  function showZipStatus(message) {
    if (!zipStatusEl) return;
    zipStatusEl.textContent = message;
    zipStatusEl.hidden = false;
  }

  function hideZipStatus() {
    if (!zipStatusEl) return;
    zipStatusEl.hidden = true;
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

  if (selectToggle) {
    selectToggle.addEventListener("click", () => {
      isSelecting = !isSelecting;
      selectToggle.setAttribute("aria-pressed", String(isSelecting));
      if (selectBar) selectBar.hidden = !isSelecting;
      if (!isSelecting) {
        selectedKeys.clear();
        hideZipStatus();
      }
      updateSelectionSummary();
      refreshList();
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener("click", async () => {
      const entries = collectSelectedFiles(rootFiles, selectedKeys);
      if (entries.size === 0) return;

      downloadBtn.disabled = true;
      const uniqueTotal = new Set(entries.values()).size;
      showZipStatus(`Preparing ZIP… fetching 0 of ${uniqueTotal} files`);

      try {
        const blob = await buildZipBlob(entries, s3BucketRoot, (progress) => {
          if (progress.phase === "fetching") {
            showZipStatus(`Preparing ZIP… fetching ${progress.completed} of ${progress.total} files`);
          } else {
            showZipStatus(`Compressing… ${progress.percent ?? 0}%`);
          }
        });
        triggerBlobDownload(blob, buildZipFilename());
        hideZipStatus();
      } catch (err) {
        showZipStatus(
          `Couldn't build the ZIP${err instanceof ZipFetchError ? ` — failed to download "${err.s3Path}"` : ""}. ` +
            `This can also happen if downloads from file storage aren't allowed for this site yet. Try again in a bit.`
        );
      } finally {
        downloadBtn.disabled = false;
      }
    });
  }

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

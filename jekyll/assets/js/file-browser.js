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

  if (counts.internal > 0) parts.push(pluralize(counts.internal, "internal page"));
  if (counts.external > 0) parts.push(pluralize(counts.external, "external page"));

  return parts.join(", ");
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
  const backBtn = browser.querySelector(".file-browser-nav-back");
  const forwardBtn = browser.querySelector(".file-browser-nav-forward");
  const countEl = browser.querySelector(".file-browser-count");

  if (!src || !list) return;

  const pageUrl = browser.dataset.pageUrl || "/";
  const baseurl = browser.dataset.baseurl || "";
  const s3BucketRoot = browser.dataset.s3BucketRoot || "";

  let rootFiles = [];
  let currentPath = [];

  // Independent back/forward stack, Finder-style: navigating to a new
  // folder truncates anything ahead of the current position; going back
  // then forward again just walks the existing stack.
  let navHistory = [[]];
  let navIndex = 0;

  const tagFilter = createTagFilter({ input, tagsList, onChange: refreshList });
  const sortState = createSortToggle(sortToggle, refreshList);

  function sortFiles(files) {
    const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name));
    if (sortState.descending) sorted.reverse();
    return sorted;
  }

  function pageHrefForPath(pathNames) {
    const pageHref = joinPath(baseurl, pageUrl);
    const href = `/${pageHref}/`.replace(/\/+/g, "/");
    if (pathNames.length === 0) return href;
    return `${href}?path=${encodePathNames(pathNames)}`;
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

    files.forEach((item) => {
      const li = document.createElement("li");
      li.className = "file-browser-item";

      const a = document.createElement("a");
      const icon = document.createElement("span");
      icon.setAttribute("aria-hidden", "true");

      if (Array.isArray(item.files)) {
        icon.className = "fa-solid fa-folder";
        a.href = pageHrefForPath([...currentPath, item.name]);
        a.addEventListener("click", (event) => {
          if (!isPlainClick(event)) return;
          event.preventDefault();
          navigateTo([...currentPath, item.name]);
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
    });
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

  function applyPath(pathNames) {
    currentPath = pathNames;
    if (input) input.value = "";
    tagFilter.reset();
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

  function goBack() {
    if (navIndex <= 0) return;
    navIndex -= 1;
    applyPath(navHistory[navIndex]);
    window.history.replaceState(null, "", pageHrefForPath(navHistory[navIndex]));
    updateNavButtons();
  }

  function goForward() {
    if (navIndex >= navHistory.length - 1) return;
    navIndex += 1;
    applyPath(navHistory[navIndex]);
    window.history.replaceState(null, "", pageHrefForPath(navHistory[navIndex]));
    updateNavButtons();
  }

  if (input) input.addEventListener("input", refreshList);

  if (backBtn) backBtn.addEventListener("click", goBack);
  if (forwardBtn) forwardBtn.addEventListener("click", goForward);

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
      applyPath(resolved.path);
      navHistory = resolved.path.map((_, index) => resolved.path.slice(0, index));
      navHistory.push(resolved.path);
      navIndex = navHistory.length - 1;
      updateNavButtons();

      window.addEventListener("popstate", () => {
        const popResolved = resolvePathSlugs(rootFiles, parseSlugsFromLocation());
        applyPath(popResolved.path);
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

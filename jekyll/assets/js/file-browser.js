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

function initFileBrowser(browser) {
  const src = browser.dataset.src;
  const list = browser.querySelector(".file-browser-list");
  const empty = browser.querySelector(".file-browser-empty");
  const error = browser.querySelector(".file-browser-error");
  const loading = browser.querySelector(".file-browser-loading");
  const input = browser.querySelector(".file-browser-search-input");
  const sortToggle = browser.querySelector(".file-browser-sort-toggle");

  if (!src || !list) return;

  const pageUrl = browser.dataset.pageUrl || "/";
  const baseurl = browser.dataset.baseurl || "";
  const s3BucketRoot = browser.dataset.s3BucketRoot || "";

  let rootFiles = [];
  let currentPath = [];
  let sortDescending = false;

  function sortFiles(files) {
    const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name));
    if (sortDescending) sorted.reverse();
    return sorted;
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
  // direction, search query) and re-renders it — the single place that
  // decides display order, so fuzzy-match ranking and the A-Z/Z-A toggle
  // compose instead of fighting over the list.
  function refreshList() {
    const query = input ? input.value.trim().toLowerCase() : "";
    const files = currentSortedFiles();

    let displayed;
    let emptyMessage;

    if (query.length === 0) {
      displayed = files;
      emptyMessage = "This folder is empty.";
    } else {
      displayed = files
        .map((file) => ({ file, score: fuzzyScore(query, file.name.toLowerCase()) }))
        .filter(({ score }) => score !== null)
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
      } else if (item.externalUrl) {
        icon.className = "fa-solid fa-file-pdf";
        a.href = `${s3BucketRoot.replace(/\/+$/, "")}/${encodePathSegments(item.externalUrl)}`;
        a.target = "_blank";
        a.rel = "noopener";
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

  function navigateTo(pathNames, replace) {
    currentPath = pathNames;
    if (input) input.value = "";
    refreshList();
    updateBreadcrumbs(pathNames);

    const href = pageHrefForPath(pathNames);
    if (replace) {
      window.history.replaceState(null, "", href);
    } else {
      window.history.pushState(null, "", href);
    }
  }

  if (input) input.addEventListener("input", refreshList);

  if (sortToggle) {
    sortToggle.addEventListener("click", () => {
      sortDescending = !sortDescending;
      updateSortToggle();
      refreshList();
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
      currentPath = resolved.path;
      refreshList();
      updateBreadcrumbs(resolved.path);

      window.addEventListener("popstate", () => {
        const popResolved = resolvePathSlugs(rootFiles, parseSlugsFromLocation());
        currentPath = popResolved.path;
        if (input) input.value = "";
        refreshList();
        updateBreadcrumbs(popResolved.path);
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

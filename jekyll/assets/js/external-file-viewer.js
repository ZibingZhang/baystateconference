function encodePathSegments(path) {
  return path
    .split("/")
    .filter((segment) => segment.length > 0)
    .map(encodeURIComponent)
    .join("/");
}

document.addEventListener("DOMContentLoaded", () => {
  const viewer = document.querySelector(".external-file-viewer");
  if (!viewer) return;

  const s3BucketRoot = viewer.dataset.s3BucketRoot || "";
  const params = new URLSearchParams(window.location.search);
  const path = params.get("url");
  const name = params.get("name");

  const nameEl = viewer.querySelector(".external-file-name");
  const openLink = viewer.querySelector(".external-file-open-link");
  const copyBtn = viewer.querySelector(".external-file-copy-btn");
  const loading = viewer.querySelector(".external-file-loading");
  const frame = viewer.querySelector(".external-file-frame");
  const error = viewer.querySelector(".external-file-error");

  // Copies this viewer page's own URL (not the underlying CDN link) - that's
  // the link worth bookmarking/sharing, since it keeps working even if the
  // CDN root changes later. Uses copyTextToClipboard from copy-link.js
  // directly rather than that file's createCopyLinkButton helper, since that
  // helper's button is styled for the file-browser/link-list row's
  // hover-to-reveal pattern, not an always-visible toolbar button.
  if (copyBtn) {
    const copyIcon = copyBtn.querySelector(".material-symbols-outlined");
    let resetTimer = null;
    copyBtn.addEventListener("click", () => {
      copyTextToClipboard(window.location.href);
      copyIcon.textContent = "check";
      copyBtn.title = "Copied!";
      copyBtn.setAttribute("aria-label", "Copied!");
      copyBtn.classList.add("is-copied");
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        copyIcon.textContent = "link";
        copyBtn.title = "Copy link";
        copyBtn.setAttribute("aria-label", "Copy link");
        copyBtn.classList.remove("is-copied");
      }, 1500);
    });
  }

  if (!path) {
    loading.hidden = true;
    error.hidden = false;
    return;
  }

  const src = `${s3BucketRoot.replace(/\/+$/, "")}/${encodePathSegments(path)}`;

  if (name) {
    nameEl.textContent = name;
    document.title = `${name} – ${document.title}`;
  }

  openLink.href = src;

  // A cross-origin iframe's `load` event fires once the CDN responds at
  // all, success or not (e.g. a 403) - there's no way to inspect the
  // response status from here, so this only ever means "stop showing the
  // spinner," not "the preview worked." The open-in-new-tab link above is
  // the real fallback for whatever the iframe can't show.
  frame.addEventListener("load", () => {
    loading.hidden = true;
    frame.hidden = false;
  });

  frame.src = src;
});

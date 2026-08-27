// A page can include link-list.html more than once (e.g. separate internal
// and external lists), each occurrence emitting its own copy of this script
// tag — so this runs once per included list, not once per page. Guard
// against re-wiring rows an earlier run already touched.
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".link-list .directory-file").forEach((li) => {
    if (li.querySelector(".file-browser-copy-btn")) return;
    const anchor = li.querySelector("a");
    if (anchor) li.append(createCopyLinkButton(anchor));
  });
});

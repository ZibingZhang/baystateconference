function copyTextToClipboardFallback(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      // Falls back to the execCommand technique on rejection too, not just
      // when the API is absent — e.g. some browsers can refuse the async
      // clipboard write (sometimes throwing synchronously rather than
      // rejecting) even though the API itself exists.
      return navigator.clipboard.writeText(text).catch(() => copyTextToClipboardFallback(text));
    }
  } catch (error) {
    // fall through to the fallback below
  }
  copyTextToClipboardFallback(text);
  return Promise.resolve();
}

// A button that copies `anchor`'s resolved URL (reading the `href` property,
// not the attribute, so relative hrefs come back absolute) to the clipboard,
// showing a checkmark briefly as confirmation. It's a sibling of the row's
// anchor rather than nested inside it, so its click never triggers the row's
// own navigation.
function createCopyLinkButton(anchor) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "file-browser-copy-btn";
  button.setAttribute("aria-label", "Copy link");
  button.title = "Copy link";

  const icon = document.createElement("span");
  icon.className = "fa-solid fa-link";
  icon.setAttribute("aria-hidden", "true");
  button.appendChild(icon);

  let resetTimer = null;

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    copyTextToClipboard(anchor.href);

    icon.className = "fa-solid fa-check";
    button.title = "Copied!";
    button.setAttribute("aria-label", "Copied!");
    button.classList.add("is-copied");

    // A mouse click leaves the button focused, which — since it's revealed
    // by :hover OR :focus-visible — would otherwise keep it visible after
    // the mouse leaves, until something else is clicked. Blur it so hover
    // alone governs visibility again once the confirmation ends. Keyboard
    // activation (Enter/Space) is left focused, matching normal
    // focus-follows-keyboard behavior; the "is-copied" class (not focus)
    // is what keeps the confirmation visible regardless.
    if (event.detail !== 0) button.blur();

    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      icon.className = "fa-solid fa-link";
      button.title = "Copy link";
      button.setAttribute("aria-label", "Copy link");
      button.classList.remove("is-copied");
    }, 1500);
  });

  return button;
}

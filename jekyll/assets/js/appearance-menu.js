(function () {
  "use strict";

  var root = document.documentElement;
  var menus = [];

  function openMenu(entry) {
    entry.menu.hidden = false;
    entry.trigger.setAttribute("aria-expanded", "true");
  }

  function closeMenu(entry) {
    entry.menu.hidden = true;
    entry.trigger.setAttribute("aria-expanded", "false");
  }

  function closeAllMenus() {
    menus.forEach(closeMenu);
  }

  function openEntry() {
    return menus.find(function (entry) {
      return !entry.menu.hidden;
    });
  }

  var themeIcons = { system: "brightness_auto", light: "light_mode", dark: "dark_mode" };

  function setupMenu(options) {
    var trigger = document.getElementById(options.triggerId);
    var menu = document.getElementById(options.menuId);
    if (!trigger || !menu) return;

    var entry = { trigger: trigger, menu: menu };
    var items = menu.querySelectorAll(".appearance-menu-item");

    function syncSelection() {
      var current = root.getAttribute(options.attribute) || options.defaultValue;
      items.forEach(function (item) {
        var selected = item.getAttribute(options.dataAttr) === current;
        item.setAttribute("aria-checked", String(selected));
        item.classList.toggle("is-selected", selected);
      });
      if (options.onSync) options.onSync(current);
    }

    trigger.addEventListener("click", function (event) {
      event.stopPropagation();
      var wasOpen = !menu.hidden;
      closeAllMenus();
      if (!wasOpen) openMenu(entry);
    });

    items.forEach(function (item) {
      item.addEventListener("click", function () {
        var value = item.getAttribute(options.dataAttr);
        if (value === options.defaultValue) {
          root.removeAttribute(options.attribute);
          try {
            localStorage.removeItem(options.storageKey);
          } catch (e) {}
        } else {
          root.setAttribute(options.attribute, value);
          try {
            localStorage.setItem(options.storageKey, value);
          } catch (e) {}
        }
        syncSelection();
        closeMenu(entry);
        trigger.focus();
      });
    });

    syncSelection();
    menus.push(entry);
  }

  document.addEventListener("click", function (event) {
    var entry = openEntry();
    if (!entry) return;
    if (!entry.menu.contains(event.target) && !entry.trigger.contains(event.target)) {
      closeAllMenus();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    var entry = openEntry();
    if (!entry) return;
    closeAllMenus();
    entry.trigger.focus();
  });

  setupMenu({
    triggerId: "theme-menu-trigger",
    menuId: "theme-menu",
    attribute: "data-theme",
    dataAttr: "data-theme-value",
    storageKey: "theme",
    defaultValue: "system",
    onSync: function (current) {
      var icon = document.getElementById("theme-menu-trigger-icon");
      if (icon) icon.textContent = themeIcons[current] || themeIcons.system;
    },
  });

  setupMenu({
    triggerId: "palette-menu-trigger",
    menuId: "palette-menu",
    attribute: "data-palette",
    dataAttr: "data-palette-value",
    storageKey: "palette",
    defaultValue: "classic",
  });
})();

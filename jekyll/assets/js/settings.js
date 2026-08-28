const root = document.documentElement;

const themeInputs = document.querySelectorAll('input[name="theme"]');
const paletteInputs = document.querySelectorAll('input[name="palette"]');

const currentTheme = root.getAttribute("data-theme") || "system";
const currentPalette = root.getAttribute("data-palette") || "classic";

themeInputs.forEach((input) => {
  input.checked = input.value === currentTheme;
  input.addEventListener("change", () => {
    if (input.value === "system") {
      root.removeAttribute("data-theme");
      try {
        localStorage.removeItem("theme");
      } catch (e) {}
    } else {
      root.setAttribute("data-theme", input.value);
      try {
        localStorage.setItem("theme", input.value);
      } catch (e) {}
    }
  });
});

paletteInputs.forEach((input) => {
  input.checked = input.value === currentPalette;
  input.addEventListener("change", () => {
    if (input.value === "classic") {
      root.removeAttribute("data-palette");
      try {
        localStorage.removeItem("palette");
      } catch (e) {}
    } else {
      root.setAttribute("data-palette", input.value);
      try {
        localStorage.setItem("palette", input.value);
      } catch (e) {}
    }
  });
});

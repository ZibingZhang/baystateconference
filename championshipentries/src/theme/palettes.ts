import type { PaletteOptions } from "@mui/material/styles";
import { solarizedTokens, rosePineTokens } from "./generated/paletteTokens";

export type PaletteName = "classic" | "solarized" | "rose-pine";
export type ResolvedMode = "light" | "dark";

export const PALETTE_OPTIONS: { value: PaletteName; label: string; infoUrl?: string }[] = [
  { value: "classic", label: "Classic" },
  { value: "solarized", label: "Solarized", infoUrl: "https://ethanschoonover.com/solarized/" },
  { value: "rose-pine", label: "Rosé Pine", infoUrl: "https://rosepinetheme.com/" },
];

// Maps the raw color tokens (generated from the Jekyll site's SCSS - see
// scripts/generate-palette-tokens.mjs) onto MUI's palette shape. The colors
// themselves live in one place (the Jekyll skins); this is just this app's
// own framework-specific wiring of background/text/accent roles.
const solarized: Record<ResolvedMode, PaletteOptions> = {
  light: {
    background: { default: solarizedTokens.base3, paper: solarizedTokens.base2 },
    text: { primary: solarizedTokens.base00, secondary: solarizedTokens.base01 },
    divider: solarizedTokens.dividerLight,
    primary: { main: solarizedTokens.darkBlue },
    secondary: { main: solarizedTokens.violet },
    error: { main: solarizedTokens.red },
    warning: { main: solarizedTokens.orange },
    info: { main: solarizedTokens.cyan },
    success: { main: solarizedTokens.green },
  },
  dark: {
    background: { default: solarizedTokens.base03, paper: solarizedTokens.base02 },
    text: { primary: solarizedTokens.base0, secondary: solarizedTokens.base1 },
    divider: solarizedTokens.dividerDark,
    primary: { main: solarizedTokens.lightBlue },
    secondary: { main: solarizedTokens.violet },
    error: { main: solarizedTokens.red },
    warning: { main: solarizedTokens.orange },
    info: { main: solarizedTokens.cyan },
    success: { main: solarizedTokens.green },
  },
};

const rosePine: Record<ResolvedMode, PaletteOptions> = {
  light: {
    background: { default: rosePineTokens.dawn.base, paper: rosePineTokens.dawn.surface },
    text: { primary: rosePineTokens.dawn.text, secondary: rosePineTokens.dawn.subtle },
    divider: rosePineTokens.dawn.highlightMed,
    primary: { main: rosePineTokens.dawn.pine },
    secondary: { main: rosePineTokens.dawn.iris },
    error: { main: rosePineTokens.dawn.love },
    warning: { main: rosePineTokens.dawn.gold },
    info: { main: rosePineTokens.dawn.foam },
    success: { main: rosePineTokens.dawn.foam },
  },
  dark: {
    background: { default: rosePineTokens.moon.base, paper: rosePineTokens.moon.surface },
    text: { primary: rosePineTokens.moon.text, secondary: rosePineTokens.moon.subtle },
    divider: rosePineTokens.moon.highlightMed,
    primary: { main: rosePineTokens.moon.pine },
    secondary: { main: rosePineTokens.moon.iris },
    error: { main: rosePineTokens.moon.love },
    warning: { main: rosePineTokens.moon.gold },
    info: { main: rosePineTokens.moon.foam },
    success: { main: rosePineTokens.moon.foam },
  },
};

export function getPaletteOverride(name: PaletteName, mode: ResolvedMode): PaletteOptions | null {
  if (name === "classic") return null;
  return name === "solarized" ? solarized[mode] : rosePine[mode];
}

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ThemeProvider, createTheme, type Theme } from "@mui/material/styles";
import { getPaletteOverride, type PaletteName } from "./palettes";

const STORAGE_KEY = "championshipentries:palette";

function loadPalette(): PaletteName {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === "solarized" || raw === "rose-pine" ? raw : "classic";
}

interface PaletteContextValue {
  palette: PaletteName;
  setPalette: (palette: PaletteName) => void;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

export function usePaletteSetting() {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("usePaletteSetting must be used within PaletteProvider");
  return ctx;
}

function PaletteContextProvider({ children }: { children: ReactNode }) {
  const [palette, setPalette] = useState<PaletteName>(loadPalette);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, palette);
  }, [palette]);

  const value = useMemo(() => ({ palette, setPalette }), [palette]);

  return (
    <PaletteContext.Provider value={value}>
      <ThemeProvider
        theme={(outer) => {
          const outerTheme = outer as Theme;
          const overrides = getPaletteOverride(palette, outerTheme.palette.mode);
          if (!overrides) return outerTheme;
          return createTheme({
            palette: { mode: outerTheme.palette.mode, ...overrides },
            typography: outerTheme.typography,
            shape: outerTheme.shape,
            components: {
              // AppBar's `color="default"` hardcodes theme.palette.grey[100]/[900]
              // rather than following the palette, so it doesn't pick up the
              // custom light backgrounds here (it happens to look fine in dark
              // mode purely because grey[900] is close to every dark palette's
              // background anyway). Point it at our background explicitly.
              MuiAppBar: {
                styleOverrides: {
                  colorDefault: {
                    backgroundColor: overrides.background?.paper,
                  },
                },
              },
            },
          });
        }}
      >
        {children}
      </ThemeProvider>
    </PaletteContext.Provider>
  );
}

export default PaletteContextProvider;

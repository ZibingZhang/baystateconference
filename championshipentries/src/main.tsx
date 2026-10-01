import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CssBaseline from "@mui/material/CssBaseline";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { ThemeProvider } from "@mui/material/styles";
import "@fontsource/roboto/latin-300.css";
import "@fontsource/roboto/latin-400.css";
import "@fontsource/roboto/latin-500.css";
import "@fontsource/roboto/latin-700.css";
import "./index.css";
import theme from "./theme.ts";
import PaletteContextProvider from "./theme/PaletteContext.tsx";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <InitColorSchemeScript defaultMode="system" />
    <ThemeProvider theme={theme} defaultMode="system">
      <PaletteContextProvider>
        <CssBaseline />
        <App />
      </PaletteContextProvider>
    </ThemeProvider>
  </StrictMode>,
);

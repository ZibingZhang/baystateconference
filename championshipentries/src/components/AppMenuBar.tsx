import { useState, type MouseEvent } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import NavMenu from "./NavMenu";
import ListItemIcon from "@mui/material/ListItemIcon";
import MenuIcon from "@mui/icons-material/Menu";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";
import PaletteIcon from "@mui/icons-material/Palette";
import CheckIcon from "@mui/icons-material/Check";
import { useColorScheme } from "@mui/material/styles";
import { usePaletteSetting } from "../theme/PaletteContext";
import { PALETTE_OPTIONS } from "../theme/palettes";

type ThemeMode = "system" | "light" | "dark";

const THEME_MODES: { value: ThemeMode; label: string; icon: typeof LightModeIcon }[] = [
  { value: "system", label: "System", icon: SettingsBrightnessIcon },
  { value: "light", label: "Light", icon: LightModeIcon },
  { value: "dark", label: "Dark", icon: DarkModeIcon },
];

const SECTIONALS_RESULTS_URL =
  "https://baystateconference.com/sports/swimming-diving/archive/?path=meet-results/by-meet/sectionals";
const STATES_RESULTS_URL =
  "https://baystateconference.com/sports/swimming-diving/archive/?path=meet-results/by-meet/states";

interface AppMenuBarProps {
  onToggleSidebar: () => void;
  onNewMeet: () => void;
  onRenameMeet: () => void;
  onCopyMeet: () => void;
  onExportMeetBackup: () => void;
  onDeleteMeet: () => void;
  onExportHy3: () => void;
  hasSelectedMeet: boolean;
  onHowTo: () => void;
  onAbout: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

function AppMenuBar({
  onToggleSidebar,
  onNewMeet,
  onRenameMeet,
  onCopyMeet,
  onExportMeetBackup,
  onDeleteMeet,
  onExportHy3,
  hasSelectedMeet,
  onHowTo,
  onAbout,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: AppMenuBarProps) {
  const { mode, setMode } = useColorScheme();
  const { palette, setPalette } = usePaletteSetting();
  const [fileAnchorEl, setFileAnchorEl] = useState<HTMLElement | null>(null);
  const [resultsAnchorEl, setResultsAnchorEl] = useState<HTMLElement | null>(null);
  const [themeAnchorEl, setThemeAnchorEl] = useState<HTMLElement | null>(null);
  const [paletteAnchorEl, setPaletteAnchorEl] = useState<HTMLElement | null>(null);

  const openFileMenu = (event: MouseEvent<HTMLElement>) => setFileAnchorEl(event.currentTarget);
  const closeFileMenu = () => setFileAnchorEl(null);
  const openResultsMenu = (event: MouseEvent<HTMLElement>) =>
    setResultsAnchorEl(event.currentTarget);
  const closeResultsMenu = () => setResultsAnchorEl(null);
  const openThemeMenu = (event: MouseEvent<HTMLElement>) => setThemeAnchorEl(event.currentTarget);
  const closeThemeMenu = () => setThemeAnchorEl(null);
  const openPaletteMenu = (event: MouseEvent<HTMLElement>) =>
    setPaletteAnchorEl(event.currentTarget);
  const closePaletteMenu = () => setPaletteAnchorEl(null);

  const currentMode = THEME_MODES.find((m) => m.value === mode) ?? THEME_MODES[0];
  const CurrentModeIcon = currentMode.icon;
  const currentPalette = PALETTE_OPTIONS.find((p) => p.value === palette) ?? PALETTE_OPTIONS[0];

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar variant="dense">
        <IconButton
          edge="start"
          size="small"
          onClick={onToggleSidebar}
          sx={{ mr: 1 }}
          aria-label="Toggle sidebar"
        >
          <MenuIcon fontSize="small" />
        </IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mr: 3 }}>
          ChampionshipEntries
        </Typography>
        <Tooltip title="Undo (Ctrl+Z)">
          <span>
            <IconButton size="small" onClick={onUndo} disabled={!canUndo} aria-label="Undo">
              <UndoIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Redo (Ctrl+Y)">
          <span>
            <IconButton
              size="small"
              onClick={onRedo}
              disabled={!canRedo}
              aria-label="Redo"
              sx={{ mr: 2 }}
            >
              <RedoIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Button color="inherit" size="small" onClick={openFileMenu}>
          File
        </Button>
        <NavMenu anchorEl={fileAnchorEl} open={Boolean(fileAnchorEl)} onClose={closeFileMenu}>
          <MenuItem
            onClick={() => {
              onNewMeet();
              closeFileMenu();
            }}
          >
            New Meet
          </MenuItem>
          <MenuItem
            disabled={!hasSelectedMeet}
            onClick={() => {
              onRenameMeet();
              closeFileMenu();
            }}
          >
            Rename Meet
          </MenuItem>
          <MenuItem
            disabled={!hasSelectedMeet}
            onClick={() => {
              onCopyMeet();
              closeFileMenu();
            }}
          >
            Copy Meet
          </MenuItem>
          <Divider />
          <MenuItem
            disabled={!hasSelectedMeet}
            onClick={() => {
              onExportMeetBackup();
              closeFileMenu();
            }}
          >
            Export Meet Backup
          </MenuItem>
          <MenuItem
            disabled={!hasSelectedMeet}
            onClick={() => {
              onExportHy3();
              closeFileMenu();
            }}
          >
            Export to HY3
          </MenuItem>
          <Divider />
          <MenuItem
            disabled={!hasSelectedMeet}
            onClick={() => {
              onDeleteMeet();
              closeFileMenu();
            }}
          >
            Delete Meet
          </MenuItem>
        </NavMenu>
        <Button color="inherit" size="small" onClick={openResultsMenu}>
          Results
        </Button>
        <NavMenu
          anchorEl={resultsAnchorEl}
          open={Boolean(resultsAnchorEl)}
          onClose={closeResultsMenu}
        >
          <MenuItem
            component="a"
            href={SECTIONALS_RESULTS_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeResultsMenu}
          >
            Sectionals Results
            <OpenInNewIcon fontSize="inherit" sx={{ ml: 1 }} />
          </MenuItem>
          <MenuItem
            component="a"
            href={STATES_RESULTS_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeResultsMenu}
          >
            States Results
            <OpenInNewIcon fontSize="inherit" sx={{ ml: 1 }} />
          </MenuItem>
        </NavMenu>
        <Button color="inherit" size="small" onClick={onHowTo}>
          How To
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button color="inherit" size="small" onClick={onAbout} sx={{ mr: 1 }}>
          About
        </Button>
        <Tooltip title={`Color palette: ${currentPalette.label}`}>
          <IconButton
            size="small"
            onClick={openPaletteMenu}
            aria-label="Change color palette"
            color="inherit"
          >
            <PaletteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <NavMenu
          anchorEl={paletteAnchorEl}
          open={Boolean(paletteAnchorEl)}
          onClose={closePaletteMenu}
        >
          {PALETTE_OPTIONS.map(({ value, label }) => (
            <MenuItem
              key={value}
              selected={palette === value}
              onClick={() => {
                setPalette(value);
                closePaletteMenu();
              }}
            >
              {label}
              {palette === value && <CheckIcon fontSize="small" sx={{ ml: 2 }} />}
            </MenuItem>
          ))}
        </NavMenu>
        <Tooltip title={`Theme: ${currentMode.label}`}>
          <IconButton
            size="small"
            onClick={openThemeMenu}
            aria-label="Change theme"
            color="inherit"
          >
            <CurrentModeIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <NavMenu anchorEl={themeAnchorEl} open={Boolean(themeAnchorEl)} onClose={closeThemeMenu}>
          {THEME_MODES.map(({ value, label, icon: Icon }) => (
            <MenuItem
              key={value}
              selected={mode === value}
              onClick={() => {
                setMode(value);
                closeThemeMenu();
              }}
            >
              <ListItemIcon>
                <Icon fontSize="small" />
              </ListItemIcon>
              {label}
              {mode === value && <CheckIcon fontSize="small" sx={{ ml: 2 }} />}
            </MenuItem>
          ))}
        </NavMenu>
      </Toolbar>
    </AppBar>
  );
}

export default AppMenuBar;

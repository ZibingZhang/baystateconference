import { useState, type MouseEvent } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MenuIcon from "@mui/icons-material/Menu";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";

interface AppMenuBarProps {
  onToggleSidebar: () => void;
  onNewMeet: () => void;
  onExportHy3: () => void;
  exportDisabled: boolean;
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
  onExportHy3,
  exportDisabled,
  onHowTo,
  onAbout,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: AppMenuBarProps) {
  const [fileAnchorEl, setFileAnchorEl] = useState<HTMLElement | null>(null);
  const [helpAnchorEl, setHelpAnchorEl] = useState<HTMLElement | null>(null);

  const openFileMenu = (event: MouseEvent<HTMLElement>) => setFileAnchorEl(event.currentTarget);
  const closeFileMenu = () => setFileAnchorEl(null);
  const openHelpMenu = (event: MouseEvent<HTMLElement>) => setHelpAnchorEl(event.currentTarget);
  const closeHelpMenu = () => setHelpAnchorEl(null);

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
        <Menu anchorEl={fileAnchorEl} open={Boolean(fileAnchorEl)} onClose={closeFileMenu}>
          <MenuItem
            onClick={() => {
              onNewMeet();
              closeFileMenu();
            }}
          >
            New Meet
          </MenuItem>
          <MenuItem
            disabled={exportDisabled}
            onClick={() => {
              onExportHy3();
              closeFileMenu();
            }}
          >
            Export to HY3
          </MenuItem>
        </Menu>
        <Button color="inherit" size="small" onClick={openHelpMenu}>
          Help
        </Button>
        <Menu anchorEl={helpAnchorEl} open={Boolean(helpAnchorEl)} onClose={closeHelpMenu}>
          <MenuItem
            onClick={() => {
              onHowTo();
              closeHelpMenu();
            }}
          >
            How To
          </MenuItem>
          <MenuItem
            onClick={() => {
              onAbout();
              closeHelpMenu();
            }}
          >
            About
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}

export default AppMenuBar;

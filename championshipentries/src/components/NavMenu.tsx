import { type ReactNode } from "react";
import Popper from "@mui/material/Popper";
import Grow from "@mui/material/Grow";
import Paper from "@mui/material/Paper";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import MenuList from "@mui/material/MenuList";

interface NavMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

function NavMenu({ anchorEl, open, onClose, children }: NavMenuProps) {
  return (
    <Popper anchorEl={anchorEl} open={open} placement="bottom-start" transition disablePortal>
      {({ TransitionProps }) => (
        <Grow {...TransitionProps} style={{ transformOrigin: "top left" }}>
          <Paper>
            <ClickAwayListener onClickAway={onClose}>
              <MenuList autoFocusItem={open} onKeyDown={(e) => e.key === "Escape" && onClose()}>
                {children}
              </MenuList>
            </ClickAwayListener>
          </Paper>
        </Grow>
      )}
    </Popper>
  );
}

export default NavMenu;

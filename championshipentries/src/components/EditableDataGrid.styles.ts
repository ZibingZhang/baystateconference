import type { Theme } from "@mui/material/styles";

export function marchingAntsSx(theme: Theme) {
  return {
    // DataGrid renders its own synthetic scrollbar thumb (`.MuiDataGrid-scrollbar`,
    // absolutely positioned over the grid) and deliberately hides the native
    // scrollbar on the actual scrolling pane (`.MuiDataGrid-virtualScroller`) so
    // only the synthetic one shows — style that one, not virtualScroller, or the
    // native scrollbar comes back as a second, misaligned thumb alongside it.
    "& .MuiDataGrid-scrollbar": {
      scrollbarWidth: "thin",
      scrollbarColor: `${theme.palette.action.disabled} transparent`,
    },
    "& .MuiDataGrid-scrollbar::-webkit-scrollbar": {
      width: 10,
      height: 10,
    },
    "& .MuiDataGrid-scrollbar::-webkit-scrollbar-track": {
      backgroundColor: "transparent",
    },
    "& .MuiDataGrid-scrollbar::-webkit-scrollbar-thumb": {
      backgroundColor: theme.palette.action.disabled,
      borderRadius: 8,
      border: "2px solid transparent",
      backgroundClip: "content-box",
    },
    "& .MuiDataGrid-scrollbar::-webkit-scrollbar-thumb:hover": {
      backgroundColor: theme.palette.action.active,
    },
    // The filler square where the vertical and horizontal scrollbars meet
    // (`ScrollbarCorner` in MUI's source — it carries no `MuiDataGrid-*`
    // class to target, so this is the only selector that reaches it) is just
    // an empty spacer, but `overflow: scroll` makes the browser paint a
    // native scrollbar corner there regardless — a plain white square that
    // ignores the theme. It's aria-hidden and non-interactive, so hiding its
    // overflow instead just leaves blank space, matching the grid behind it.
    "& div[aria-hidden='true']:not(.MuiDataGrid-scrollbar)": {
      overflow: "hidden",
    },
    "& .MuiDataGrid-cell": { userSelect: "none" },
    "& .MuiDataGrid-cell--editing": { userSelect: "text" },
    "& .multi-selected-cell": { backgroundColor: "action.selected" },
    "& .drag-over-row": { boxShadow: `inset 0 2px 0 0 ${theme.palette.primary.main}` },
    "& .dragging-row": { opacity: 0.5 },
    "& .copied-cell": { position: "relative" },
    "& .copied-cell::before, & .copied-cell::after": {
      content: '""',
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
    },
    "& .copied-cell::before": {
      backgroundImage:
        "linear-gradient(90deg, var(--ants-top, transparent) 50%, transparent 0)," +
        "linear-gradient(90deg, var(--ants-bottom, transparent) 50%, transparent 0)",
      backgroundSize: "8px 2px, 8px 2px",
      backgroundRepeat: "repeat-x, repeat-x",
      animation: "marching-ants-x 0.5s linear infinite",
    },
    "& .copied-cell::after": {
      backgroundImage:
        "linear-gradient(0deg, var(--ants-left, transparent) 50%, transparent 0)," +
        "linear-gradient(0deg, var(--ants-right, transparent) 50%, transparent 0)",
      backgroundSize: "2px 8px, 2px 8px",
      backgroundRepeat: "repeat-y, repeat-y",
      animation: "marching-ants-y 0.5s linear infinite",
    },
    "& .copied-side-top": { "--ants-top": theme.palette.primary.main },
    "& .copied-side-bottom": { "--ants-bottom": theme.palette.primary.main },
    "& .copied-side-left": { "--ants-left": theme.palette.primary.main },
    "& .copied-side-right": { "--ants-right": theme.palette.primary.main },
    "@keyframes marching-ants-x": {
      from: { backgroundPosition: "0px 0%, 0px 100%" },
      to: { backgroundPosition: "8px 0%, 8px 100%" },
    },
    "@keyframes marching-ants-y": {
      from: { backgroundPosition: "0% 0px, 100% 0px" },
      to: { backgroundPosition: "0% 8px, 100% 8px" },
    },
  } as const;
}

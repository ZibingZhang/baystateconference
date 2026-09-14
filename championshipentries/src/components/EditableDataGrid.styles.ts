import type { Theme } from "@mui/material/styles";

export function marchingAntsSx(theme: Theme) {
  return {
    "& .MuiDataGrid-cell": { userSelect: "none" },
    "& .MuiDataGrid-cell--editing": { userSelect: "text" },
    "& .multi-selected-cell": { backgroundColor: "action.selected" },
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

import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import type { SxProps, Theme } from "@mui/material/styles";

interface GridSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  sx?: SxProps<Theme>;
}

function GridSearchField({ value, onChange, sx }: GridSearchFieldProps) {
  return (
    <TextField
      size="small"
      placeholder="Search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={[{ minWidth: 180, flexShrink: 0 }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
      slotProps={{
        input: {
          startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.5, color: "action.active" }} />,
          endAdornment: value ? (
            <IconButton
              size="small"
              edge="end"
              aria-label="Clear search"
              onClick={() => onChange("")}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          ) : undefined,
        },
      }}
    />
  );
}

export default GridSearchField;

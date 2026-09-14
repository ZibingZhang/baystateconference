import Box from "@mui/material/Box";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import type { GridColDef } from "@mui/x-data-grid";
import FilterableSingleSelectEditCell from "./FilterableSingleSelectEditCell";

function withSelectIcon<T extends { id: string }>(
  column: GridColDef<T>,
  onInvalidCommit: () => void,
): GridColDef<T> {
  if (column.type !== "singleSelect") return column;
  const withEditCell: GridColDef<T> = column.renderEditCell
    ? column
    : {
        ...column,
        renderEditCell: (params) => (
          <FilterableSingleSelectEditCell {...params} onInvalidCommit={onInvalidCommit} />
        ),
      };
  if (withEditCell.renderCell) return withEditCell;
  return {
    ...withEditCell,
    renderCell: (params) => (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <Box
          component="span"
          sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {params.formattedValue as string}
        </Box>
        <ArrowDropDownIcon fontSize="small" sx={{ color: "action.active", flexShrink: 0 }} />
      </Box>
    ),
  };
}

export default withSelectIcon;

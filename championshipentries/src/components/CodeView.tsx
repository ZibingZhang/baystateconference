import Box from "@mui/material/Box";

function CodeView({ text }: { text: string }) {
  return (
    <Box
      component="pre"
      sx={{
        flex: 1,
        minHeight: 0,
        m: 0,
        p: 1.5,
        overflow: "auto",
        fontFamily: "monospace",
        fontSize: 12,
        bgcolor: "action.hover",
        borderRadius: 1,
        whiteSpace: "pre",
      }}
    >
      {text}
    </Box>
  );
}

export default CodeView;

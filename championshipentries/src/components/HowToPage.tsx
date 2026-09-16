import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import ReactMarkdown, { type Components } from "react-markdown";
import howToMarkdown from "../content/how-to.md?raw";

const sectionHeaderSx = { fontWeight: 700, mt: 3, mb: 1 } as const;
const listSx = { m: 0, mb: 1, pl: 3, display: "flex", flexDirection: "column", gap: 0.5 } as const;

const components: Components = {
  h1: ({ children }) => (
    <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
      {children}
    </Typography>
  ),
  h2: ({ children }) => <Typography variant="h6" sx={sectionHeaderSx}>{children}</Typography>,
  p: ({ children }) => (
    <Typography variant="body2" sx={{ mb: 1 }}>
      {children}
    </Typography>
  ),
  ul: ({ children }) => (
    <Box component="ul" sx={listSx}>
      {children}
    </Box>
  ),
  li: ({ children }) => (
    <Typography component="li" variant="body2">
      {children}
    </Typography>
  ),
  strong: ({ children }) => <strong>{children}</strong>,
  code: ({ children }) => (
    <Box component="code" sx={{ fontFamily: "monospace", fontSize: "0.9em" }}>
      {children}
    </Box>
  ),
  hr: () => <Divider sx={{ my: 3 }} />,
};

function HowToPage() {
  return (
    <Box sx={{ height: "100%", overflowY: "auto" }}>
      <Box sx={{ p: 3, maxWidth: 720, mx: "auto" }}>
        <ReactMarkdown components={components}>{howToMarkdown}</ReactMarkdown>
      </Box>
    </Box>
  );
}

export default HowToPage;

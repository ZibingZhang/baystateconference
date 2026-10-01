import { useMemo } from "react";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import MarkdownPage from "./MarkdownPage";
import aboutMarkdown from "../content/about.md?raw";

// Character codes for the email, kept out of the page's source/markup as plain
// text so address-harvesting bots can't scrape it.
const CONTACT_EMAIL_CODES = [
  99, 104, 97, 109, 112, 105, 111, 110, 115, 104, 105, 112, 101, 110, 116, 114, 105, 101, 115, 64,
  122, 105, 98, 105, 110, 103, 122, 104, 97, 110, 103, 46, 99, 111, 109,
];

function AboutPage() {
  const email = useMemo(() => String.fromCharCode(...CONTACT_EMAIL_CODES), []);

  return (
    <MarkdownPage markdown={aboutMarkdown}>
      <Typography variant="body2">
        Email <Link href={`mailto:${email}`}>{email}</Link>
      </Typography>
    </MarkdownPage>
  );
}

export default AboutPage;

import MarkdownPage from "./MarkdownPage";
import aboutMarkdown from "../content/about.md?raw";

function AboutPage() {
  return <MarkdownPage markdown={aboutMarkdown} />;
}

export default AboutPage;

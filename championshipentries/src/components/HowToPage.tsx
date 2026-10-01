import MarkdownPage from "./MarkdownPage";
import howToMarkdown from "../content/how-to.md?raw";

function HowToPage() {
  return <MarkdownPage markdown={howToMarkdown} />;
}

export default HowToPage;

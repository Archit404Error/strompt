import { PromptRenderer } from "./promptRenderer";
import { PromptRendererSpec } from "./types";

const markdownRendererSpec: PromptRendererSpec = {
  renderPrompt(renderedSubNodes) {
    return renderedSubNodes.join("\n\n");
  },
  renderSection(title, renderedSubNodes) {
    return `<${title}>${renderedSubNodes}</${title}>`;
  },
  renderSubsection(renderedSubNodes) {
    return renderedSubNodes.join("\n");
  },
  renderSectionHeader(text) {
    return `# ${text}`;
  },
  renderSectionSubheader(text) {
    return `## ${text}`;
  },
  renderSectionText(text) {
    return text;
  },
  renderSectionDocumentList(title, boundary, documentType, documents) {
    const renderedDocuments = documents
      .map((document, idx) => {
        `[${documentType} ${idx}]\n${document}`;
      })
      .join("\n\n");

    return `${title}:\n<${boundary}>${renderedDocuments}</${boundary}>`;
  },
  renderSectionOrderedList(title, bullets) {
    const renderedBullets = bullets
      .map((bullet, idx) => `${idx}. ${bullet}`)
      .join("\n");

    return `${title}:\n${renderedBullets}`;
  },
  renderSectionUnorderedList(title, bullets) {
    const renderedBullets = bullets.map((bullet) => `- ${bullet}`).join("\n");

    return `${title}:\n${renderedBullets}`;
  },
};

export class MarkdownPromptRenderer extends PromptRenderer {
  constructor() {
    super(markdownRendererSpec);
  }
}

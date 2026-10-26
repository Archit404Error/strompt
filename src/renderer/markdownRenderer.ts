import { PromptRenderer } from "./promptRenderer";
import { PromptRendererSpec } from "./types";

/**
 * Escapes all regex special characters in a given string
 * @param text string to escape
 * @returns regex-escaped string
 */
function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const markdownRendererSpec: PromptRendererSpec = {
  renderPrompt(renderedSubNodes) {
    return renderedSubNodes.join("\n\n");
  },
  renderSection(title, renderedSubNodes) {
    return `<${title}>\n${renderedSubNodes.join("\n\n")}\n</${title}>`;
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
        return `[${documentType} ${idx + 1}]\n${document}`;
      })
      .join("\n\n");

    return `${title}:\n<${boundary}>\n${renderedDocuments}\n</${boundary}>`;
  },
  renderSectionOrderedList(title, bullets) {
    const renderedBullets = bullets
      .map((bullet, idx) => `${idx + 1}. ${bullet}`)
      .join("\n");

    return `${title}:\n${renderedBullets}`;
  },
  renderSectionUnorderedList(title, bullets) {
    const renderedBullets = bullets.map((bullet) => `- ${bullet}`).join("\n");

    return `${title}:\n${renderedBullets}`;
  },
  normalizeContent(tagName, text) {
    if (!tagName) {
      return text;
    }

    // Matches opening, closing, and self-closing tags for exactly `tagName`, tolerating
    // case differences, inner whitespace, and attributes. Unterminated tags also match,
    // since a later boundary tag's `>` could close them
    const conflictingTag = new RegExp(
      `<\\s*/?\\s*${escapeRegex(tagName)}(?=[\\s/>]|$)[^<>]*>?`,
      "gi",
    );

    // A trailing `<` could combine with the start of the next rendered node to form a
    // conflicting tag, so it is escaped regardless of `tagName`
    const danglingTagStart = /<(\s*\/?\s*)$/;

    return text
      .replace(conflictingTag, (tag) =>
        tag.replace(/</g, "&lt;").replace(/>/g, "&gt;"),
      )
      .replace(danglingTagStart, "&lt;$1");
  },
};

export class MarkdownPromptRenderer extends PromptRenderer {
  constructor() {
    super(markdownRendererSpec);
  }
}

export interface PromptNode {
  /**
   * Renders this prompt node's prompt tree as a string
   *
   * @returns The rendered prompt tree, as a string
   */
  render: () => string;
}

export interface PromptRendererSpec {
  /**
   * Renders the root prompt node
   *
   * @param renderedSubNodes an array of all rendered sub nodes of the root node
   * @returns The entire rendered prompt, as a string
   */
  renderPrompt: (renderedSubNodes: string[]) => string;

  /**
   * Renders a prompt section
   *
   * @param title section title
   * @param renderedSubNodes an array of all rendered sub nodes of this node
   * @returns The entire rendered section, as a string
   */
  renderSection: (title: string, renderedSubNodes: string[]) => string;

  /**
   * Renders a prompt subsection
   *
   * @param renderedSubNodes an array of all rendered sub nodes of this node
   * @returns The entire rendered subsection, as a string
   */
  renderSubsection: (renderedSubNodes: string[]) => string;

  /**
   * Renders a section header
   *
   * @param text section header text content
   * @returns The rendered section header, as a string
   */
  renderSectionHeader: (text: string) => string;

  /**
   * Renders a section subheader
   *
   * @param text section subheader text content
   * @returns The rendered section subheader, as a string
   */
  renderSectionSubheader: (text: string) => string;

  /**
   * Renders section text
   *
   * @param text section text content
   * @returns The rendered section text, as a string
   */
  renderSectionText: (text: string) => string;

  /**
   * Renders an ordered list
   *
   * @param title list title
   * @param bullets chronologically ordered list bullets
   * @returns The rendered list, as a string
   */
  renderSectionOrderedList: (title: string, bullets: string[]) => string;

  /**
   * Renders an unordered list
   *
   * @param title list title
   * @param bullets chronologically ordered list bullets
   * @returns The rendered list, as a string
   */
  renderSectionUnorderedList: (title: string, bullets: string[]) => string;

  /**
   * Renders a list of documents
   *
   * @param title list title
   * @param boundary boundary string to mark list start and end
   * @param documentType type of document being listed
   * @param documents a chronologically ordered array of documents
   * @returns The rendered list, as a string
   */
  renderSectionDocumentList: (
    title: string,
    boundary: string,
    documentType: string,
    documents: string[],
  ) => string;
}

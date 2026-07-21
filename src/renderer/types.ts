export interface PromptNode {
  render: () => string;
}

export interface PromptRendererSpec {
  renderPrompt: (renderedSubNodes: string[]) => string;
  renderSection: (title: string, renderedSubNodes: string[]) => string;
  renderSubsection: (renderedSubNodes: string[]) => string;
  renderSectionHeader: (text: string) => string;
  renderSectionSubheader: (text: string) => string;
  renderSectionText: (text: string) => string;
  renderSectionOrderedList: (title: string, bullets: string[]) => string;
  renderSectionUnorderedList: (title: string, bullets: string[]) => string;
  renderSectionDocumentList: (
    title: string,
    boundary: string,
    documentType: string,
    documents: string[],
  ) => string;
}

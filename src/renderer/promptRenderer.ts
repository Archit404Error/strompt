import { PromptNode, PromptRendererSpec } from "./types";

class SectionHeader {
  private spec: PromptRendererSpec;
  private text: string;

  constructor(spec: PromptRendererSpec, text: string) {
    this.spec = spec;
    this.text = text;
  }

  public render() {
    return this.spec.renderSectionHeader(this.text);
  }
}

class SectionSubheader implements PromptNode {
  private spec: PromptRendererSpec;
  private text: string;

  constructor(spec: PromptRendererSpec, text: string) {
    this.spec = spec;
    this.text = text;
  }

  public render() {
    return this.spec.renderSectionSubheader(this.text);
  }
}

class SectionText implements PromptNode {
  private spec: PromptRendererSpec;
  private text: string;

  constructor(spec: PromptRendererSpec, text: string) {
    this.spec = spec;
    this.text = text;
  }

  public render() {
    return this.spec.renderSectionText(this.text);
  }
}

abstract class SectionList implements PromptNode {
  protected spec: PromptRendererSpec;
  protected title: string;
  protected bullets: string[];

  constructor(spec: PromptRendererSpec, title: string) {
    this.spec = spec;
    this.title = title;
    this.bullets = [];
  }

  /**
   * Adds a bullet point to this list
   *
   * @param text bullet content
   * @returns The current instance
   */
  public bullet(text: string) {
    this.bullets.push(text);

    return this;
  }

  public abstract render(): string;
}

class SectionOrderedList extends SectionList {
  public render() {
    return this.spec.renderSectionOrderedList(this.title, this.bullets);
  }
}

class SectionUnorderedList extends SectionList {
  public render() {
    return this.spec.renderSectionUnorderedList(this.title, this.bullets);
  }
}

class SectionDocumentList implements PromptNode {
  private spec: PromptRendererSpec;
  private title: string;
  private boundary: string;
  private documentType: string;
  private documents: string[];

  constructor(
    spec: PromptRendererSpec,
    title: string,
    boundary: string,
    documentType: string,
  ) {
    this.spec = spec;
    this.title = title;
    this.boundary = boundary;
    this.documentType = documentType;
    this.documents = [];
  }

  /**
   * Adds a document to this document list
   *
   * @param text the stringified document
   * @returns The current `SectionDocumentList` instance
   */
  public document(text: string) {
    this.documents.push(text);

    return this;
  }

  public render() {
    return this.spec.renderSectionDocumentList(
      this.title,
      this.boundary,
      this.documentType,
      this.documents,
    );
  }
}

class PromptSubsection implements PromptNode {
  private spec: PromptRendererSpec;
  private children: PromptNode[];

  constructor(spec: PromptRendererSpec, header: string) {
    this.spec = spec;
    this.children = [new SectionHeader(this.spec, header)];
  }

  /**
   * Adds a subheader to this subsection
   *
   * @param text subheader text content
   * @returns The current `PromptSubsection` instance
   */
  public subheader(text: string) {
    this.children.push(new SectionSubheader(this.spec, text));

    return this;
  }

  /**
   * Adds text to this subsection
   *
   * @param text text content
   * @returns The current `PromptSubsection` instance
   */
  public text(text: string) {
    this.children.push(new SectionText(this.spec, text));

    return this;
  }

  /**
   * Adds an ordered list to this subsection
   *
   * @param title list title
   * @param buildOrderedList optionally, a callback that runs on the created ordered
   *  list to add bullets
   * @returns The current `PromptSubsection` instance
   */
  public orderedList(
    title: string,
    buildOrderedList?: (orderedList: SectionOrderedList) => void,
  ) {
    const orderedList = new SectionOrderedList(this.spec, title);

    buildOrderedList?.(orderedList);

    this.children.push(orderedList);

    return this;
  }

  /**
   * Adds an unordered list to this subsection
   *
   * @param title list title
   * @param buildUnorderedList optionally, a callback that runs on the created unordered
   *  list to add bullets
   * @returns The current `PromptSubsection` instance
   */
  public unorderedList(
    title: string,
    buildUnorderedList?: (unorderedList: SectionUnorderedList) => void,
  ) {
    const unorderedList = new SectionUnorderedList(this.spec, title);

    buildUnorderedList?.(unorderedList);

    this.children.push(unorderedList);

    return this;
  }

  /**
   * Adds a document list to this subsection
   *
   * @param title list title
   * @param boundary boundary string to mark list start and end
   * @param documentType type of document being listed
   * @param buildDocumentList optionally, a callback that runs on the newly created
   *  document list to add documents
   * @returns The current `PromptSubsection` instance
   */
  public documents(
    title: string,
    boundary: string,
    documentType: string,
    buildDocumentList?: (documentList: SectionDocumentList) => void,
  ) {
    const documentList = new SectionDocumentList(
      this.spec,
      title,
      boundary,
      documentType,
    );

    buildDocumentList?.(documentList);

    this.children.push(documentList);

    return this;
  }

  public render() {
    return this.spec.renderSubsection(
      this.children.map((child) => child.render()),
    );
  }
}

class PromptSection implements PromptNode {
  private spec: PromptRendererSpec;
  private title: string;
  private children: PromptNode[];

  constructor(spec: PromptRendererSpec, title: string) {
    this.spec = spec;
    this.title = title;
    this.children = [];
  }

  /**
   * Creates a subsection within this `PromptSection`
   *
   * @param header subsection title
   * @param buildSubsection optionally, a callback that runs on the created subsection to add subnodes
   * @returns The current `PromptSection` instance
   */
  public subsection(
    header: string,
    buildSubsection?: (subsection: PromptSubsection) => void,
  ) {
    const subsection = new PromptSubsection(this.spec, header);

    buildSubsection?.(subsection);

    this.children.push(subsection);

    return this;
  }

  public render() {
    return this.spec.renderSection(
      this.title,
      this.children.map((child) => child.render()),
    );
  }
}

export class PromptRenderer implements PromptNode {
  private spec: PromptRendererSpec;
  private children: PromptNode[];

  /**
   * Initializes a new `PromptRenderer` instance
   *
   * @param spec a `PromptRendererSpec` instance that specifies rendering methods for
   *  every `PromptNode`
   */
  constructor(spec: PromptRendererSpec) {
    this.spec = spec;
    this.children = [];
  }

  /**
   * Adds a new prompt section
   *
   * @param name the name of the section
   * @param buildSection optionally, a callback that runs on the created section to add
   *  subnodes
   * @returns The current `PromptRenderer` instance
   */
  public section(
    name: string,
    buildSection?: (section: PromptSection) => void,
  ) {
    const section = new PromptSection(this.spec, name);

    buildSection?.(section);

    this.children.push(section);

    return this;
  }

  /**
   * Renders the prompt tree for this renderer instance
   *
   * @returns The rendered prompt, as a string
   */
  public render() {
    return this.spec.renderPrompt(this.children.map((child) => child.render()));
  }

  /**
   * Overrides rendering logic for this renderer instance
   *
   * @param overriddenSpec a partial `PromptRendererSpec` consisting of rendering methods
   *  to override
   */
  public overrideSpec(overriddenSpec: Partial<PromptRendererSpec>) {
    Object.assign<PromptRendererSpec, Partial<PromptRendererSpec>>(
      this.spec,
      overriddenSpec,
    );
  }
}

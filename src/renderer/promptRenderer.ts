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

  public subheader(text: string) {
    this.children.push(new SectionSubheader(this.spec, text));

    return this;
  }

  public text(text: string) {
    this.children.push(new SectionText(this.spec, text));

    return this;
  }

  public orderedList(
    title: string,
    buildOrderedList?: (orderedList: SectionOrderedList) => void,
  ) {
    const orderedList = new SectionOrderedList(this.spec, title);

    buildOrderedList?.(orderedList);

    this.children.push(orderedList);

    return this;
  }

  public unorderedList(
    title: string,
    buildUnorderedList?: (unorderedList: SectionUnorderedList) => void,
  ) {
    const unorderedList = new SectionUnorderedList(this.spec, title);

    buildUnorderedList?.(unorderedList);

    this.children.push(unorderedList);

    return this;
  }

  public documents(
    prefix: string,
    boundary: string,
    documentName: string,
    buildDocumentList?: (documentList: SectionDocumentList) => void,
  ) {
    const documentList = new SectionDocumentList(
      this.spec,
      prefix,
      boundary,
      documentName,
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

  constructor(spec: PromptRendererSpec) {
    this.spec = spec;
    this.children = [];
  }

  public section(
    name: string,
    buildSection?: (section: PromptSection) => void,
  ) {
    const section = new PromptSection(this.spec, name);

    buildSection?.(section);

    this.children.push(section);

    return this;
  }

  public render() {
    return this.spec.renderPrompt(this.children.map((child) => child.render()));
  }

  public overrideSpec(overriddenSpec: Partial<PromptRendererSpec>) {
    Object.assign<PromptRendererSpec, Partial<PromptRendererSpec>>(
      this.spec,
      overriddenSpec,
    );
  }
}

import { describe, expect, it, vi } from "vitest";
import { PromptRenderer } from "../../src/renderer/promptRenderer";
import { PromptRendererSpec } from "../../src/renderer/types";

function createSpec(
  overrides: Partial<PromptRendererSpec> = {},
): PromptRendererSpec {
  return {
    renderPrompt: (nodes) => nodes.join(" | "),
    renderSection: (title, nodes) => `section[${title}]{${nodes.join(", ")}}`,
    renderSubsection: (nodes) => `sub{${nodes.join(", ")}}`,
    renderSectionHeader: (text) => `H:${text}`,
    renderSectionSubheader: (text) => `SH:${text}`,
    renderSectionText: (text) => `T:${text}`,
    renderSectionOrderedList: (title, bullets) =>
      `OL:${title}[${bullets.join(";")}]`,
    renderSectionUnorderedList: (title, bullets) =>
      `UL:${title}[${bullets.join(";")}]`,
    renderSectionDocumentList: (title, boundary, documentType, documents) =>
      `DL:${title}<${boundary}>${documentType}[${documents.join(";")}]`,
    normalizeContent: (tagName, text) => `${tagName}(${text})`,
    ...overrides,
  };
}

type BuildSection = NonNullable<Parameters<PromptRenderer["section"]>[1]>;
type PromptSection = Parameters<BuildSection>[0];
type BuildSubsection = NonNullable<Parameters<PromptSection["subsection"]>[1]>;

function renderSubsection(spec: PromptRendererSpec, build: BuildSubsection) {
  return new PromptRenderer(spec)
    .section("s", (section) => section.subsection("head", build))
    .render();
}

describe("PromptRenderer normalization", () => {
  it("normalizes headers, subheaders, and text against the section title", () => {
    expect(
      renderSubsection(createSpec(), (sub) =>
        sub.subheader("subhead").text("body"),
      ),
    ).toBe("section[s]{sub{H:s(head), SH:s(subhead), T:s(body)}}");
  });

  it("does not normalize the section title itself", () => {
    const renderSection = vi.fn(() => "");

    new PromptRenderer(createSpec({ renderSection }))
      .section("</s>", (section) => section.subsection("h"))
      .render();

    expect(renderSection).toHaveBeenCalledWith("</s>", expect.any(Array));
  });

  it("normalizes list titles and bullets against the section title", () => {
    expect(
      renderSubsection(createSpec(), (sub) =>
        sub
          .orderedList("ol", (list) => list.bullet("a").bullet("b"))
          .unorderedList("ul", (list) => list.bullet("c")),
      ),
    ).toBe("section[s]{sub{H:s(head), OL:s(ol)[s(a);s(b)], UL:s(ul)[s(c)]}}");
  });

  it("normalizes documents against the section title, then the boundary", () => {
    expect(
      renderSubsection(createSpec(), (sub) =>
        sub.documents("files", "b", "File", (list) =>
          list.document("x").document("y"),
        ),
      ),
    ).toBe("section[s]{sub{H:s(head), DL:s(files)<b>b(s(File))[b(s(x));b(s(y))]}}");
  });

  it("passes the document list boundary through unnormalized", () => {
    const renderSectionDocumentList = vi.fn(() => "");

    renderSubsection(createSpec({ renderSectionDocumentList }), (sub) =>
      sub.documents("files", "</b>", "File"),
    );

    expect(renderSectionDocumentList).toHaveBeenCalledWith(
      "s(files)",
      "</b>",
      "</b>(s(File))",
      [],
    );
  });

  it("calls normalizeContent once per piece of content per enclosing tag", () => {
    const normalizeContent = vi.fn((_: string, text: string) => text);

    renderSubsection(createSpec({ normalizeContent }), (sub) =>
      sub
        .text("t")
        .unorderedList("ul", (list) => list.bullet("a"))
        .documents("files", "b", "File", (list) => list.document("d")),
    );

    expect(normalizeContent.mock.calls).toEqual([
      ["s", "head"],
      ["s", "t"],
      ["s", "ul"],
      ["s", "a"],
      ["s", "files"],
      ["s", "File"],
      ["b", "File"],
      ["s", "d"],
      ["b", "d"],
    ]);
  });

  it("renders content as-is when the spec has no normalizeContent", () => {
    const { normalizeContent: _, ...specWithoutNormalization } = createSpec();

    expect(
      renderSubsection(specWithoutNormalization, (sub) =>
        sub
          .text("</s>")
          .documents("files", "b", "File", (list) => list.document("</b>")),
      ),
    ).toBe("section[s]{sub{H:head, T:</s>, DL:files<b>File[</b>]}}");
  });

  it("normalizes at render time, so later spec overrides apply", () => {
    const renderer = new PromptRenderer(createSpec()).section("s", (section) =>
      section.subsection("head", (sub) => sub.text("body")),
    );

    renderer.overrideSpec({ normalizeContent: (tag, text) => `[${tag}]${text}` });

    expect(renderer.render()).toBe("section[s]{sub{H:[s]head, T:[s]body}}");
  });

  it("does not compound normalization across repeated renders", () => {
    const renderer = new PromptRenderer(createSpec()).section("s", (section) =>
      section.subsection("head", (sub) => sub.text("body")),
    );

    expect(renderer.render()).toBe(renderer.render());
  });
});

describe("PromptRenderer spec ownership", () => {
  it("does not mutate the spec passed to the constructor", () => {
    const spec = createSpec();
    const originalRenderSectionText = spec.renderSectionText;

    new PromptRenderer(spec).overrideSpec({ renderSectionText: () => "x" });

    expect(spec.renderSectionText).toBe(originalRenderSectionText);
  });

  it("does not share overrides between renderers built from the same spec", () => {
    const spec = createSpec();
    const overridden = new PromptRenderer(spec);
    const untouched = new PromptRenderer(spec);

    overridden.overrideSpec({ renderSectionText: (text) => `X:${text}` });

    const build = (renderer: PromptRenderer) =>
      renderer
        .section("s", (section) =>
          section.subsection("head", (sub) => sub.text("body")),
        )
        .render();

    expect(build(overridden)).toBe("section[s]{sub{H:s(head), X:s(body)}}");
    expect(build(untouched)).toBe("section[s]{sub{H:s(head), T:s(body)}}");
  });
});

describe("PromptRenderer builder", () => {
  it("renders an empty prompt", () => {
    expect(new PromptRenderer(createSpec()).render()).toBe("");
  });

  it("allows sections, subsections, and lists without build callbacks", () => {
    expect(
      new PromptRenderer(createSpec())
        .section("empty")
        .section("s", (section) =>
          section.subsection("head", (sub) =>
            sub.orderedList("ol").unorderedList("ul").documents("d", "b", "D"),
          ),
        )
        .render(),
    ).toBe(
      "section[empty]{} | section[s]{sub{H:s(head), OL:s(ol)[], UL:s(ul)[], DL:s(d)<b>b(s(D))[]}}",
    );
  });

  it("returns the same instance from every builder method for chaining", () => {
    const renderer = new PromptRenderer(createSpec());

    expect(
      renderer.section("s", (section) => {
        expect(section.subsection("h", (sub) => {
          expect(sub.text("t")).toBe(sub);
          expect(sub.subheader("sh")).toBe(sub);
          expect(sub.orderedList("ol", (list) => {
            expect(list.bullet("b")).toBe(list);
          })).toBe(sub);
          expect(sub.unorderedList("ul")).toBe(sub);
          expect(sub.documents("d", "b", "D", (list) => {
            expect(list.document("doc")).toBe(list);
          })).toBe(sub);
        })).toBe(section);
      }),
    ).toBe(renderer);
  });

  it("preserves insertion order of sections and children", () => {
    expect(
      new PromptRenderer(createSpec({ normalizeContent: (_, text) => text }))
        .section("a", (section) =>
          section
            .subsection("1", (sub) => sub.text("x").text("y"))
            .subsection("2"),
        )
        .section("b")
        .render(),
    ).toBe("section[a]{sub{H:1, T:x, T:y}, sub{H:2}} | section[b]{}");
  });
});

import { describe, expect, it } from "vitest";
import { markdownRendererSpec as spec } from "../../src/renderer/markdownRenderer";

describe("markdownRendererSpec", () => {
  it("renderPrompt separates sections with a blank line", () => {
    expect(spec.renderPrompt(["a", "b", "c"])).toBe("a\n\nb\n\nc");
  });

  it("renderPrompt renders an empty prompt as an empty string", () => {
    expect(spec.renderPrompt([])).toBe("");
  });

  it("renderSection wraps subnodes in tags named after the title", () => {
    expect(spec.renderSection("task", ["one", "two"])).toBe(
      "<task>\none\n\ntwo\n</task>",
    );
  });

  it("renderSection renders an empty section", () => {
    expect(spec.renderSection("task", [])).toBe("<task>\n\n</task>");
  });

  it("renderSubsection joins subnodes with newlines", () => {
    expect(spec.renderSubsection(["# h", "text"])).toBe("# h\ntext");
  });

  it("renders headers and subheaders as markdown headings", () => {
    expect(spec.renderSectionHeader("Title")).toBe("# Title");
    expect(spec.renderSectionSubheader("Sub")).toBe("## Sub");
  });

  it("renderSectionText returns text as-is", () => {
    expect(spec.renderSectionText("hello\nworld")).toBe("hello\nworld");
  });

  it("renderSectionOrderedList numbers bullets from 1", () => {
    expect(spec.renderSectionOrderedList("Steps", ["a", "b", "c"])).toBe(
      "Steps:\n1. a\n2. b\n3. c",
    );
  });

  it("renderSectionUnorderedList prefixes bullets with dashes", () => {
    expect(spec.renderSectionUnorderedList("Notes", ["a", "b"])).toBe(
      "Notes:\n- a\n- b",
    );
  });

  it("renderSectionDocumentList labels and wraps documents in the boundary", () => {
    expect(
      spec.renderSectionDocumentList("Files", "files", "File", ["x", "y"]),
    ).toBe("Files:\n<files>\n[File 1]\nx\n\n[File 2]\ny\n</files>");
  });

  it("renderSectionDocumentList renders an empty list", () => {
    expect(spec.renderSectionDocumentList("Files", "files", "File", [])).toBe(
      "Files:\n<files>\n\n</files>",
    );
  });

  it("does not normalize content itself", () => {
    expect(spec.renderSectionText("</task>")).toBe("</task>");
    expect(spec.renderSection("task", ["</task>"])).toBe(
      "<task>\n</task>\n</task>",
    );
  });
});

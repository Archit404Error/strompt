import { describe, expect, it } from "vitest";
import { MarkdownPromptRenderer } from "../../src";

function buildTaskPrompt(renderer: MarkdownPromptRenderer, text: string) {
  return renderer.section("task", (section) =>
    section.subsection("Inputs", (sub) => sub.text(text)),
  );
}

describe("MarkdownPromptRenderer.overrideSpec", () => {
  it("can replace the normalization strategy", () => {
    const renderer = new MarkdownPromptRenderer();
    renderer.overrideSpec({
      normalizeContent: (tagName, text) =>
        text.replaceAll(`</${tagName}>`, `[/${tagName}]`),
    });

    expect(buildTaskPrompt(renderer, "</task> hi").render()).toBe(
      "<task>\n# Inputs\n[/task] hi\n</task>",
    );
  });

  it("can disable normalization", () => {
    const renderer = new MarkdownPromptRenderer();
    renderer.overrideSpec({ normalizeContent: (_, text) => text });

    expect(buildTaskPrompt(renderer, "</task> hi").render()).toBe(
      "<task>\n# Inputs\n</task> hi\n</task>",
    );
  });

  it("passes already-normalized content to overridden render methods", () => {
    const received: string[] = [];
    const renderer = new MarkdownPromptRenderer();
    renderer.overrideSpec({
      renderSectionText(text) {
        received.push(text);
        return text.toUpperCase();
      },
    });

    expect(buildTaskPrompt(renderer, "</task> hi").render()).toBe(
      "<task>\n# Inputs\n&LT;/TASK&GT; HI\n</task>",
    );
    expect(received).toEqual(["&lt;/task&gt; hi"]);
  });

  it("does not leak overrides into other instances", () => {
    const existing = buildTaskPrompt(new MarkdownPromptRenderer(), "hi");

    new MarkdownPromptRenderer().overrideSpec({
      renderSectionText: (text) => `OVERRIDDEN ${text}`,
    });

    const expected = "<task>\n# Inputs\nhi\n</task>";
    expect(existing.render()).toBe(expected);
    expect(buildTaskPrompt(new MarkdownPromptRenderer(), "hi").render()).toBe(
      expected,
    );
  });

  it("applies overrides to sections built before the override", () => {
    const renderer = buildTaskPrompt(new MarkdownPromptRenderer(), "hi");

    renderer.overrideSpec({ renderSectionText: (text) => `OVERRIDDEN ${text}` });

    expect(renderer.render()).toBe("<task>\n# Inputs\nOVERRIDDEN hi\n</task>");
  });
});

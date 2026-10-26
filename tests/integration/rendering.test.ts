import { describe, expect, it } from "vitest";
import { MarkdownPromptRenderer } from "../../src";

describe("MarkdownPromptRenderer rendering", () => {
  it("renders a full prompt with every node type", () => {
    const prompt = new MarkdownPromptRenderer()
      .section("role", (section) =>
        section.subsection("Identity", (sub) =>
          sub.text("You are a helpful assistant."),
        ),
      )
      .section("task", (section) =>
        section
          .subsection("Instructions", (sub) =>
            sub
              .subheader("Steps")
              .orderedList("Do this", (list) =>
                list.bullet("Read the files").bullet("Summarize them"),
              )
              .unorderedList("Constraints", (list) =>
                list.bullet("Be concise").bullet("Cite sources"),
              ),
          )
          .subsection("Inputs", (sub) =>
            sub.documents("Files", "files", "File", (list) =>
              list.document("first file").document("second file"),
            ),
          ),
      )
      .render();

    expect(prompt).toBe(
      [
        "<role>",
        "# Identity",
        "You are a helpful assistant.",
        "</role>",
        "",
        "<task>",
        "# Instructions",
        "## Steps",
        "Do this:",
        "1. Read the files",
        "2. Summarize them",
        "Constraints:",
        "- Be concise",
        "- Cite sources",
        "",
        "# Inputs",
        "Files:",
        "<files>",
        "[File 1]",
        "first file",
        "",
        "[File 2]",
        "second file",
        "</files>",
        "</task>",
      ].join("\n"),
    );
  });

  it("renders an empty prompt", () => {
    expect(new MarkdownPromptRenderer().render()).toBe("");
  });

  it("leaves ordinary markdown and unrelated tags in content untouched", () => {
    const content = "Use `<div>` tags, **bold**, & <context>quotes</context>.";

    expect(
      new MarkdownPromptRenderer()
        .section("task", (section) =>
          section.subsection("Notes", (sub) => sub.text(content)),
        )
        .render(),
    ).toBe(`<task>\n# Notes\n${content}\n</task>`);
  });

  it("renders multi-line documents verbatim", () => {
    const document = "line one\n\nline three\n  indented";

    expect(
      new MarkdownPromptRenderer()
        .section("task", (section) =>
          section.subsection("Inputs", (sub) =>
            sub.documents("Files", "files", "File", (list) =>
              list.document(document),
            ),
          ),
        )
        .render(),
    ).toContain(`[File 1]\n${document}\n</files>`);
  });
});

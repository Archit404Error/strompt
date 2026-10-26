import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MarkdownPromptRenderer } from "../../src";
import { markdownRendererSpec } from "../../src/renderer/markdownRenderer";

type FixtureNode =
  | { type: "text"; text: string }
  | { type: "subheader"; text: string }
  | { type: "orderedList"; title: string; bullets: string[] }
  | { type: "unorderedList"; title: string; bullets: string[] }
  | {
      type: "documents";
      title: string;
      boundary: string;
      documentType: string;
      documents: string[];
    };

interface FixtureSection {
  title: string;
  subsections: { header: string; nodes: FixtureNode[] }[];
}

interface RenderCase {
  name: string;
  prompt: FixtureSection[];
  expected: string[];
}

interface NormalizeCase {
  name: string;
  tagName: string;
  text: string;
  expected: string;
}

type FixtureFile =
  | { kind: "render"; description: string; cases: RenderCase[] }
  | { kind: "normalize"; description: string; cases: NormalizeCase[] };

const fixturesDir = fileURLToPath(
  new URL("../../../../spec/fixtures/", import.meta.url),
);

function render(prompt: FixtureSection[]) {
  const renderer = new MarkdownPromptRenderer();

  for (const { title, subsections } of prompt) {
    renderer.section(title, (section) => {
      for (const { header, nodes } of subsections) {
        section.subsection(header, (subsection) => {
          for (const node of nodes) {
            switch (node.type) {
              case "text":
                subsection.text(node.text);
                break;
              case "subheader":
                subsection.subheader(node.text);
                break;
              case "orderedList":
                subsection.orderedList(node.title, (list) => {
                  node.bullets.forEach((bullet) => list.bullet(bullet));
                });
                break;
              case "unorderedList":
                subsection.unorderedList(node.title, (list) => {
                  node.bullets.forEach((bullet) => list.bullet(bullet));
                });
                break;
              case "documents":
                subsection.documents(
                  node.title,
                  node.boundary,
                  node.documentType,
                  (list) => {
                    node.documents.forEach((document) => list.document(document));
                  },
                );
                break;
            }
          }
        });
      }
    });
  }

  return renderer.render();
}

const fixtureFiles = readdirSync(fixturesDir)
  .filter((file) => file.endsWith(".json"))
  .sort();

describe.each(fixtureFiles)("shared fixtures: %s", (file) => {
  const fixture: FixtureFile = JSON.parse(
    readFileSync(join(fixturesDir, file), "utf8"),
  );

  if (fixture.kind === "render") {
    it.each(fixture.cases)("$name", ({ prompt, expected }) => {
      expect(render(prompt)).toBe(expected.join("\n"));
    });
  } else {
    it.each(fixture.cases)("$name", ({ tagName, text, expected }) => {
      expect(markdownRendererSpec.normalizeContent!(tagName, text)).toBe(
        expected,
      );
    });
  }
});

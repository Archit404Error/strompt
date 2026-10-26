import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MarkdownPromptRenderer } from "../../src";
import { markdownRendererSpec } from "../../src/renderer/markdownRenderer";

const normalize = (tagName: string, text: string) =>
  markdownRendererSpec.normalizeContent!(tagName, text);

const asciiLower = (text: string) =>
  text.replace(/[A-Z]/g, (char) => char.toLowerCase());

const isWhitespace = (char: string | undefined) =>
  char !== undefined && /\s/.test(char);

/**
 * Independent oracle for the normalization regex: counts every `<` that begins a tag
 * an LLM could read as `tagName` (case-insensitive, optional whitespace and slash,
 * followed by whitespace, `/`, `>`, or the end of the text).
 */
function countConflictingTags(text: string, tagName: string) {
  const haystack = asciiLower(text);
  const name = asciiLower(tagName);
  let count = 0;

  for (let i = haystack.indexOf("<"); i !== -1; i = haystack.indexOf("<", i + 1)) {
    let j = i + 1;
    while (isWhitespace(haystack[j])) j++;
    if (haystack[j] === "/") j++;
    while (isWhitespace(haystack[j])) j++;

    if (!haystack.startsWith(name, j)) continue;

    const next = haystack[j + name.length];
    if (next === undefined || isWhitespace(next) || next === "/" || next === ">") {
      count++;
    }
  }

  return count;
}

const tagNameArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9._+-]{0,7}$/);

function caseVariantArb(tagName: string) {
  return fc
    .array(fc.boolean(), { minLength: tagName.length, maxLength: tagName.length })
    .map((flips) =>
      [...tagName]
        .map((char, idx) =>
          flips[idx] ? char.toUpperCase() : char.toLowerCase(),
        )
        .join(""),
    );
}

function injectionArb(tagName: string) {
  return fc
    .tuple(
      fc.constantFrom("", " ", "\n", "\t"),
      fc.constantFrom("", "/"),
      fc.constantFrom("", " "),
      caseVariantArb(tagName),
      fc.constantFrom("", " ", "/", " /", ' id="x"', "\n", " a=b"),
    )
    .map(
      ([lead, slash, gap, name, suffix]) =>
        `<${lead}${slash}${gap}${name}${suffix}>`,
    );
}

function adversarialTextArb(tagName: string) {
  return fc
    .array(
      fc.oneof(
        fc.string(),
        injectionArb(tagName),
        fc.constantFrom("<", ">", "</", "/>", `<${tagName}`, `${tagName}>`),
      ),
      { maxLength: 12 },
    )
    .map((parts) => parts.join(""));
}

const tagAndTextArb = tagNameArb.chain((tagName) =>
  fc.tuple(fc.constant(tagName), adversarialTextArb(tagName)),
);

const decodeEntities = (text: string) =>
  text.replaceAll("&lt;", "<").replaceAll("&gt;", ">");

describe("normalizeContent properties", () => {
  it("never leaves a conflicting tag", () => {
    fc.assert(
      fc.property(tagAndTextArb, ([tagName, text]) => {
        expect(countConflictingTags(normalize(tagName, text), tagName)).toBe(0);
      }),
      { numRuns: 1000 },
    );
  });

  it("leaves text without conflicting tags unchanged", () => {
    fc.assert(
      fc.property(tagNameArb, fc.string(), (tagName, text) => {
        fc.pre(countConflictingTags(text, tagName) === 0);
        fc.pre(!/<\s*\/?\s*$/.test(text));

        expect(normalize(tagName, text)).toBe(text);
      }),
      { numRuns: 1000 },
    );
  });

  it("is idempotent", () => {
    fc.assert(
      fc.property(tagAndTextArb, ([tagName, text]) => {
        const once = normalize(tagName, text);

        expect(normalize(tagName, once)).toBe(once);
      }),
    );
  });

  it("is reversible by decoding entities", () => {
    fc.assert(
      fc.property(tagAndTextArb, ([tagName, text]) => {
        fc.pre(!text.includes("&lt;") && !text.includes("&gt;"));

        expect(decodeEntities(normalize(tagName, text))).toBe(text);
      }),
    );
  });
});

describe("MarkdownPromptRenderer injection properties", () => {
  it("keeps exactly one pair of section boundary tags", () => {
    fc.assert(
      fc.property(tagAndTextArb, ([title, text]) => {
        const rendered = new MarkdownPromptRenderer()
          .section(title, (section) =>
            section.subsection(text, (sub) =>
              sub
                .text(text)
                .unorderedList(text, (list) => list.bullet(text)),
            ),
          )
          .render();

        expect(rendered.startsWith(`<${title}>\n`)).toBe(true);
        expect(rendered.endsWith(`\n</${title}>`)).toBe(true);
        expect(countConflictingTags(rendered, title)).toBe(2);
      }),
      { numRuns: 500 },
    );
  });

  it("keeps exactly one pair of tags for both the section and document list", () => {
    const arb = fc
      .tuple(tagNameArb, tagNameArb)
      .chain(([title, boundary]) =>
        fc.tuple(
          fc.constant(title),
          fc.constant(boundary),
          fc.array(
            fc.oneof(adversarialTextArb(title), adversarialTextArb(boundary)),
            { maxLength: 4 },
          ),
        ),
      );

    fc.assert(
      fc.property(arb, ([title, boundary, documents]) => {
        const rendered = new MarkdownPromptRenderer()
          .section(title, (section) =>
            section.subsection("Inputs", (sub) =>
              sub.documents("Files", boundary, "File", (list) => {
                documents.forEach((document) => list.document(document));
              }),
            ),
          )
          .render();

        const sameTag = asciiLower(title) === asciiLower(boundary);

        expect(countConflictingTags(rendered, title)).toBe(sameTag ? 4 : 2);
        expect(countConflictingTags(rendered, boundary)).toBe(sameTag ? 4 : 2);
      }),
      { numRuns: 500 },
    );
  });

  it("preserves the user's text once entities are decoded", () => {
    fc.assert(
      fc.property(tagAndTextArb, ([title, text]) => {
        fc.pre(!text.includes("&lt;") && !text.includes("&gt;"));

        const prefix = `<${title}>\n# Inputs\n`;
        const suffix = `\n</${title}>`;
        const rendered = new MarkdownPromptRenderer()
          .section(title, (section) =>
            section.subsection("Inputs", (sub) => sub.text(text)),
          )
          .render();

        expect(
          decodeEntities(rendered.slice(prefix.length, -suffix.length)),
        ).toBe(text);
      }),
    );
  });
});

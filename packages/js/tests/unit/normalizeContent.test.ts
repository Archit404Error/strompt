import { describe, expect, it } from "vitest";
import { markdownRendererSpec } from "../../src/renderer/markdownRenderer";

const normalize = (tagName: string, text: string) =>
  markdownRendererSpec.normalizeContent!(tagName, text);

describe("markdownRendererSpec.normalizeContent", () => {
  it("is idempotent", () => {
    const input = "</task> injected <task id='1'> <other>";
    const once = normalize("task", input);

    expect(normalize("task", once)).toBe(once);
  });

  it("does not let a quoted '>' inside attributes re-form a tag", () => {
    const result = normalize("task", '<task a=">">');

    expect(normalize("task", result)).toBe(result);
  });
});

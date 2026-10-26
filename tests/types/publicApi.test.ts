import { describe, expectTypeOf, it } from "vitest";
import { MarkdownPromptRenderer, PromptRenderer, PromptRendererSpec } from "../../src";

describe("public types", () => {
  it("keeps normalizeContent optional so existing custom specs still compile", () => {
    const { normalizeContent: _, ...legacySpec } = {} as PromptRendererSpec;

    expectTypeOf(legacySpec).toExtend<PromptRendererSpec>();
    expectTypeOf<PromptRendererSpec["normalizeContent"]>().toEqualTypeOf<
      ((tagName: string, text: string) => string) | undefined
    >();
  });

  it("accepts normalizeContent through overrideSpec", () => {
    expectTypeOf<MarkdownPromptRenderer["overrideSpec"]>()
      .parameter(0)
      .toExtend<{ normalizeContent?: (tagName: string, text: string) => string }>();

    expectTypeOf(new MarkdownPromptRenderer().overrideSpec)
      .toBeCallableWith({ normalizeContent: (_: string, text: string) => text });
  });

  it("rejects a normalizeContent with the wrong signature", () => {
    const typeOnly = (renderer: MarkdownPromptRenderer) => {
      // @ts-expect-error normalizeContent must return a string
      renderer.overrideSpec({ normalizeContent: () => 1 });
    };

    expectTypeOf(typeOnly).toBeFunction();
  });

  it("MarkdownPromptRenderer is a PromptRenderer", () => {
    expectTypeOf<MarkdownPromptRenderer>().toExtend<PromptRenderer>();
  });
});

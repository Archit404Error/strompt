import { describe, expect, it } from "vitest";
import { markdownRendererSpec } from "../../src/renderer/markdownRenderer";

const normalize = (tagName: string, text: string) =>
  markdownRendererSpec.normalizeContent!(tagName, text);

describe("markdownRendererSpec.normalizeContent", () => {
  describe("escapes tags that conflict with the given tag name", () => {
    it.each([
      ["closing tag", "</task>", "&lt;/task&gt;"],
      ["opening tag", "<task>", "&lt;task&gt;"],
      ["self-closing tag", "<task/>", "&lt;task/&gt;"],
      ["self-closing tag with space", "<task />", "&lt;task /&gt;"],
      ["uppercase", "</TASK>", "&lt;/TASK&gt;"],
      ["mixed case", "<TaSk>", "&lt;TaSk&gt;"],
      ["whitespace around slash", "< / task >", "&lt; / task &gt;"],
      ["newline inside tag", "<\n/task\n>", "&lt;\n/task\n&gt;"],
      ["attributes", '<task id="x">', '&lt;task id="x"&gt;'],
      ["attributes on closing tag", "</task foo>", "&lt;/task foo&gt;"],
      ["unterminated tag at end of text", "</task", "&lt;/task"],
      ["unterminated tag followed by text", "<task is next", "&lt;task is next"],
      ["unterminated tag before another tag", "<task <task>", "&lt;task &lt;task&gt;"],
    ])("%s", (_, input, expected) => {
      expect(normalize("task", input)).toBe(expected);
    });
  });

  describe("leaves non-conflicting content untouched", () => {
    it.each([
      ["longer tag name", "<tasks></tasks>"],
      ["tag name with suffix", "<task_list></task-list>"],
      ["tag name with prefix", "<subtask></mytask>"],
      ["unrelated tags", "<context></context><b>bold</b>"],
      ["unterminated longer tag name", "</tasks"],
      ["tag name followed by punctuation", "<task: do it"],
      ["bare word", "the task is </ done"],
      ["already escaped tag", "&lt;/task&gt;"],
      ["plain text", "no tags here at all"],
      ["empty string", ""],
    ])("%s", (_, input) => {
      expect(normalize("task", input)).toBe(input);
    });
  });

  it("escapes every occurrence while preserving surrounding text", () => {
    expect(
      normalize("task", "a </task> b <task> c <tasks> d </TASK>"),
    ).toBe("a &lt;/task&gt; b &lt;task&gt; c <tasks> d &lt;/TASK&gt;");
  });

  it("is idempotent", () => {
    const input = "</task> injected <task id='1'> <other>";
    const once = normalize("task", input);

    expect(normalize("task", once)).toBe(once);
  });

  describe("escapes a dangling '<' at the end of the text", () => {
    it.each([
      ["bare", "a <", "a &lt;"],
      ["with slash", "a </", "a &lt;/"],
      ["with whitespace", "a < / \n", "a &lt; / \n"],
    ])("%s", (_, input, expected) => {
      expect(normalize("task", input)).toBe(expected);
    });

    it("only at the end of the text", () => {
      expect(normalize("task", "a < b <")).toBe("a < b &lt;");
    });
  });

  it("returns the text unchanged when the tag name is empty", () => {
    expect(normalize("", "<></>< >")).toBe("<></>< >");
  });

  describe("treats regex metacharacters in tag names literally", () => {
    it.each([
      ["a.b", "</a.b>", "</axb>"],
      ["c++", "</c++>", "</c>"],
      ["a|b", "</a|b>", "</a>"],
      ["[x]", "<[x]>", "<x>"],
      ["x*", "</x*>", "</xxx>"],
      ["$1", "</$1>", "</1>"],
      ["(g)", "<(g)>", "<g>"],
      ["a\\b", "</a\\b>", "</ab>"],
    ])("%s", (tagName, conflicting, lookalike) => {
      expect(normalize(tagName, `${conflicting} ${lookalike}`)).toBe(
        `${conflicting.replace("<", "&lt;").replace(">", "&gt;")} ${lookalike}`,
      );
    });
  });

  it("supports tag names containing hyphens and underscores", () => {
    expect(normalize("user-input_v2", "</user-input_v2> </user-input>")).toBe(
      "&lt;/user-input_v2&gt; </user-input>",
    );
  });

  it("does not let a quoted '>' inside attributes re-form a tag", () => {
    const result = normalize("task", '<task a=">">');

    expect(result).toBe('&lt;task a="&gt;">');
    expect(normalize("task", result)).toBe(result);
  });
});

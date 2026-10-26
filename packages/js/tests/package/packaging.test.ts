import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../..", import.meta.url));
const tsc = join(root, "node_modules", ".bin", "tsc");

describe("published package", () => {
  it("only contains build output and package metadata", () => {
    const [pack] = JSON.parse(
      execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }),
    ) as [{ files: { path: string }[] }];

    const paths = pack.files.map((file) => file.path);

    expect(paths).toContain("package.json");
    for (const path of paths) {
      expect(path).toMatch(/^(dist\/|package\.json$|README\.md$|LICENSE)/);
    }
  });
});

describe("compiled output", () => {
  const outDir = mkdtempSync(join(tmpdir(), "strompt-build-"));

  afterAll(() => {
    rmSync(outDir, { recursive: true, force: true });
  });

  it(
    "builds only src and works when required as CommonJS",
    () => {
      execFileSync(tsc, ["-p", root, "--outDir", outDir], { cwd: root });

      expect(readdirSync(outDir).sort()).toEqual([
        "index.d.ts",
        "index.d.ts.map",
        "index.js",
        "index.js.map",
        "renderer",
      ]);

      const strompt = createRequire(import.meta.url)(join(outDir, "index.js"));
      const rendered = new strompt.MarkdownPromptRenderer()
        .section("task", (section: any) =>
          section.subsection("Inputs", (sub: any) => sub.text("</task> hi")),
        )
        .render();

      expect(Object.keys(strompt).sort()).toEqual([
        "MarkdownPromptRenderer",
        "PromptRenderer",
      ]);
      expect(rendered).toBe("<task>\n# Inputs\n&lt;/task&gt; hi\n</task>");
    },
    30_000,
  );
});

// @vitest-environment node
// Copy rule: no em or en dashes anywhere in the UI source.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOTS = ["app", "components", "hooks"];
const FILES = ["lib/labels.ts", "lib/validations.ts"];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|css)$/.test(name) ? [path] : [];
  });
}

describe("copy", () => {
  it("has no em or en dashes", () => {
    const offenders = [...ROOTS.flatMap(sourceFiles), ...FILES].flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .flatMap((line, i) => (/[–—]/.test(line) ? [`${file}:${i + 1}`] : []))
    );
    expect(offenders).toEqual([]);
  });
});

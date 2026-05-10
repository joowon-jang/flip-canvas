import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { equal } from "node:assert/strict";
import { describe, it } from "./harness";

function collectTsxFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...collectTsxFiles(path));
    } else if (path.endsWith(".tsx")) {
      files.push(path);
    }
  }

  return files;
}

describe("project style contract", () => {
  it("does not use direct inline style object props in app and src TSX files", () => {
    const roots = [resolve("app"), resolve("src")];
    const offenders: string[] = [];

    for (const root of roots) {
      for (const file of collectTsxFiles(root)) {
        const source = readFileSync(file, "utf8");
        if (source.includes("style={{") || source.includes("contentContainerStyle={{")) {
          offenders.push(relative(process.cwd(), file));
        }
      }
    }

    equal(offenders.join("\n"), "");
  });
});

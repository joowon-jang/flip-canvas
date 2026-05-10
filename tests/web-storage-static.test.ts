import { equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "./harness";

describe("web project repository", () => {
  it("does not import expo-sqlite in the web implementation", () => {
    const source = readFileSync(resolve("src/storage/project-repository.web.ts"), "utf8");

    equal(source.includes("expo-sqlite"), false);
  });

  it("uses IndexedDB and migrates the legacy localStorage project payload", () => {
    const source = readFileSync(resolve("src/storage/project-repository.web.ts"), "utf8");

    equal(source.includes("indexedDB"), true);
    equal(source.includes("flipbook.projects.v1"), true);
    equal(source.includes("migrateLegacyProjects"), true);
  });

  it("exports project deletion for IndexedDB and memory storage", () => {
    const source = readFileSync(resolve("src/storage/project-repository.web.ts"), "utf8");

    equal(source.includes("export async function deleteProject"), true);
    equal(source.includes("memoryProjects.delete(projectId)"), true);
    equal(source.includes('transaction.objectStore("projects").delete(projectId)'), true);
  });
});

import { equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "./harness";

describe("project store selector contract", () => {
  it("uses useSyncExternalStore and exposes separated project hooks", () => {
    const source = readFileSync(resolve("src/state/project-store.tsx"), "utf8");

    equal(source.includes("useSyncExternalStore"), true);
    equal(source.includes("useProjectSummaries"), true);
    equal(source.includes("useProject(projectId"), true);
    equal(source.includes("useProjectActions"), true);
    equal(source.includes("createContext<ProjectStore"), false);
  });

  it("exposes project save status and retry without removing optimistic updates", () => {
    const source = readFileSync(resolve("src/state/project-store.tsx"), "utf8");

    equal(source.includes("useProjectSaveStatus"), true);
    equal(source.includes("retryProjectSave"), true);
    equal(source.includes("saveStatusByProjectId"), true);
    equal(source.includes('status: "error"'), true);
    equal(source.includes("setState((current) => ({"), true);
  });

  it("distinguishes a missing project from a project that is still loading", () => {
    const source = readFileSync(resolve("src/state/project-store.tsx"), "utf8");

    equal(source.includes("loadedProjectIds"), true);
    equal(source.includes("Boolean(snapshot.loadedProjectIds[projectId])"), true);
  });

  it("retries non-idle saves when the app backgrounds", () => {
    const source = readFileSync(resolve("src/state/project-store.tsx"), "utf8");

    equal(source.includes("AppState"), true);
    equal(source.includes("flushPendingSaves"), true);
  });

  it("coalesces frame persistence so undo, redo, and drawing do not serialize the whole frame immediately", () => {
    const source = readFileSync(resolve("src/state/project-store.tsx"), "utf8");

    equal(source.includes("FRAME_PERSIST_DELAY_MS"), true);
    equal(source.includes("const FRAME_PERSIST_DELAY_MS = 1000"), true);
    equal(source.includes("pendingFramePersists"), true);
    equal(source.includes("scheduleFramePersist(updated, updatedFrame)"), true);
    equal(source.includes("void persistFrame(updated, updatedFrame)"), false);
    equal(source.includes("flushPendingFramePersists"), true);
  });

  it("exposes project management actions through the store", () => {
    const source = readFileSync(resolve("src/state/project-store.tsx"), "utf8");

    equal(source.includes("renameProject:"), true);
    equal(source.includes("duplicateProject:"), true);
    equal(source.includes("deleteProject:"), true);
    equal(source.includes("deleteProjectFromRepository"), true);
  });

  it("creates projects from a title only so setup screens cannot choose a frame count", () => {
    const source = readFileSync(resolve("src/state/project-store.tsx"), "utf8");

    equal(source.includes("createProject: (title: string) => FlipProject"), true);
    equal(source.includes("createProject(title)"), true);
    equal(source.includes("createBlankProject(title)"), true);
    equal(source.includes("createProject: (title: string, frameCount: number)"), false);
    equal(source.includes("createBlankProject(title, frameCount)"), false);
  });
});

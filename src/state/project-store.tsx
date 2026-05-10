import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { AppState } from "react-native";

import { duplicateProjectForManagement, renameProjectForManagement } from "../model/project-management";
import { createBlankProject, createInitialProject } from "../model/sample-data";
import { initProjectRepository, loadProject, loadProjectSummaries, saveFrame, saveProject, saveProjectMetadata, deleteProject as deleteProjectFromRepository } from "../storage/project-repository";
import { projectWithUpdatedFrame, summaryFromProject, upsertSummary } from "./project-store-state";
import type { FlipFrame, FlipProject, ProjectSummary, Stroke } from "../types/flipbook";
import { createId, now } from "../utils/id";

type ProjectStoreState = {
  ready: boolean;
  summaries: ProjectSummary[];
  projects: Record<string, FlipProject | undefined>;
  loadedProjectIds: Record<string, boolean | undefined>;
  saveStatusByProjectId: Record<string, ProjectSaveStatus | undefined>;
};

type ProjectSaveStatus = {
  status: "idle" | "saving" | "error";
  errorMessage?: string;
};

type ProjectActions = {
  createProject: (title: string) => FlipProject;
  updateProject: (project: FlipProject) => void;
  renameProject: (projectId: string, title: string) => void;
  duplicateProject: (projectId: string) => FlipProject | undefined;
  deleteProject: (projectId: string) => void;
  updateFrame: (projectId: string, frame: FlipFrame) => void;
  addStroke: (projectId: string, frameId: string, stroke: Stroke) => void;
  retryProjectSave: (projectId: string) => void;
};

let state: ProjectStoreState = {
  ready: false,
  summaries: [],
  projects: {},
  loadedProjectIds: {},
  saveStatusByProjectId: {},
};

let initPromise: Promise<void> | undefined;
const loadingProjects = new Set<string>();
const listeners = new Set<() => void>();
const saveVersionByProjectId: Record<string, number | undefined> = {};
let appStateSubscriptionStarted = false;
const FRAME_PERSIST_DELAY_MS = 1000;
const pendingFramePersists = new Map<string, { project: FlipProject; frame: FlipFrame; timeout: ReturnType<typeof setTimeout> }>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ProjectStoreState {
  return state;
}

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function setState(updater: (current: ProjectStoreState) => ProjectStoreState): void {
  state = updater(state);
  emit();
}

function saveErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "저장에 실패했습니다.";
}

function setProjectSaveStatus(projectId: string, status: ProjectSaveStatus): void {
  setState((current) => ({
    ...current,
    saveStatusByProjectId: {
      ...current.saveStatusByProjectId,
      [projectId]: status,
    },
  }));
}

function beginProjectSave(projectId: string): number {
  const version = (saveVersionByProjectId[projectId] ?? 0) + 1;
  saveVersionByProjectId[projectId] = version;
  setProjectSaveStatus(projectId, { status: "saving" });
  return version;
}

function finishProjectSave(projectId: string, version: number, status: ProjectSaveStatus): void {
  if (saveVersionByProjectId[projectId] !== version) {
    return;
  }
  setProjectSaveStatus(projectId, status);
}

async function persistProject(project: FlipProject): Promise<void> {
  cancelPendingFramePersists(project.id);
  const version = beginProjectSave(project.id);
  try {
    await saveProject(project);
    finishProjectSave(project.id, version, { status: "idle" });
  } catch (error) {
    finishProjectSave(project.id, version, { status: "error", errorMessage: saveErrorMessage(error) });
  }
}

async function persistFrame(project: FlipProject, frame: FlipFrame): Promise<void> {
  const version = beginProjectSave(project.id);
  try {
    await saveProjectMetadata(project);
    await saveFrame(project.id, frame);
    finishProjectSave(project.id, version, { status: "idle" });
  } catch (error) {
    finishProjectSave(project.id, version, { status: "error", errorMessage: saveErrorMessage(error) });
  }
}

function pendingFramePersistKey(projectId: string, frameId: string): string {
  return `${projectId}:${frameId}`;
}

function cancelPendingFramePersists(projectId: string): void {
  for (const [key, pending] of pendingFramePersists) {
    if (pending.project.id === projectId) {
      clearTimeout(pending.timeout);
      pendingFramePersists.delete(key);
    }
  }
}

function scheduleFramePersist(project: FlipProject, frame: FlipFrame): void {
  const key = pendingFramePersistKey(project.id, frame.id);
  const existing = pendingFramePersists.get(key);
  if (existing) {
    clearTimeout(existing.timeout);
  }

  const pending = {
    project,
    frame,
    timeout: setTimeout(() => {
      pendingFramePersists.delete(key);
      void persistFrame(pending.project, pending.frame);
    }, FRAME_PERSIST_DELAY_MS),
  };
  pendingFramePersists.set(key, pending);
}

function flushPendingFramePersists(): void {
  const pendingSaves = [...pendingFramePersists.values()];
  pendingFramePersists.clear();
  for (const pending of pendingSaves) {
    clearTimeout(pending.timeout);
    void persistFrame(pending.project, pending.frame);
  }
}

function flushPendingSaves(): void {
  flushPendingFramePersists();
  for (const [projectId, saveStatus] of Object.entries(state.saveStatusByProjectId)) {
    if (saveStatus?.status === "error") {
      actions.retryProjectSave(projectId);
    }
  }
}

async function initializeStore(): Promise<void> {
  initPromise ??= (async () => {
    await initProjectRepository();
    const summaries = await loadProjectSummaries();
    if (summaries.length > 0) {
      setState((current) => ({ ...current, ready: true, summaries }));
      return;
    }

    const initial = createInitialProject();
    await saveProject(initial);
    setState((current) => ({
      ...current,
      ready: true,
      summaries: [summaryFromProject(initial)],
      projects: { ...current.projects, [initial.id]: initial },
      loadedProjectIds: { ...current.loadedProjectIds, [initial.id]: true },
      saveStatusByProjectId: { ...current.saveStatusByProjectId, [initial.id]: { status: "idle" } },
    }));
  })();
  await initPromise;
}

async function ensureProjectLoaded(projectId: string): Promise<void> {
  if (!projectId || state.projects[projectId] || loadingProjects.has(projectId)) {
    return;
  }

  loadingProjects.add(projectId);
  try {
    const project = await loadProject(projectId);
    if (project) {
      setState((current) => ({
        ...current,
        summaries: upsertSummary(current.summaries, project),
        projects: { ...current.projects, [project.id]: project },
        loadedProjectIds: { ...current.loadedProjectIds, [project.id]: true },
        saveStatusByProjectId: { ...current.saveStatusByProjectId, [project.id]: { status: "idle" } },
      }));
    } else {
      setState((current) => ({
        ...current,
        loadedProjectIds: { ...current.loadedProjectIds, [projectId]: true },
      }));
    }
  } finally {
    loadingProjects.delete(projectId);
  }
}

const actions: ProjectActions = {
  createProject(title) {
    const project = createBlankProject(title);
    setState((current) => ({
      ...current,
      summaries: upsertSummary(current.summaries, project),
      projects: { ...current.projects, [project.id]: project },
      loadedProjectIds: { ...current.loadedProjectIds, [project.id]: true },
      saveStatusByProjectId: { ...current.saveStatusByProjectId, [project.id]: { status: "idle" } },
    }));
    void persistProject(project);
    return project;
  },

  updateProject(project) {
    const updated = { ...project, updatedAt: Date.now() };
    setState((current) => ({
      ...current,
      summaries: upsertSummary(current.summaries, updated),
      projects: { ...current.projects, [updated.id]: updated },
    }));
    void persistProject(updated);
  },

  renameProject(projectId, title) {
    const project = state.projects[projectId];
    if (!project) {
      return;
    }

    const updated = renameProjectForManagement(project, title, now());
    setState((current) => ({
      ...current,
      summaries: upsertSummary(current.summaries, updated),
      projects: { ...current.projects, [projectId]: updated },
    }));
    void persistProject(updated);
  },

  duplicateProject(projectId) {
    const project = state.projects[projectId];
    if (!project) {
      return undefined;
    }

    const duplicated = duplicateProjectForManagement(project, createId, now());
    setState((current) => ({
      ...current,
      summaries: upsertSummary(current.summaries, duplicated),
      projects: { ...current.projects, [duplicated.id]: duplicated },
      loadedProjectIds: { ...current.loadedProjectIds, [duplicated.id]: true },
      saveStatusByProjectId: { ...current.saveStatusByProjectId, [duplicated.id]: { status: "idle" } },
    }));
    void persistProject(duplicated);
    return duplicated;
  },

  deleteProject(projectId) {
    cancelPendingFramePersists(projectId);
    setState((current) => {
      const { [projectId]: _project, ...projects } = current.projects;
      const { [projectId]: _loadedProject, ...loadedProjectIds } = current.loadedProjectIds;
      const { [projectId]: _saveStatus, ...saveStatusByProjectId } = current.saveStatusByProjectId;
      return {
        ...current,
        summaries: current.summaries.filter((project) => project.id !== projectId),
        projects,
        loadedProjectIds,
        saveStatusByProjectId,
      };
    });
    void deleteProjectFromRepository(projectId);
  },

  updateFrame(projectId, frame) {
    const project = state.projects[projectId];
    if (!project) {
      return;
    }

    const updated = projectWithUpdatedFrame(project, frame, Date.now());
    setState((current) => ({
      ...current,
      summaries: upsertSummary(current.summaries, updated),
      projects: { ...current.projects, [projectId]: updated },
    }));
    scheduleFramePersist(updated, frame);
  },

  addStroke(projectId, frameId, stroke) {
    const project = state.projects[projectId];
    if (!project) {
      return;
    }

    const timestamp = Date.now();
    const frame = project.frames.find((item) => item.id === frameId);
    if (!frame) {
      return;
    }

    const updatedFrame = {
      ...frame,
      strokes: [...frame.strokes, stroke],
      updatedAt: timestamp,
    };
    const updated = {
      ...project,
      updatedAt: timestamp,
      frames: project.frames.map((item) => (item.id === frameId ? updatedFrame : item)),
    };
    setState((current) => ({
      ...current,
      summaries: upsertSummary(current.summaries, updated),
      projects: { ...current.projects, [projectId]: updated },
    }));
    scheduleFramePersist(updated, updatedFrame);
  },

  retryProjectSave(projectId) {
    const project = state.projects[projectId];
    if (!project) {
      return;
    }
    void persistProject(project);
  },
};

export function ProjectStoreProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void initializeStore();
  }, []);

  useEffect(() => {
    if (appStateSubscriptionStarted) {
      return;
    }
    appStateSubscriptionStarted = true;
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "inactive" || nextState === "background") {
        flushPendingSaves();
      }
    });

    return () => {
      appStateSubscriptionStarted = false;
      subscription.remove();
    };
  }, []);

  return children;
}

export function useProjectSummaries(): { ready: boolean; projects: ProjectSummary[] } {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(
    () => ({ ready: snapshot.ready, projects: snapshot.summaries }),
    [snapshot.ready, snapshot.summaries],
  );
}

export function useProject(projectId: string): { ready: boolean; project?: FlipProject } {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const project = snapshot.projects[projectId];

  useEffect(() => {
    if (snapshot.ready) {
      void ensureProjectLoaded(projectId);
    }
  }, [projectId, snapshot.ready]);

  return useMemo(
    () => ({ ready: snapshot.ready && (!projectId || Boolean(project) || Boolean(snapshot.loadedProjectIds[projectId])), project }),
    [project, projectId, snapshot.loadedProjectIds, snapshot.ready],
  );
}

export function useProjectActions(): ProjectActions {
  return actions;
}

export function useProjectSaveStatus(projectId: string): ProjectSaveStatus & { retry: () => void } {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const saveStatus = snapshot.saveStatusByProjectId[projectId] ?? { status: "idle" as const };

  return useMemo(
    () => ({
      ...saveStatus,
      retry: () => actions.retryProjectSave(projectId),
    }),
    [projectId, saveStatus],
  );
}

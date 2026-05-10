import { sanitizeProject } from "../model/sanitize-project";
import type { FlipFrame, FlipProject, ProjectSummary } from "../types/flipbook";
import {
  projectFromStorageRecords,
  projectSummaryFromRecords,
  projectToStorageRecords,
  type FrameRecord,
  type ProjectRecord,
  type StrokeRecord,
} from "./project-records";

const DB_NAME = "flipbook.projects.indexeddb.v2";
const DB_VERSION = 1;
const LEGACY_STORAGE_KEY = "flipbook.projects.v1";
const LEGACY_MIGRATION_KEY = "flipbook.projects.v1.migrated.indexeddb";

const memoryProjects = new Map<string, ProjectRecord>();
const memoryFrames = new Map<string, FrameRecord>();
const memoryStrokes = new Map<string, StrokeRecord>();

let databasePromise: Promise<IDBDatabase | null> | undefined;

function indexedDBOrNull(): IDBFactory | null {
  try {
    return globalThis.indexedDB ?? null;
  } catch {
    return null;
  }
}

function localStorageOrNull(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function openDatabase(): Promise<IDBDatabase | null> {
  databasePromise ??= new Promise((resolve, reject) => {
    const indexedDB = indexedDBOrNull();
    if (!indexedDB) {
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("projects")) {
        database.createObjectStore("projects", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("frames")) {
        const frames = database.createObjectStore("frames", { keyPath: "id" });
        frames.createIndex("projectId", "projectId", { unique: false });
      }
      if (!database.objectStoreNames.contains("strokes")) {
        const strokes = database.createObjectStore("strokes", { keyPath: "id" });
        strokes.createIndex("frameId", "frameId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return databasePromise;
}

async function readAllFromStore<T>(storeName: string): Promise<T[]> {
  const database = await openDatabase();
  if (!database) {
    return [];
  }

  const transaction = database.transaction(storeName, "readonly");
  const rows = await requestToPromise<T[]>(transaction.objectStore(storeName).getAll());
  await transactionDone(transaction);
  return rows;
}

async function readByIndex<T>(storeName: string, indexName: string, key: IDBValidKey): Promise<T[]> {
  const database = await openDatabase();
  if (!database) {
    return [];
  }

  const transaction = database.transaction(storeName, "readonly");
  const rows = await requestToPromise<T[]>(transaction.objectStore(storeName).index(indexName).getAll(key));
  await transactionDone(transaction);
  return rows;
}

async function deleteByIndex(store: IDBObjectStore, indexName: string, key: IDBValidKey): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = store.index(indexName).openCursor(key);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      cursor.delete();
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}

function memoryRecordsForProject(projectId: string): { project?: ProjectRecord; frames: FrameRecord[]; strokes: StrokeRecord[] } {
  const frames = [...memoryFrames.values()].filter((frame) => frame.projectId === projectId);
  const frameIds = new Set(frames.map((frame) => frame.id));
  return {
    project: memoryProjects.get(projectId),
    frames,
    strokes: [...memoryStrokes.values()].filter((stroke) => frameIds.has(stroke.frameId)),
  };
}

function previewFrameFromRecords(project: ProjectRecord, frames: FrameRecord[], strokes: StrokeRecord[]): FlipFrame | undefined {
  const firstFrame = [...frames].sort((left, right) => left.index - right.index)[0];
  if (!firstFrame) {
    return undefined;
  }

  return projectFromStorageRecords(
    project,
    [firstFrame],
    strokes.filter((stroke) => stroke.frameId === firstFrame.id),
  ).frames[0];
}

function saveProjectToMemory(project: FlipProject): void {
  const records = projectToStorageRecords(project);
  memoryProjects.set(records.project.id, records.project);
  for (const frame of [...memoryFrames.values()].filter((item) => item.projectId === records.project.id)) {
    memoryFrames.delete(frame.id);
    for (const stroke of [...memoryStrokes.values()].filter((item) => item.frameId === frame.id)) {
      memoryStrokes.delete(stroke.id);
    }
  }
  for (const frame of records.frames) {
    memoryFrames.set(frame.id, frame);
  }
  for (const stroke of records.strokes) {
    memoryStrokes.set(stroke.id, stroke);
  }
}

async function migrateLegacyProjects(): Promise<void> {
  const storage = localStorageOrNull();
  if (!storage || storage.getItem(LEGACY_MIGRATION_KEY) === "done") {
    return;
  }

  const raw = storage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) {
    storage.setItem(LEGACY_MIGRATION_KEY, "done");
    return;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      for (const project of parsed) {
        await saveProject(sanitizeProject(project));
      }
    }
  } catch {
    // Leave the old value untouched so it can be inspected manually if needed.
  }
  storage.setItem(LEGACY_MIGRATION_KEY, "done");
}

export async function initProjectRepository(): Promise<void> {
  await openDatabase();
  await migrateLegacyProjects();
}

export async function loadProjectSummaries(): Promise<ProjectSummary[]> {
  const database = await openDatabase();
  if (!database) {
    return [...memoryProjects.values()]
      .map((project) => {
        const frames = [...memoryFrames.values()].filter((frame) => frame.projectId === project.id);
        return projectSummaryFromRecords(project, frames.length, previewFrameFromRecords(project, frames, [...memoryStrokes.values()]));
      })
      .sort((left, right) => right.updatedAt - left.updatedAt);
  }

  const projects = await readAllFromStore<ProjectRecord>("projects");
  const frames = await readAllFromStore<FrameRecord>("frames");
  const framesByProjectId = new Map<string, FrameRecord[]>();
  for (const frame of frames) {
    const current = framesByProjectId.get(frame.projectId) ?? [];
    current.push(frame);
    framesByProjectId.set(frame.projectId, current);
  }
  const firstFrames = [...framesByProjectId.values()].map((items) => [...items].sort((left, right) => left.index - right.index)[0]).filter(Boolean);
  const previewStrokesByFrameId = new Map<string, StrokeRecord[]>();
  await Promise.all(
    firstFrames.map(async (frame) => {
      previewStrokesByFrameId.set(frame.id, await readByIndex<StrokeRecord>("strokes", "frameId", frame.id));
    }),
  );

  return projects
    .map((project) => {
      const projectFrames = framesByProjectId.get(project.id) ?? [];
      const previewFrame = previewFrameFromRecords(
        project,
        projectFrames,
        projectFrames.flatMap((frame) => previewStrokesByFrameId.get(frame.id) ?? []),
      );
      return projectSummaryFromRecords(project, projectFrames.length, previewFrame);
    })
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

export async function loadProject(projectId: string): Promise<FlipProject | undefined> {
  const database = await openDatabase();
  if (!database) {
    const records = memoryRecordsForProject(projectId);
    return records.project ? projectFromStorageRecords(records.project, records.frames, records.strokes) : undefined;
  }

  const transaction = database.transaction("projects", "readonly");
  const project = await requestToPromise<ProjectRecord | undefined>(transaction.objectStore("projects").get(projectId));
  await transactionDone(transaction);
  if (!project) {
    return undefined;
  }

  const frames = await readByIndex<FrameRecord>("frames", "projectId", projectId);
  const strokes = (
    await Promise.all(frames.map((frame) => readByIndex<StrokeRecord>("strokes", "frameId", frame.id)))
  ).flat();
  return projectFromStorageRecords(project, frames, strokes);
}

export async function saveProjectMetadata(project: FlipProject): Promise<void> {
  const database = await openDatabase();
  const record = projectToStorageRecords(project).project;
  if (!database) {
    memoryProjects.set(record.id, record);
    return;
  }

  const transaction = database.transaction("projects", "readwrite");
  transaction.objectStore("projects").put(record);
  await transactionDone(transaction);
}

export async function saveFrame(projectId: string, frame: FlipFrame): Promise<void> {
  const records = projectToStorageRecords({
    id: projectId,
    title: "",
    fps: 12,
    createdAt: 0,
    updatedAt: frame.updatedAt,
    frames: [frame],
  });
  const frameRecord = records.frames[0];
  if (!frameRecord) {
    return;
  }
  frameRecord.index = frame.index;

  const database = await openDatabase();
  if (!database) {
    memoryFrames.set(frameRecord.id, frameRecord);
    for (const stroke of [...memoryStrokes.values()].filter((item) => item.frameId === frameRecord.id)) {
      memoryStrokes.delete(stroke.id);
    }
    for (const stroke of records.strokes) {
      memoryStrokes.set(stroke.id, stroke);
    }
    return;
  }

  const transaction = database.transaction(["frames", "strokes"], "readwrite");
  transaction.objectStore("frames").put(frameRecord);
  await deleteByIndex(transaction.objectStore("strokes"), "frameId", frameRecord.id);
  for (const stroke of records.strokes) {
    transaction.objectStore("strokes").put(stroke);
  }
  await transactionDone(transaction);
}

export async function saveProject(project: FlipProject): Promise<void> {
  const sanitized = sanitizeProject(project);
  const records = projectToStorageRecords(sanitized);
  const database = await openDatabase();
  if (!database) {
    saveProjectToMemory(sanitized);
    return;
  }

  const existingFrames = await readByIndex<FrameRecord>("frames", "projectId", sanitized.id);
  const transaction = database.transaction(["projects", "frames", "strokes"], "readwrite");
  transaction.objectStore("projects").put(records.project);
  for (const frame of existingFrames) {
    transaction.objectStore("frames").delete(frame.id);
    await deleteByIndex(transaction.objectStore("strokes"), "frameId", frame.id);
  }
  for (const frame of records.frames) {
    transaction.objectStore("frames").put(frame);
  }
  for (const stroke of records.strokes) {
    transaction.objectStore("strokes").put(stroke);
  }
  await transactionDone(transaction);
}

export async function deleteProject(projectId: string): Promise<void> {
  const database = await openDatabase();
  if (!database) {
    const frameIds = [...memoryFrames.values()].filter((frame) => frame.projectId === projectId).map((frame) => frame.id);
    memoryProjects.delete(projectId);
    for (const frameId of frameIds) {
      memoryFrames.delete(frameId);
      for (const stroke of [...memoryStrokes.values()].filter((item) => item.frameId === frameId)) {
        memoryStrokes.delete(stroke.id);
      }
    }
    return;
  }

  const existingFrames = await readByIndex<FrameRecord>("frames", "projectId", projectId);
  const transaction = database.transaction(["projects", "frames", "strokes"], "readwrite");
  transaction.objectStore("projects").delete(projectId);
  for (const frame of existingFrames) {
    transaction.objectStore("frames").delete(frame.id);
    await deleteByIndex(transaction.objectStore("strokes"), "frameId", frame.id);
  }
  await transactionDone(transaction);
}

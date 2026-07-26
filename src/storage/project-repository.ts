import * as SQLite from "expo-sqlite";

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

type ProjectRow = {
  id: string;
  title: string;
  fps: number;
  created_at: number;
  updated_at: number;
  share_id: string | null;
  share_url: string | null;
};

type FrameRow = {
  id: string;
  project_id: string;
  frame_index: number;
  thumbnail_uri: string | null;
  updated_at: number;
};

type StrokeRow = {
  id: string;
  frame_id: string;
  stroke_index: number;
  tool: StrokeRecord["tool"];
  color: string;
  base_width: number;
  points_json: string;
  created_at: number;
};

type LegacyProjectRow = {
  json: string;
};

type SqlWriteConnection = Pick<SQLite.SQLiteDatabase, "runAsync">;

const LEGACY_MIGRATION_KEY = "legacy-json-projects-v2";

let database: SQLite.SQLiteDatabase | undefined;

async function db(): Promise<SQLite.SQLiteDatabase> {
  database ??= await SQLite.openDatabaseAsync("flipbook.db");
  return database;
}

function toProjectRecord(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    title: row.title,
    fps: row.fps,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    shareId: row.share_id ?? undefined,
    shareUrl: row.share_url ?? undefined,
  };
}

function toFrameRecord(row: FrameRow): FrameRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    index: row.frame_index,
    thumbnailUri: row.thumbnail_uri ?? undefined,
    updatedAt: row.updated_at,
  };
}

function toStrokeRecord(row: StrokeRow): StrokeRecord {
  return {
    id: row.id,
    frameId: row.frame_id,
    index: row.stroke_index,
    tool: row.tool,
    color: row.color,
    baseWidth: row.base_width,
    pointsJson: row.points_json,
    createdAt: row.created_at,
  };
}

async function tableExists(databaseHandle: SQLite.SQLiteDatabase, tableName: string): Promise<boolean> {
  const row = await databaseHandle.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    tableName,
  );
  return Boolean(row);
}

async function projectTableHasLegacyJson(databaseHandle: SQLite.SQLiteDatabase): Promise<boolean> {
  if (!(await tableExists(databaseHandle, "projects"))) {
    return false;
  }

  const columns = await databaseHandle.getAllAsync<{ name: string }>("PRAGMA table_info(projects)");
  return columns.some((column) => column.name === "json");
}

async function createCurrentSchema(databaseHandle: SQLite.SQLiteDatabase): Promise<void> {
  await databaseHandle.execAsync(`
    CREATE TABLE IF NOT EXISTS repository_metadata (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      fps INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      share_id TEXT,
      share_url TEXT
    );

    CREATE TABLE IF NOT EXISTS frames (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      frame_index INTEGER NOT NULL,
      thumbnail_uri TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS strokes (
      id TEXT PRIMARY KEY NOT NULL,
      frame_id TEXT NOT NULL,
      stroke_index INTEGER NOT NULL,
      tool TEXT NOT NULL,
      color TEXT NOT NULL,
      base_width REAL NOT NULL,
      points_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS frames_project_index ON frames(project_id, frame_index);
    CREATE INDEX IF NOT EXISTS strokes_frame_index ON strokes(frame_id, stroke_index);
  `);
}

async function migrationAlreadyRan(databaseHandle: SQLite.SQLiteDatabase): Promise<boolean> {
  const row = await databaseHandle.getFirstAsync<{ value: string }>(
    "SELECT value FROM repository_metadata WHERE key = ?",
    LEGACY_MIGRATION_KEY,
  );
  return row?.value === "done";
}

async function markMigrationComplete(databaseHandle: SQLite.SQLiteDatabase): Promise<void> {
  await databaseHandle.runAsync(
    "INSERT OR REPLACE INTO repository_metadata (key, value) VALUES (?, ?)",
    LEGACY_MIGRATION_KEY,
    "done",
  );
}

async function migrateLegacyProjects(databaseHandle: SQLite.SQLiteDatabase): Promise<void> {
  if (await migrationAlreadyRan(databaseHandle)) {
    return;
  }

  if (!(await tableExists(databaseHandle, "legacy_projects_json"))) {
    await markMigrationComplete(databaseHandle);
    return;
  }

  const rows = await databaseHandle.getAllAsync<LegacyProjectRow>("SELECT json FROM legacy_projects_json");
  for (const row of rows) {
    try {
      await saveProject(sanitizeProject(JSON.parse(row.json)));
    } catch {
      // Skip malformed legacy rows. The migration is non-destructive, so the raw row remains available.
    }
  }
  await markMigrationComplete(databaseHandle);
}

export async function initProjectRepository(): Promise<void> {
  const databaseHandle = await db();
  if (await projectTableHasLegacyJson(databaseHandle)) {
    await databaseHandle.execAsync("ALTER TABLE projects RENAME TO legacy_projects_json;");
  }
  await createCurrentSchema(databaseHandle);
  await migrateLegacyProjects(databaseHandle);
}

export async function loadProjectSummaries(): Promise<ProjectSummary[]> {
  const databaseHandle = await db();
  const rows = await databaseHandle.getAllAsync<ProjectRow & { frame_count: number }>(`
    SELECT p.id, p.title, p.fps, p.created_at, p.updated_at, p.share_id, p.share_url, COUNT(f.id) AS frame_count
    FROM projects p
    LEFT JOIN frames f ON f.project_id = p.id
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `);
  const framesForPreview = await databaseHandle.getAllAsync<FrameRow>(
    "SELECT id, project_id, frame_index, thumbnail_uri, updated_at FROM frames ORDER BY project_id ASC, frame_index ASC",
  );
  const firstPreviewFrameByProjectId = new Map<string, FrameRow>();
  for (const frame of framesForPreview) {
    if (!firstPreviewFrameByProjectId.has(frame.project_id)) {
      firstPreviewFrameByProjectId.set(frame.project_id, frame);
    }
  }

  const previewFrameIds = [...firstPreviewFrameByProjectId.values()].map((frame) => frame.id);
  const previewStrokes = previewFrameIds.length > 0
    ? await databaseHandle.getAllAsync<StrokeRow>(
        `SELECT id, frame_id, stroke_index, tool, color, base_width, points_json, created_at
         FROM strokes
         WHERE frame_id IN (${previewFrameIds.map(() => "?").join(",")})
         ORDER BY frame_id ASC, stroke_index ASC`,
        ...previewFrameIds,
      )
    : [];
  const previewStrokesByFrameId = new Map<string, StrokeRow[]>();
  for (const stroke of previewStrokes) {
    const strokes = previewStrokesByFrameId.get(stroke.frame_id) ?? [];
    strokes.push(stroke);
    previewStrokesByFrameId.set(stroke.frame_id, strokes);
  }

  return rows.map((row) => {
    const projectRecord = toProjectRecord(row);
    const previewFrameRecord = firstPreviewFrameByProjectId.get(row.id);
    const previewFrame = previewFrameRecord
      ? projectFromStorageRecords(
          projectRecord,
          [toFrameRecord(previewFrameRecord)],
          (previewStrokesByFrameId.get(previewFrameRecord.id) ?? []).map(toStrokeRecord),
        ).frames[0]
      : undefined;
    return projectSummaryFromRecords(projectRecord, row.frame_count, previewFrame);
  });
}

export async function loadProject(projectId: string): Promise<FlipProject | undefined> {
  const databaseHandle = await db();
  const project = await databaseHandle.getFirstAsync<ProjectRow>(
    "SELECT id, title, fps, created_at, updated_at, share_id, share_url FROM projects WHERE id = ?",
    projectId,
  );
  if (!project) {
    return undefined;
  }

  const frames = await databaseHandle.getAllAsync<FrameRow>(
    "SELECT id, project_id, frame_index, thumbnail_uri, updated_at FROM frames WHERE project_id = ? ORDER BY frame_index ASC",
    projectId,
  );
  const strokes = await databaseHandle.getAllAsync<StrokeRow>(
    `SELECT s.id, s.frame_id, s.stroke_index, s.tool, s.color, s.base_width, s.points_json, s.created_at
     FROM strokes s
     INNER JOIN frames f ON f.id = s.frame_id
     WHERE f.project_id = ?
     ORDER BY s.frame_id ASC, s.stroke_index ASC`,
    projectId,
  );

  return projectFromStorageRecords(toProjectRecord(project), frames.map(toFrameRecord), strokes.map(toStrokeRecord));
}

export async function saveProjectMetadata(project: FlipProject): Promise<void> {
  const record = projectToStorageRecords(project).project;
  await writeProjectMetadata(await db(), record);
}

async function writeProjectMetadata(databaseHandle: SqlWriteConnection, record: ProjectRecord): Promise<void> {
  await databaseHandle.runAsync(
    `INSERT OR REPLACE INTO projects (id, title, fps, created_at, updated_at, share_id, share_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    record.id,
    record.title,
    record.fps,
    record.createdAt,
    record.updatedAt,
    record.shareId ?? null,
    record.shareUrl ?? null,
  );
}

function frameRecordsForProjectFrame(projectId: string, frame: FlipFrame): { frame?: FrameRecord; strokes: StrokeRecord[] } {
  const sanitized = sanitizeProject({
    id: projectId,
    title: "",
    fps: 12,
    createdAt: 0,
    updatedAt: frame.updatedAt,
    frames: [frame],
  });
  const records = projectToStorageRecords({ ...sanitized, id: projectId });
  return {
    frame: records.frames[0],
    strokes: records.strokes,
  };
}

async function writeFrameRecords(
  databaseHandle: SqlWriteConnection,
  frameRecord: FrameRecord,
  strokes: StrokeRecord[],
): Promise<void> {
  await databaseHandle.runAsync(
    `INSERT OR REPLACE INTO frames (id, project_id, frame_index, thumbnail_uri, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    frameRecord.id,
    frameRecord.projectId,
    frameRecord.index,
    frameRecord.thumbnailUri ?? null,
    frameRecord.updatedAt,
  );
  await databaseHandle.runAsync("DELETE FROM strokes WHERE frame_id = ?", frameRecord.id);
  for (const stroke of strokes) {
    await databaseHandle.runAsync(
      `INSERT OR REPLACE INTO strokes (id, frame_id, stroke_index, tool, color, base_width, points_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      stroke.id,
      stroke.frameId,
      stroke.index,
      stroke.tool,
      stroke.color,
      stroke.baseWidth,
      stroke.pointsJson,
      stroke.createdAt,
    );
  }
}

export async function saveFrame(projectId: string, frame: FlipFrame): Promise<void> {
  const { frame: frameRecord, strokes } = frameRecordsForProjectFrame(projectId, frame);
  if (!frameRecord) {
    return;
  }

  const databaseHandle = await db();
  await databaseHandle.withExclusiveTransactionAsync(async (transaction) => {
    await writeFrameRecords(transaction, frameRecord, strokes);
  });
}

export async function saveProject(project: FlipProject): Promise<void> {
  const sanitized = sanitizeProject(project);
  const records = projectToStorageRecords(sanitized);
  const databaseHandle = await db();
  await databaseHandle.withExclusiveTransactionAsync(async (transaction) => {
    await writeProjectMetadata(transaction, records.project);
    await transaction.runAsync("DELETE FROM strokes WHERE frame_id IN (SELECT id FROM frames WHERE project_id = ?)", sanitized.id);
    await transaction.runAsync("DELETE FROM frames WHERE project_id = ?", sanitized.id);
    for (const frame of records.frames) {
      await writeFrameRecords(
        transaction,
        frame,
        records.strokes.filter((stroke) => stroke.frameId === frame.id),
      );
    }
  });
}

export async function deleteProject(projectId: string): Promise<void> {
  const databaseHandle = await db();
  await databaseHandle.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync("DELETE FROM strokes WHERE frame_id IN (SELECT id FROM frames WHERE project_id = ?)", projectId);
    await transaction.runAsync("DELETE FROM frames WHERE project_id = ?", projectId);
    await transaction.runAsync("DELETE FROM projects WHERE id = ?", projectId);
  });
}

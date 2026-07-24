import { sanitizeProject } from "../model/sanitize-project";
import type { FlipFrame, FlipProject, ProjectSummary, Stroke } from "../types/flipbook";

export type ProjectRecord = {
  id: string;
  title: string;
  fps: number;
  createdAt: number;
  updatedAt: number;
};

export type FrameRecord = {
  id: string;
  projectId: string;
  index: number;
  backgroundAssetPath?: string;
  backgroundMetadataJson?: string;
  thumbnailUri?: string;
  updatedAt: number;
};

export type StrokeRecord = {
  id: string;
  frameId: string;
  index: number;
  tool: Stroke["tool"];
  color: string;
  baseWidth: number;
  pointsJson: string;
  createdAt: number;
};

export type ProjectStorageRecords = {
  project: ProjectRecord;
  frames: FrameRecord[];
  strokes: StrokeRecord[];
};

export function projectToStorageRecords(project: FlipProject): ProjectStorageRecords {
  const sanitized = sanitizeProject(project);
  return {
    project: {
      id: sanitized.id,
      title: sanitized.title,
      fps: sanitized.fps,
      createdAt: sanitized.createdAt,
      updatedAt: sanitized.updatedAt,
    },
    frames: sanitized.frames.map((frame) => ({
      id: frame.id,
      projectId: sanitized.id,
      index: frame.index,
      backgroundAssetPath: frame.background?.assetPath,
      backgroundMetadataJson: frame.background ? JSON.stringify(frame.background) : undefined,
      thumbnailUri: frame.thumbnailUri,
      updatedAt: frame.updatedAt,
    })),
    strokes: sanitized.frames.flatMap((frame) =>
      frame.strokes.map((stroke, index) => ({
        id: stroke.id,
        frameId: frame.id,
        index,
        tool: stroke.tool,
        color: stroke.color,
        baseWidth: stroke.baseWidth,
        pointsJson: JSON.stringify(stroke.points),
        createdAt: stroke.createdAt,
      })),
    ),
  };
}

export function projectFromStorageRecords(project: ProjectRecord, frames: FrameRecord[], strokes: StrokeRecord[]): FlipProject {
  const framesByIndex = [...frames].sort((left, right) => left.index - right.index);
  const strokesByFrame = new Map<string, StrokeRecord[]>();
  for (const stroke of strokes) {
    const current = strokesByFrame.get(stroke.frameId) ?? [];
    current.push(stroke);
    strokesByFrame.set(stroke.frameId, current);
  }

  return sanitizeProject({
    id: project.id,
    title: project.title,
    fps: project.fps,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    frames: framesByIndex.map<FlipFrame>((frame, index) => {
      const restored: FlipFrame = {
        id: frame.id,
        index,
        updatedAt: frame.updatedAt,
        strokes: (strokesByFrame.get(frame.id) ?? [])
          .sort((left, right) => left.index - right.index)
          .map<Stroke>((stroke) => ({
            id: stroke.id,
            tool: stroke.tool,
            color: stroke.color,
            baseWidth: stroke.baseWidth,
            points: JSON.parse(stroke.pointsJson) as Stroke["points"],
            createdAt: stroke.createdAt,
          })),
      };
      if (frame.thumbnailUri) {
        restored.thumbnailUri = frame.thumbnailUri;
      }
      if (frame.backgroundAssetPath && frame.backgroundMetadataJson) {
        try {
          restored.background = {
            ...JSON.parse(frame.backgroundMetadataJson),
            assetPath: frame.backgroundAssetPath,
          };
        } catch {
          // Ignore malformed background metadata and keep the editable stroke frame.
        }
      }
      return restored;
    }),
  });
}

export function projectSummaryFromRecords(project: ProjectRecord, frameCount: number, previewFrame?: FlipFrame): ProjectSummary {
  const summary: ProjectSummary = {
    id: project.id,
    title: project.title,
    fps: project.fps,
    frameCount,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
  if (previewFrame) {
    summary.previewFrame = previewFrame;
  }
  return summary;
}

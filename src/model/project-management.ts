import type { FlipProject, StylusPoint } from "../types/flipbook";

type CreateId = (prefix: string) => string;

function clonePoint(point: StylusPoint): StylusPoint {
  return { ...point };
}

export function renameProjectForManagement(project: FlipProject, title: string, updatedAt: number): FlipProject {
  return {
    ...project,
    title: title.trim() || project.title,
    updatedAt,
  };
}

export function duplicateProjectForManagement(project: FlipProject, createId: CreateId, timestamp: number): FlipProject {
  return {
    id: createId("project"),
    title: `${project.title.trim() || "새 플립북"} 복사본`,
    fps: project.fps,
    createdAt: timestamp,
    updatedAt: timestamp,
    frames: project.frames.map((frame, index) => ({
      ...frame,
      id: createId("frame"),
      index,
      updatedAt: timestamp,
      strokes: frame.strokes.map((stroke) => ({
        ...stroke,
        id: createId("stroke"),
        points: stroke.points.map(clonePoint),
      })),
    })),
  };
}

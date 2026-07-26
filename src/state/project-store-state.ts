import type { FlipFrame, FlipProject, ProjectSummary } from "../types/flipbook";

export function summaryFromProject(project: FlipProject): ProjectSummary {
  return {
    id: project.id,
    title: project.title,
    fps: project.fps,
    frameCount: project.frames.length,
    previewFrame: project.frames[0],
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

function sortSummaries(summaries: ProjectSummary[]): ProjectSummary[] {
  return [...summaries].sort((left, right) => right.updatedAt - left.updatedAt);
}

export function upsertSummary(summaries: ProjectSummary[], project: FlipProject): ProjectSummary[] {
  return sortSummaries([summaryFromProject(project), ...summaries.filter((summary) => summary.id !== project.id)]);
}

export function projectWithUpdatedFrame(project: FlipProject, frame: FlipFrame, updatedAt: number): FlipProject {
  return {
    ...project,
    updatedAt,
    frames: project.frames.map((item) => (item.id === frame.id ? frame : item)),
  };
}

import type { FlipProject, ShareManifest } from "../types/flipbook";

type ManifestOptions = {
  shareId: string;
  publicBaseUrl: string;
  createdAt: number;
};

function cleanBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function frameFileName(index: number): string {
  return `${String(index + 1).padStart(4, "0")}.svg`;
}

export function getShareFrameKey(shareId: string, index: number): string {
  return `shares/${shareId}/frames/${frameFileName(index)}`;
}

export function getShareManifestKey(shareId: string): string {
  return `shares/${shareId}/manifest.json`;
}

export function createShareManifest(project: FlipProject, options: ManifestOptions): ShareManifest {
  const publicBaseUrl = cleanBaseUrl(options.publicBaseUrl);
  const frames = [...project.frames]
    .sort((a, b) => a.index - b.index)
    .map((frame, index) => ({
      index,
      url: `${publicBaseUrl}/${getShareFrameKey(options.shareId, index)}`,
    }));

  return {
    id: options.shareId,
    title: project.title,
    fps: project.fps,
    frameCount: frames.length,
    createdAt: options.createdAt,
    frames,
  };
}

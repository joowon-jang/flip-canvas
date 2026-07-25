import { createShareManifest } from "./manifest";
import { hexToRgba, rgbaToHex6 } from "../drawing/color";
import { buildPressureStrokeSegments, buildStrokeDots } from "../drawing/pressure-stroke";
import { theme } from "../theme";
import type { FlipFrame, FlipProject, Stroke } from "../types/flipbook";

type UploadPlanResponse = {
  shareId: string;
  playerUrl: string;
  publicBaseUrl: string;
  manifestUrl: string;
  manifestUploadUrl: string;
  frameUploadUrls: string[];
};

const MAX_CONCURRENT_FRAME_UPLOADS = 3;

function apiEndpoint(): string {
  const baseUrl = (process.env.EXPO_PUBLIC_APP_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
  if (baseUrl) {
    return `${baseUrl}/api/shares/create`;
  }
  if (process.env.EXPO_OS === "web") {
    return "/api/shares/create";
  }
  throw new Error("APP_PUBLIC_BASE_URL is required for native uploads");
}

async function uploadJson(url: string, body: unknown): Promise<void> {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`manifest upload failed: ${response.status}`);
  }
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function svgOpacity(alpha: number): string {
  return (Math.max(0, Math.min(255, alpha)) / 255).toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function svgStrokeColor(stroke: Stroke): { color: string; opacity: string } {
  if (stroke.tool === "eraser") {
    return { color: theme.color.paper, opacity: "1" };
  }

  const rgba = hexToRgba(stroke.color);
  return {
    color: rgbaToHex6(rgba),
    opacity: svgOpacity(rgba.a),
  };
}

function frameToSvg(frame: FlipFrame): string {
  const strokes = frame.strokes
    .flatMap((stroke) => {
      const strokeColor = svgStrokeColor(stroke);
      const color = escapeXml(strokeColor.color);
      const dots = buildStrokeDots(stroke);
      if (dots.length > 0) {
        return dots.map(
          (dot) =>
            `<circle cx="${dot.cx.toFixed(1)}" cy="${dot.cy.toFixed(1)}" r="${dot.radius.toFixed(1)}" fill="${color}" fill-opacity="${strokeColor.opacity}"/>`,
        );
      }
      return buildPressureStrokeSegments(stroke).map((segment) =>
        segment.fill
          ? `<path d="${escapeXml(segment.path)}" fill="${color}" fill-opacity="${strokeColor.opacity}"/>`
          : `<path d="${escapeXml(segment.path)}" fill="none" stroke="${color}" stroke-width="${segment.strokeWidth.toFixed(
              2,
            )}" stroke-opacity="${strokeColor.opacity}" stroke-linecap="round" stroke-linejoin="round"/>`,
      );
    })
    .join("");

  // Paper Craft sheets are plain cream — no ruled lines, margin rule, or dog-ear.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="720" viewBox="0 0 360 360"><rect width="360" height="360" fill="${theme.color.paper}"/>${strokes}</svg>`;
}

async function uploadFrameSvg(url: string, frame: FlipFrame): Promise<void> {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "image/svg+xml" },
    body: frameToSvg(frame),
  });
  if (!response.ok) {
    throw new Error(`frame upload failed: ${response.status}`);
  }
}

async function uploadWithConcurrencyLimit<T>(
  items: T[],
  concurrency: number,
  upload: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        await upload(items[index], index);
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error";
        throw new Error(`frame upload ${index + 1} failed: ${message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, runWorker));
}

export async function uploadProjectShare(project: FlipProject, onProgress?: (progress: number) => void): Promise<UploadPlanResponse> {
  const endpoint = apiEndpoint();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: project.title,
      fps: project.fps,
      frameCount: project.frames.length,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `share create failed: ${response.status}`);
  }

  const plan = (await response.json()) as UploadPlanResponse;
  if (!plan.publicBaseUrl) {
    throw new Error("share upload plan is missing publicBaseUrl");
  }

  let completedFrames = 0;
  await uploadWithConcurrencyLimit(plan.frameUploadUrls, MAX_CONCURRENT_FRAME_UPLOADS, async (uploadUrl, index) => {
    const frame = project.frames[index];
    if (!frame) {
      throw new Error("missing frame data");
    }
    await uploadFrameSvg(uploadUrl, frame);
    completedFrames += 1;
    onProgress?.(completedFrames / (plan.frameUploadUrls.length + 1));
  });

  const manifest = createShareManifest(project, {
    shareId: plan.shareId,
    publicBaseUrl: plan.publicBaseUrl,
    createdAt: Date.now(),
  });
  await uploadJson(plan.manifestUploadUrl, manifest);
  onProgress?.(1);
  return plan;
}

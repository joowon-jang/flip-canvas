export type InterpolationRequest = {
  clientInstanceId: string;
  rewardNonce: string;
  startImage: string;
  endImage: string;
  frameCount: 1 | 2 | 3;
};

type RifeInput = {
  start_image_url: string;
  end_image_url: string;
  output_type: "images";
  output_format: "png";
  num_frames: number;
  include_start: false;
  include_end: false;
};

const PNG_DATA_URI_PREFIX = "data:image/png;base64,";
const OPAQUE_ID_PATTERN = /^[A-Za-z0-9_-]{12,128}$/;

function imageByteLength(dataUri: string): number {
  if (!dataUri.startsWith(PNG_DATA_URI_PREFIX)) {
    throw new Error("images must be PNG data URIs");
  }

  const base64 = dataUri.slice(PNG_DATA_URI_PREFIX.length);
  if (!base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new Error("images must contain valid base64");
  }

  return Math.floor((base64.length * 3) / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
}

function requireOpaqueId(value: unknown, name: string): string {
  if (typeof value !== "string" || !OPAQUE_ID_PATTERN.test(value)) {
    throw new Error(`${name} is invalid`);
  }
  return value;
}

function requireImage(value: unknown, maxImageBytes: number): string {
  if (typeof value !== "string" || imageByteLength(value) > maxImageBytes) {
    throw new Error("image is too large");
  }
  return value;
}

export function parseInterpolationRequest(
  value: unknown,
  maxImageBytes = Number(process.env.AI_MAX_IMAGE_BYTES ?? 1_048_576),
): InterpolationRequest {
  if (!value || typeof value !== "object") {
    throw new Error("request body is invalid");
  }

  const input = value as Record<string, unknown>;
  if (!Number.isInteger(input.frameCount) || Number(input.frameCount) < 1 || Number(input.frameCount) > 3) {
    throw new Error("frameCount must be between 1 and 3");
  }

  return {
    clientInstanceId: requireOpaqueId(input.clientInstanceId, "clientInstanceId"),
    rewardNonce: requireOpaqueId(input.rewardNonce, "rewardNonce"),
    startImage: requireImage(input.startImage, maxImageBytes),
    endImage: requireImage(input.endImage, maxImageBytes),
    frameCount: Number(input.frameCount) as 1 | 2 | 3,
  };
}

export function buildRifeInput(startImage: string, endImage: string, frameCount: number): RifeInput {
  return {
    start_image_url: startImage,
    end_image_url: endImage,
    output_type: "images",
    output_format: "png",
    num_frames: frameCount,
    include_start: false,
    include_end: false,
  };
}

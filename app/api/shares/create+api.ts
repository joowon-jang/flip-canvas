import { createShareUploadPlan, type CreateShareRequest } from "../../../src/share/r2-presign";
import { FPS_MAX, FPS_MIN, normalizeFps } from "../../../src/model/fps";
import {
  assertShareRateLimitConfigured,
  buildShareCorsHeaders,
  isShareOriginAllowed,
  parseShareJsonBody,
  shareClientIdFromRequest,
  ShareRateLimitConfigurationError,
  ShareRequestTooLargeError,
} from "../../../src/share/share-api-guard";
import { isShareRateLimited } from "../../../src/share/share-rate-limit";

export function OPTIONS(request: Request) {
  return new Response(null, { headers: buildShareCorsHeaders(request.headers.get("Origin")) });
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function validateRequest(value: unknown): CreateShareRequest {
  const body = value as Partial<CreateShareRequest>;
  if (!body || typeof body.title !== "string") {
    throw new Error("title is required");
  }
  if (typeof body.fps !== "number" || !Number.isFinite(body.fps)) {
    throw new Error(`fps must be between ${FPS_MIN} and ${FPS_MAX}`);
  }
  const fps = normalizeFps(body.fps);
  const frameCount = body.frameCount;
  if (!Number.isInteger(frameCount) || typeof frameCount !== "number" || frameCount < 1 || frameCount > 128) {
    throw new Error("frameCount must be between 1 and 128");
  }
  return {
    title: body.title,
    fps,
    frameCount,
  };
}

export async function POST(request: Request) {
  const corsHeaders = buildShareCorsHeaders(request.headers.get("Origin"));
  try {
    if (!isShareOriginAllowed(request.headers.get("Origin"))) {
      return Response.json({ error: "origin is not allowed" }, { status: 403, headers: corsHeaders });
    }

    assertShareRateLimitConfigured();
    const rateLimit = await isShareRateLimited(shareClientIdFromRequest(request));
    if (rateLimit.limited) {
      return Response.json(
        { error: "too many share requests" },
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Retry-After": String(rateLimit.retryAfterSeconds ?? 60),
          },
        },
      );
    }

    const body = validateRequest(parseShareJsonBody(await request.text()));
    const plan = await createShareUploadPlan(body, {
      accountId: requiredEnv("R2_ACCOUNT_ID"),
      bucket: requiredEnv("R2_BUCKET"),
      accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
      publicBaseUrl: requiredEnv("R2_PUBLIC_BASE_URL"),
      appPublicBaseUrl: requiredEnv("APP_PUBLIC_BASE_URL"),
    });

    return Response.json(plan, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create share";
    const status = error instanceof ShareRateLimitConfigurationError ? 503 : error instanceof ShareRequestTooLargeError ? 413 : 400;
    return Response.json({ error: message }, { status, headers: corsHeaders });
  }
}

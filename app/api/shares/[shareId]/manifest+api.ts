import { getShareManifestKey } from "../../../../src/share/manifest";
import { buildShareCorsHeaders, isShareOriginAllowed } from "../../../../src/share/share-api-guard";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function cleanBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function shareIdFromRequest(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const sharesIndex = segments.indexOf("shares");
  return sharesIndex >= 0 ? decodeURIComponent(segments[sharesIndex + 1] ?? "") : "";
}

export function OPTIONS(request: Request) {
  return new Response(null, { headers: buildShareCorsHeaders(request.headers.get("Origin")) });
}

export async function GET(request: Request) {
  const corsHeaders = buildShareCorsHeaders(request.headers.get("Origin"));
  if (!isShareOriginAllowed(request.headers.get("Origin"))) {
    return Response.json({ error: "origin is not allowed" }, { status: 403, headers: corsHeaders });
  }

  const shareId = shareIdFromRequest(request);
  if (!shareId) {
    return Response.json({ error: "shareId is required" }, { status: 400, headers: corsHeaders });
  }

  try {
    const manifestUrl = `${cleanBaseUrl(requiredEnv("R2_PUBLIC_BASE_URL"))}/${getShareManifestKey(shareId)}`;
    const response = await fetch(manifestUrl);
    if (!response.ok) {
      return Response.json({ error: `manifest fetch failed: ${response.status}` }, { status: response.status, headers: corsHeaders });
    }
    return new Response(await response.text(), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load manifest";
    return Response.json({ error: message }, { status: 400, headers: corsHeaders });
  }
}

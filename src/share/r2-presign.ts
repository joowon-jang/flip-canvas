import { getShareFrameKey, getShareManifestKey } from "./manifest";

export type CreateShareRequest = {
  title: string;
  fps: number;
  frameCount: number;
};

export type R2Config = {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  appPublicBaseUrl: string;
  now?: Date;
  randomId?: () => string;
};

export type ShareUploadPlan = {
  shareId: string;
  playerUrl: string;
  publicBaseUrl: string;
  manifestUrl: string;
  manifestUploadUrl: string;
  frameUploadUrls: string[];
};

const REGION = "auto";
const SERVICE = "s3";
const EXPIRES_SECONDS = 900;
const UNSIGNED_PAYLOAD = "UNSIGNED-PAYLOAD";

function cleanBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function createDefaultShareId(): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return random.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
}

function isoDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function shortDate(amzDate: string): string {
  return amzDate.slice(0, 8);
}

function encodePathPart(value: string): string {
  return value
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  return toHex(await globalThis.crypto.subtle.digest("SHA-256", data));
}

function textBytes(value: string): ArrayBuffer {
  const data = new TextEncoder().encode(value);
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

async function hmac(key: ArrayBuffer, value: string): Promise<ArrayBuffer> {
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return globalThis.crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(value));
}

async function signingKey(secretAccessKey: string, date: string): Promise<ArrayBuffer> {
  const kDate = await hmac(textBytes(`AWS4${secretAccessKey}`), date);
  const kRegion = await hmac(kDate, REGION);
  const kService = await hmac(kRegion, SERVICE);
  return hmac(kService, "aws4_request");
}

function canonicalQuery(params: URLSearchParams): string {
  return [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

async function presignPutUrl(config: R2Config, objectKey: string, contentType: string): Promise<string> {
  const now = config.now ?? new Date();
  const amzDate = isoDate(now);
  const date = shortDate(amzDate);
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${config.bucket}/${encodePathPart(objectKey)}`;
  const credentialScope = `${date}/${REGION}/${SERVICE}/aws4_request`;
  const credential = `${config.accessKeyId}/${credentialScope}`;

  const params = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Content-Sha256": UNSIGNED_PAYLOAD,
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(EXPIRES_SECONDS),
    "X-Amz-SignedHeaders": "content-type;host",
  });

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQuery(params),
    canonicalHeaders,
    "content-type;host",
    UNSIGNED_PAYLOAD,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");
  const signature = toHex(await hmac(await signingKey(config.secretAccessKey, date), stringToSign));
  params.set("X-Amz-Signature", signature);

  return `https://${host}${canonicalUri}?${canonicalQuery(params)}`;
}

export async function createShareUploadPlan(
  request: CreateShareRequest,
  config: R2Config,
): Promise<ShareUploadPlan> {
  if (request.frameCount < 1) {
    throw new Error("frameCount must be at least 1");
  }

  const shareId = config.randomId?.() ?? createDefaultShareId();
  const manifestUploadUrl = await presignPutUrl(config, getShareManifestKey(shareId), "application/json");
  const frameUploadUrls = await Promise.all(
    Array.from({ length: request.frameCount }, (_, index) =>
      presignPutUrl(config, getShareFrameKey(shareId, index), "image/svg+xml"),
    ),
  );

  return {
    shareId,
    playerUrl: `${cleanBaseUrl(config.appPublicBaseUrl)}/v/${shareId}`,
    publicBaseUrl: cleanBaseUrl(config.publicBaseUrl),
    manifestUrl: `${cleanBaseUrl(config.publicBaseUrl)}/${getShareManifestKey(shareId)}`,
    manifestUploadUrl,
    frameUploadUrls,
  };
}

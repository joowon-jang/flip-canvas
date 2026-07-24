import { parseAdMobSsvQuery, type AdMobSsvQuery } from "./admob-ssv";

const ADMOB_KEYS_URL = "https://www.gstatic.com/admob/reward/verifier-keys.json";
const KEY_CACHE_MS = 10 * 60 * 1000;

type AdMobKey = {
  keyId: number;
  pem?: string;
  base64: string;
};

let cachedKeys: { expiresAt: number; keys: AdMobKey[] } | undefined;

function decodeBase64(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function arrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

function trimInteger(bytes: Uint8Array): Uint8Array {
  let offset = 0;
  while (offset < bytes.length - 1 && bytes[offset] === 0) {
    offset += 1;
  }
  return bytes.slice(offset);
}

function derEcdsaToRaw(signature: Uint8Array, coordinateBytes = 32): Uint8Array {
  if (signature[0] !== 0x30) {
    throw new Error("invalid ECDSA signature");
  }

  let offset = 2;
  if ((signature[1] & 0x80) !== 0) {
    const lengthBytes = signature[1] & 0x7f;
    offset = 2 + lengthBytes;
  }
  if (signature[offset] !== 0x02) {
    throw new Error("invalid ECDSA r value");
  }
  const rLength = signature[offset + 1];
  const r = trimInteger(signature.slice(offset + 2, offset + 2 + rLength));
  offset += 2 + rLength;
  if (signature[offset] !== 0x02) {
    throw new Error("invalid ECDSA s value");
  }
  const sLength = signature[offset + 1];
  const s = trimInteger(signature.slice(offset + 2, offset + 2 + sLength));
  if (r.length > coordinateBytes || s.length > coordinateBytes) {
    throw new Error("invalid ECDSA coordinate length");
  }

  const raw = new Uint8Array(coordinateBytes * 2);
  raw.set(r, coordinateBytes - r.length);
  raw.set(s, coordinateBytes * 2 - s.length);
  return raw;
}

async function getAdMobKeys(): Promise<AdMobKey[]> {
  if (cachedKeys && cachedKeys.expiresAt > Date.now()) {
    return cachedKeys.keys;
  }

  const response = await fetch(ADMOB_KEYS_URL);
  if (!response.ok) {
    throw new Error("could not fetch AdMob verification keys");
  }
  const payload = (await response.json()) as { keys?: AdMobKey[] };
  if (!payload.keys?.length) {
    throw new Error("AdMob verification keys are empty");
  }
  cachedKeys = { expiresAt: Date.now() + KEY_CACHE_MS, keys: payload.keys };
  return payload.keys;
}

export async function verifyAdMobSsvQuery(rawQuery: string): Promise<AdMobSsvQuery> {
  const parsed = parseAdMobSsvQuery(rawQuery);
  const keys = await getAdMobKeys();
  const key = keys.find((candidate) => candidate.keyId === parsed.keyId);
  if (!key) {
    cachedKeys = undefined;
    throw new Error("unknown AdMob verification key");
  }

  const publicKey = await crypto.subtle.importKey(
    "spki",
    arrayBuffer(decodeBase64(key.base64)),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  const derSignature = decodeBase64(parsed.signature);
  const valid = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    publicKey,
    arrayBuffer(derEcdsaToRaw(derSignature)),
    arrayBuffer(new TextEncoder().encode(parsed.signedContent)),
  );
  if (!valid) {
    throw new Error("invalid AdMob SSV signature");
  }
  return parsed;
}

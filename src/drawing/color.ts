export type RgbaColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type HsvColor = {
  h: number;
  s: number;
  v: number;
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

function clampByte(value: number): number {
  return Math.round(clamp(value, 0, 255));
}

function clampPercent(value: number): number {
  return Math.round(clamp(value, 0, 100));
}

function toHexByte(value: number): string {
  return clampByte(value).toString(16).padStart(2, "0").toUpperCase();
}

export function alphaPercentToByte(percent: number): number {
  return clampByte((clamp(percent, 0, 100) / 100) * 255);
}

export function alphaByteToPercent(alpha: number): number {
  return clampPercent((clampByte(alpha) / 255) * 100);
}

export function rgbaToHex8(color: RgbaColor): string {
  return `#${toHexByte(color.r)}${toHexByte(color.g)}${toHexByte(color.b)}${toHexByte(color.a)}`;
}

export function rgbaToHex6(color: RgbaColor): string {
  return `#${toHexByte(color.r)}${toHexByte(color.g)}${toHexByte(color.b)}`;
}

export function hexToRgba(value: string): RgbaColor {
  const normalized = value.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(normalized)) {
    return { r: 23, g: 23, b: 23, a: 255 };
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
    a: normalized.length === 8 ? Number.parseInt(normalized.slice(6, 8), 16) : 255,
  };
}

export function rgbToHsv(color: Pick<RgbaColor, "r" | "g" | "b">): HsvColor {
  const r = clampByte(color.r) / 255;
  const g = clampByte(color.g) / 255;
  const b = clampByte(color.b) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }

  return {
    h: Math.round(h),
    s: max === 0 ? 0 : Math.round((delta / max) * 100),
    v: Math.round(max * 100),
  };
}

export function hsvToRgb(color: HsvColor): Pick<RgbaColor, "r" | "g" | "b"> {
  const h = ((clamp(color.h, 0, 360) % 360) + 360) % 360;
  const s = clamp(color.s, 0, 100) / 100;
  const v = clamp(color.v, 0, 100) / 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return {
    r: clampByte((r + m) * 255),
    g: clampByte((g + m) * 255),
    b: clampByte((b + m) * 255),
  };
}

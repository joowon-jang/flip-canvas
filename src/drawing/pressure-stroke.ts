import type { Stroke } from "../types/flipbook";

export type PressureStrokeSegment = {
  path: string;
  strokeWidth: number;
  fill: boolean;
};

export type StrokeDot = {
  cx: number;
  cy: number;
  radius: number;
};

const RAW_PRESSURE_MIN_FACTOR = 0.35;
const RAW_PRESSURE_MAX_FACTOR = 1.35;
const RAW_PRESSURE_REFERENCE_MIN = 100;
const RAW_PRESSURE_REFERENCE_SPAN = 100;
const MIN_RENDERED_RADIUS = 0.5;

export function buildPressureStrokeSegments(stroke: Stroke, scale = 1, pointsPerSegment?: number): PressureStrokeSegment[] {
  const points = Array.isArray(stroke.points) ? stroke.points : [];
  if (points.length < 2) {
    return [];
  }

  const baseWidth = Math.max(1, stroke.baseWidth * scale);
  return [
    {
      path: buildPressureOutlinePath(points, baseWidth, scale, pointsPerSegment),
      strokeWidth: 0,
      fill: true,
    },
  ];
}

export function buildStrokeDots(stroke: Stroke, scale = 1): StrokeDot[] {
  const points = Array.isArray(stroke.points) ? stroke.points : [];
  if (points.length !== 1) {
    return [];
  }

  const point = points[0];
  const pressure = pressureFactor(point);
  return [
    {
      cx: point.x * scale,
      cy: point.y * scale,
      radius: Math.max(1, (stroke.baseWidth * scale * pressure) / 2),
    },
  ];
}

function pressureFactor(point: Stroke["points"][number]): number {
  if (
    typeof point.rawPressure === "number" &&
    Number.isFinite(point.rawPressure) &&
    point.rawPressure > 1 &&
    point.pressure >= 0.98
  ) {
    const normalizedRaw = (point.rawPressure - RAW_PRESSURE_REFERENCE_MIN) / RAW_PRESSURE_REFERENCE_SPAN;
    return Math.max(
      RAW_PRESSURE_MIN_FACTOR,
      Math.min(RAW_PRESSURE_MAX_FACTOR, RAW_PRESSURE_MIN_FACTOR + normalizedRaw),
    );
  }

  return Math.max(0.05, Math.min(1, point.pressure ?? 0.5));
}

function buildPressureOutlinePath(points: Stroke["points"], baseWidth: number, scale: number, _pointsPerSegment?: number): string {
  const factors = smoothedPressureFactors(points);
  const left: Array<{ x: number; y: number }> = [];
  const right: Array<{ x: number; y: number }> = [];

  points.forEach((point, index) => {
    const normal = pointNormal(points, index);
    const radius = Math.max(MIN_RENDERED_RADIUS, (baseWidth * factors[index]) / 2);
    const x = point.x * scale;
    const y = point.y * scale;
    left.push({ x: x + normal.x * radius, y: y + normal.y * radius });
    right.push({ x: x - normal.x * radius, y: y - normal.y * radius });
  });

  const commands = [`M ${coordinate(left[0].x)} ${coordinate(left[0].y)}`];
  appendSmoothSide(commands, left);
  appendRoundCap(commands, points[points.length - 1], scale, right[right.length - 1]);
  appendSmoothSide(commands, [...right].reverse());
  appendRoundCap(commands, points[0], scale, left[0]);
  commands.push("Z");
  return commands.join(" ");
}

function smoothedPressureFactors(points: Stroke["points"]): number[] {
  const factors = points.map(pressureFactor);
  if (factors.length < 3) {
    return factors;
  }

  return factors.map((factor, index) => {
    if (index === 0 || index === factors.length - 1) {
      return factor;
    }
    return factors[index - 1] * 0.25 + factor * 0.5 + factors[index + 1] * 0.25;
  });
}

function pointNormal(points: Stroke["points"], index: number): { x: number; y: number } {
  const previous = points[Math.max(0, index - 1)];
  const next = points[Math.min(points.length - 1, index + 1)];
  const dx = next.x - previous.x;
  const dy = next.y - previous.y;
  const length = Math.hypot(dx, dy);
  if (length <= 0.0001) {
    return { x: 0, y: 1 };
  }
  return { x: (-dy / length), y: dx / length };
}

function appendSmoothSide(commands: string[], points: Array<{ x: number; y: number }>): void {
  if (points.length < 2) {
    return;
  }

  if (points.length === 2) {
    const second = points[1];
    commands.push(`L ${coordinate(second.x)} ${coordinate(second.y)}`);
    return;
  }

  for (let index = 1; index < points.length - 1; index += 1) {
    const control = points[index];
    const next = points[index + 1];
    const midpointX = (control.x + next.x) / 2;
    const midpointY = (control.y + next.y) / 2;
    commands.push(
      `Q ${coordinate(control.x)} ${coordinate(control.y)} ${coordinate(midpointX)} ${coordinate(midpointY)}`,
    );
  }

  const last = points[points.length - 1];
  commands.push(`L ${coordinate(last.x)} ${coordinate(last.y)}`);
}

function appendRoundCap(commands: string[], point: Stroke["points"][number], scale: number, target: { x: number; y: number }): void {
  const centerX = point.x * scale;
  const centerY = point.y * scale;
  const radius = Math.hypot(target.x - centerX, target.y - centerY);
  if (radius <= 0.0001) {
    commands.push(`L ${coordinate(target.x)} ${coordinate(target.y)}`);
    return;
  }

  commands.push(
    `A ${coordinate(radius)} ${coordinate(radius)} 0 0 0 ${coordinate(target.x)} ${coordinate(target.y)}`,
  );
}

function coordinate(value: number): string {
  return value.toFixed(2);
}

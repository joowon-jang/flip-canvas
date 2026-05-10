import type { StylusPoint } from "../types/flipbook";

const DEFAULT_MIN_DISTANCE = 1.4;
export const DEFAULT_MAX_STROKE_POINTS = 1600;
const DEFAULT_SIMPLIFY_TOLERANCE = 0.75;

export function appendSampledPoints(
  existingPoints: StylusPoint[],
  incomingPoints: StylusPoint[],
  minDistance = DEFAULT_MIN_DISTANCE,
): StylusPoint[] {
  if (incomingPoints.length === 0) {
    return existingPoints;
  }

  const sampled = existingPoints;
  let anchor = sampled[sampled.length - 1];
  const minDistanceSquared = minDistance * minDistance;

  for (const point of incomingPoints) {
    if (!anchor || point.phase === "begin" || point.phase === "end" || point.phase === "cancel") {
      sampled.push(point);
      anchor = point;
      continue;
    }

    const distanceSquared = (point.x - anchor.x) ** 2 + (point.y - anchor.y) ** 2;
    if (distanceSquared >= minDistanceSquared) {
      sampled.push(point);
      anchor = point;
    }
  }

  return sampled;
}

function perpendicularDistanceSquared(point: StylusPoint, start: StylusPoint, end: StylusPoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) {
    return (point.x - start.x) ** 2 + (point.y - start.y) ** 2;
  }

  const ratio = ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy);
  const projectedX = start.x + ratio * dx;
  const projectedY = start.y + ratio * dy;
  return (point.x - projectedX) ** 2 + (point.y - projectedY) ** 2;
}

function simplifyRange(points: StylusPoint[], firstIndex: number, lastIndex: number, keep: Set<number>, toleranceSquared: number): void {
  let maxDistance = 0;
  let maxIndex = -1;
  const start = points[firstIndex];
  const end = points[lastIndex];

  for (let index = firstIndex + 1; index < lastIndex; index += 1) {
    const distance = perpendicularDistanceSquared(points[index], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = index;
    }
  }

  if (maxIndex >= 0 && maxDistance > toleranceSquared) {
    keep.add(maxIndex);
    simplifyRange(points, firstIndex, maxIndex, keep, toleranceSquared);
    simplifyRange(points, maxIndex, lastIndex, keep, toleranceSquared);
  }
}

function downsampleToBudget(points: StylusPoint[], maxPoints: number): StylusPoint[] {
  if (points.length <= maxPoints) {
    return points;
  }

  const result: StylusPoint[] = [points[0]];
  const middleBudget = Math.max(0, maxPoints - 2);
  const step = (points.length - 2) / Math.max(1, middleBudget);
  for (let index = 0; index < middleBudget; index += 1) {
    result.push(points[1 + Math.floor(index * step)]);
  }
  result.push(points[points.length - 1]);
  return result;
}

export function simplifyStrokePoints(
  points: StylusPoint[],
  maxPoints = DEFAULT_MAX_STROKE_POINTS,
  tolerance = DEFAULT_SIMPLIFY_TOLERANCE,
): StylusPoint[] {
  if (points.length <= maxPoints) {
    return points;
  }

  const keep = new Set<number>([0, points.length - 1]);
  for (let index = 0; index < points.length; index += 1) {
    const phase = points[index].phase;
    if (phase === "begin" || phase === "end" || phase === "cancel") {
      keep.add(index);
    }
  }

  simplifyRange(points, 0, points.length - 1, keep, tolerance * tolerance);
  const simplified = [...keep]
    .sort((left, right) => left - right)
    .map((index) => points[index]);

  return downsampleToBudget(simplified, maxPoints);
}

import type { StylusPoint } from "../types/flipbook";

function coordinate(value: number): string {
  return value.toFixed(2);
}

function scaled(point: StylusPoint, scale: number): { x: number; y: number } {
  return {
    x: point.x * scale,
    y: point.y * scale,
  };
}

export function buildStrokePath(points: StylusPoint[], scale = 1): string {
  if (points.length === 0) {
    return "";
  }

  const first = scaled(points[0], scale);
  if (points.length === 1) {
    return `M ${coordinate(first.x)} ${coordinate(first.y)}`;
  }

  if (points.length === 2) {
    const end = scaled(points[1], scale);
    return `M ${coordinate(first.x)} ${coordinate(first.y)} L ${coordinate(end.x)} ${coordinate(end.y)}`;
  }

  const commands = [`M ${coordinate(first.x)} ${coordinate(first.y)}`];
  for (let index = 1; index < points.length - 1; index += 1) {
    const control = scaled(points[index], scale);
    const next = scaled(points[index + 1], scale);
    const midpoint = {
      x: (control.x + next.x) / 2,
      y: (control.y + next.y) / 2,
    };
    commands.push(
      `Q ${coordinate(control.x)} ${coordinate(control.y)} ${coordinate(midpoint.x)} ${coordinate(midpoint.y)}`,
    );
  }

  const last = scaled(points[points.length - 1], scale);
  commands.push(`L ${coordinate(last.x)} ${coordinate(last.y)}`);
  return commands.join(" ");
}

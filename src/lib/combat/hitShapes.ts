export type Point = { x: number; y: number }

export function dist(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx
  const dy = ay - by
  return Math.sqrt(dx * dx + dy * dy)
}

export function angleTo(from: Point, to: Point) {
  return Math.atan2(to.y - from.y, to.x - from.x)
}

export function inCircle(px: number, py: number, cx: number, cy: number, r: number) {
  return dist(px, py, cx, cy) <= r
}

/** Capsule / thick line from A toward facing (or to end point). */
export function inLine(
  px: number,
  py: number,
  ox: number,
  oy: number,
  angle: number,
  length: number,
  halfWidth: number,
) {
  const ex = ox + Math.cos(angle) * length
  const ey = oy + Math.sin(angle) * length
  const dx = ex - ox
  const dy = ey - oy
  const len2 = dx * dx + dy * dy || 1
  let t = ((px - ox) * dx + (py - oy) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const cx = ox + t * dx
  const cy = oy + t * dy
  return dist(px, py, cx, cy) <= halfWidth
}

/** Arc in front of origin. facing: 1 right / -1 left, or absolute angle radians if useAngle. */
export function inCone(
  px: number,
  py: number,
  ox: number,
  oy: number,
  angle: number,
  range: number,
  halfAngleRad: number,
) {
  const d = dist(px, py, ox, oy)
  if (d > range || d < 1) return d <= range * 0.15
  const a = Math.atan2(py - oy, px - ox)
  let diff = a - angle
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  return Math.abs(diff) <= halfAngleRad
}

export function facingAngle(facing: number) {
  return facing >= 0 ? 0 : Math.PI
}

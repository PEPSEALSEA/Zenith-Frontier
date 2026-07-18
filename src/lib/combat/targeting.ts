import type { Point } from './hitShapes'

export type CombatMonster = {
  id: string
  x: number
  y: number
  deadUntil: number
}

export type LockState = {
  targetId: string | null
}

const LOCK_RANGE = 320

export function livingInRange(monsters: CombatMonster[], origin: Point, range: number, now: number) {
  return monsters
    .filter((m) => m.deadUntil <= now && Math.hypot(m.x - origin.x, m.y - origin.y) <= range)
    .sort((a, b) => Math.hypot(a.x - origin.x, a.y - origin.y) - Math.hypot(b.x - origin.x, b.y - origin.y))
}

export function cycleLock(
  state: LockState,
  monsters: CombatMonster[],
  origin: Point,
  now: number,
  range = LOCK_RANGE,
): string | null {
  const list = livingInRange(monsters, origin, range, now)
  if (list.length === 0) {
    state.targetId = null
    return null
  }
  const idx = list.findIndex((m) => m.id === state.targetId)
  const next = list[(idx + 1) % list.length]
  state.targetId = next.id
  return next.id
}

export function clearLock(state: LockState) {
  state.targetId = null
}

export function getLocked(
  state: LockState,
  monsters: CombatMonster[],
  now: number,
): CombatMonster | null {
  if (!state.targetId) return null
  const m = monsters.find((x) => x.id === state.targetId)
  if (!m || m.deadUntil > now) {
    state.targetId = null
    return null
  }
  return m
}

export function aimAngle(
  origin: Point,
  facing: number,
  locked: { id: string; x: number; y: number } | null,
  aimPoint?: Point | null,
): number {
  if (locked) return Math.atan2(locked.y - origin.y, locked.x - origin.x)
  if (aimPoint) {
    const dx = aimPoint.x - origin.x
    const dy = aimPoint.y - origin.y
    if (dx * dx + dy * dy > 4) return Math.atan2(dy, dx)
  }
  return facing >= 0 ? 0 : Math.PI
}

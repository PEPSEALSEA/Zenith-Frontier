import type { WorldObject } from '@/store/gameStore'

/** East flat wall X — gate opens here. */
export const TOWN_EAST_WALL_X = 880

/** Star Town outer wall polygon (clockwise). */
export const TOWN_WALL_PTS: { x: number; y: number }[] = [
  { x: 120, y: 100 },
  { x: 840, y: 100 },
  { x: TOWN_EAST_WALL_X, y: 150 },
  { x: TOWN_EAST_WALL_X, y: 650 },
  { x: 840, y: 700 },
  { x: 120, y: 700 },
  { x: 80, y: 650 },
  { x: 80, y: 150 },
]

export const TOWN_WALL_THICKNESS = 22

/** Walkable corridor through the east wall — only way in/out of town. */
export const TOWN_GATE_ZONE = { x: 848, y: 360, w: 72, h: 80 }

/** Whisperwood Park — fully east of town, no overlap. */
export const PARK_BOUNDS = { x: 1020, y: 120, w: 620, h: 620 }

export const TOWN_BOUNDS = { x: 70, y: 80, w: 830, h: 640 }

export const GATE_PATH = { fromX: 860, toX: 1040, y: 400 }

function distPointSeg(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 < 1e-6) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

export function distToTownWall(px: number, py: number): number {
  const pts = TOWN_WALL_PTS
  let best = Infinity
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    best = Math.min(best, distPointSeg(px, py, a.x, a.y, b.x, b.y))
  }
  return best
}

export function inTownGateZone(px: number, py: number): boolean {
  const g = TOWN_GATE_ZONE
  return px >= g.x && px <= g.x + g.w && py >= g.y && py <= g.y + g.h
}

export function isBlockedByTownWall(px: number, py: number): boolean {
  if (inTownGateZone(px, py)) return false
  return distToTownWall(px, py) <= TOWN_WALL_THICKNESS * 0.55
}

export function resolveWalk(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): { x: number; y: number } {
  if (!isBlockedByTownWall(toX, toY)) return { x: toX, y: toY }
  if (!isBlockedByTownWall(toX, fromY)) return { x: toX, y: fromY }
  if (!isBlockedByTownWall(fromX, toY)) return { x: fromX, y: toY }
  return { x: fromX, y: fromY }
}

export function townPtsParam(): string {
  return TOWN_WALL_PTS.map((p) => `${p.x},${p.y}`).join('|')
}

export function drawTownWalls(ctx: CanvasRenderingContext2D) {
  const pts = TOWN_WALL_PTS
  if (pts.length < 3) return
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'butt'

  const eastX = TOWN_EAST_WALL_X
  const segments: { x: number; y: number }[][] = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    const isEastWall = Math.abs(a.x - eastX) < 1 && Math.abs(b.x - eastX) < 1
    if (isEastWall) {
      const y0 = Math.min(a.y, b.y)
      const y1 = Math.max(a.y, b.y)
      const gateTop = TOWN_GATE_ZONE.y
      const gateBot = TOWN_GATE_ZONE.y + TOWN_GATE_ZONE.h
      if (y0 < gateTop) segments.push([{ x: eastX, y: y0 }, { x: eastX, y: gateTop }])
      if (gateBot < y1) segments.push([{ x: eastX, y: gateBot }, { x: eastX, y: y1 }])
    } else {
      segments.push([a, b])
    }
  }

  const strokeSegs = (color: string, width: number) => {
    ctx.strokeStyle = color
    ctx.lineWidth = width
    for (const seg of segments) {
      ctx.beginPath()
      ctx.moveTo(seg[0].x, seg[0].y)
      ctx.lineTo(seg[1].x, seg[1].y)
      ctx.stroke()
    }
  }

  strokeSegs('#5c3418', TOWN_WALL_THICKNESS + 4)
  strokeSegs('#8a5530', TOWN_WALL_THICKNESS)
  strokeSegs('#c4a06a', 4)

  const g = TOWN_GATE_ZONE
  ctx.fillStyle = '#6b3f1f'
  ctx.fillRect(g.x - 8, g.y - 6, 12, g.h + 12)
  ctx.fillRect(g.x + g.w - 4, g.y - 6, 12, g.h + 12)
  ctx.fillStyle = '#c4a574'
  ctx.fillRect(g.x - 6, g.y - 4, 8, g.h + 8)
  ctx.fillRect(g.x + g.w - 4, g.y - 4, 8, g.h + 8)

  ctx.restore()
}

export function drawParkGround(ctx: CanvasRenderingContext2D, obj: WorldObject) {
  const b = PARK_BOUNDS
  ctx.save()
  const g = ctx.createRadialGradient(obj.x, obj.y, 60, obj.x, obj.y, Math.max(b.w, b.h) * 0.55)
  g.addColorStop(0, 'rgba(110, 170, 90, 0.55)')
  g.addColorStop(0.55, 'rgba(70, 130, 70, 0.42)')
  g.addColorStop(1, 'rgba(40, 90, 55, 0.22)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(obj.x, obj.y, b.w * 0.48, b.h * 0.46, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(50, 110, 60, 0.45)'
  ctx.lineWidth = 4
  ctx.stroke()

  const pathY = GATE_PATH.y
  ctx.strokeStyle = 'rgba(180, 150, 100, 0.55)'
  ctx.lineWidth = 28
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(GATE_PATH.fromX, pathY)
  ctx.quadraticCurveTo((GATE_PATH.fromX + GATE_PATH.toX) / 2, pathY, GATE_PATH.toX, pathY)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(210, 180, 130, 0.4)'
  ctx.lineWidth = 14
  ctx.stroke()

  ctx.fillStyle = 'rgba(80, 160, 210, 0.45)'
  ctx.beginPath()
  ctx.ellipse(obj.x + 40, obj.y + 180, 70, 40, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(160, 220, 245, 0.35)'
  ctx.beginPath()
  ctx.ellipse(obj.x + 20, obj.y + 168, 22, 12, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function drawGatePath(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.strokeStyle = 'rgba(180, 150, 100, 0.5)'
  ctx.lineWidth = 26
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(GATE_PATH.fromX, GATE_PATH.y)
  ctx.lineTo(GATE_PATH.toX, GATE_PATH.y)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(210, 180, 130, 0.35)'
  ctx.lineWidth = 12
  ctx.stroke()
  ctx.restore()
}

export function regionIdAt(x: number, y: number): 'town1' | 'park1' | null {
  const t = TOWN_BOUNDS
  if (x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h) return 'town1'
  const p = PARK_BOUNDS
  if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return 'park1'
  return null
}

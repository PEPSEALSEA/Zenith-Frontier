import type { WorldObject, WorldObjectType } from '@/store/gameStore'
import { drawSprite } from '@/lib/sprites'
import { PARK_BOUNDS, PARK_OUTLINE_PTS, parkPtsParam } from '@/lib/map/worldLayout'

export const STAR_TOWN_SPAWN = { x: 500, y: 400 }

export type InteractKind = 'talk' | 'shop' | 'rest' | 'heal' | 'golf'

export function parseNum(v: unknown, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function parsePolyPts(raw: unknown): { x: number; y: number }[] {
  const s = String(raw || '')
  if (!s) return []
  return s.split('|').map((pair) => {
    const [a, b] = pair.split(',').map(Number)
    return { x: a, y: b }
  }).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
}

function pointInPoly(px: number, py: number, pts: { x: number; y: number }[]): boolean {
  if (pts.length < 3) return false
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x
    const yi = pts[i].y
    const xj = pts[j].x
    const yj = pts[j].y
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 0.0001) + xi
    if (intersect) inside = !inside
  }
  return inside
}

export function zoneHalfSize(obj: WorldObject): { hw: number; hh: number } {
  const shape = String(obj.params?.shape || 'circle')
  if (shape === 'rect' || shape === 'poly') {
    return {
      hw: parseNum(obj.params?.w, obj.radius * 2) / 2,
      hh: parseNum(obj.params?.h, obj.radius * 2) / 2,
    }
  }
  return { hw: obj.radius, hh: obj.radius }
}

export function pointInZone(px: number, py: number, obj: WorldObject): boolean {
  const shape = String(obj.params?.shape || 'circle')
  if (shape === 'poly') {
    const pts = parsePolyPts(obj.params?.pts)
    if (pts.length >= 3) return pointInPoly(px, py, pts)
  }
  if (shape === 'rect' || shape === 'poly') {
    const { hw, hh } = zoneHalfSize(obj)
    return px >= obj.x - hw && px <= obj.x + hw && py >= obj.y - hh && py <= obj.y + hh
  }
  const dx = px - obj.x
  const dy = py - obj.y
  return Math.sqrt(dx * dx + dy * dy) <= obj.radius
}

export function isInSafeZone(px: number, py: number, objects: WorldObject[]): boolean {
  return objects.some(
    (o) => (o.type === 'town' || o.type === 'safezone') && pointInZone(px, py, o),
  )
}

export function isGateObject(obj: WorldObject): boolean {
  return String(obj.params?.kind || '') === 'gate' || String(obj.params?.gate || '') !== ''
}

export function findNearbyGate(
  px: number,
  py: number,
  objects: WorldObject[],
  range = 36,
): WorldObject | null {
  let best: WorldObject | null = null
  let bestD = range
  for (const o of objects) {
    if (!isGateObject(o)) continue
    const d = Math.sqrt((px - o.x) ** 2 + (py - o.y) ** 2)
    if (d < bestD) {
      bestD = d
      best = o
    }
  }
  return best
}

export function interactKindOf(obj: WorldObject): InteractKind | null {
  if (isGateObject(obj)) return null
  const raw = String(obj.params?.interact || '')
  if (raw === 'talk' || raw === 'shop' || raw === 'rest' || raw === 'heal' || raw === 'golf') {
    return raw
  }
  if (obj.type === 'npc') return 'talk'
  if (obj.type === 'market') return 'shop'
  if (obj.type === 'hotel') return 'rest'
  if (obj.type === 'landmark' && String(obj.params?.kind || '') === 'heal') return 'heal'
  if (obj.type === 'landmark' && String(obj.params?.kind || '') === 'golf') return 'golf'
  if (obj.type === 'landmark' && String(obj.params?.kind || '') === 'house') return 'talk'
  return null
}

export function findNearbyInteractable(
  px: number,
  py: number,
  objects: WorldObject[],
  range = 48,
): WorldObject | null {
  let best: WorldObject | null = null
  let bestD = range
  for (const o of objects) {
    if (!interactKindOf(o)) continue
    const dx = px - o.x
    const dy = py - o.y
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d < bestD) {
      bestD = d
      best = o
    }
  }
  return best
}

export function interactPrompt(obj: WorldObject): { title: string; body: string; cost?: number; item?: string } {
  const kind = interactKindOf(obj)
  switch (kind) {
    case 'shop':
      return {
        title: obj.name,
        body: 'Buy a Health Potion?',
        cost: parseNum(obj.params?.price, 25),
        item: String(obj.params?.item_id || 'EQ_004'),
      }
    case 'rest':
      return {
        title: obj.name,
        body: 'Rest at the Softcloud Inn? Fully restores HP & MP.',
        cost: parseNum(obj.params?.price, 10),
      }
    case 'heal':
      return {
        title: obj.name,
        body: 'Dip into the Star Spring? Free heal.',
        cost: 0,
      }
    case 'golf':
      return {
        title: obj.name,
        body: 'Star Town Mini-Golf — swinging for fun in the safe zone!',
      }
    case 'talk':
    default:
      return {
        title: obj.name,
        body: String(
          obj.params?.line ||
            'Welcome to Star Town (Town 1)! Shops, inns, and healing are safe here. Take the east gate to Whisperwood Park.',
        ),
      }
  }
}

/** Client fallback if Pi map has not been reseeded yet. */
export const STAR_TOWN_FALLBACK: WorldObject[] = [
  {
    id: 'town_start',
    type: 'town',
    x: 500,
    y: 400,
    z: 0,
    name: 'Star Town',
    radius: 420,
    params: {
      shape: 'poly',
      w: '800',
      h: '600',
      safe: '1',
      map_id: 'town1',
      pts: '120,100|840,100|880,150|880,650|840,700|120,700|80,650|80,150',
    },
  },
  {
    id: 'player_home',
    type: 'landmark',
    x: 500,
    y: 180,
    z: 2,
    name: 'Your House',
    radius: 42,
    params: {
      interact: 'talk',
      kind: 'house',
      color: '#f59e0b',
      line: 'Home sweet home. Safe walls of Town 1.',
    },
  },
  {
    id: 'npc_stella',
    type: 'npc',
    x: 380,
    y: 320,
    z: 2,
    name: 'Stella',
    radius: 28,
    params: {
      interact: 'talk',
      entity_id: 'NPC_STELLA',
      line: 'Hi! This is Star Town — Town 1. Rest at Softcloud Inn, shop at Star Mart, heal at the spring. East gate leads to Whisperwood Park!',
      color: '#fbbf24',
      face: 'star',
    },
  },
  {
    id: 'star_mart',
    type: 'market',
    x: 220,
    y: 400,
    z: 2,
    name: 'Star Mart',
    radius: 36,
    params: { interact: 'shop', price: '25', item_id: 'EQ_004', color: '#34d399' },
  },
  {
    id: 'star_scrolls',
    type: 'market',
    x: 260,
    y: 560,
    z: 2,
    name: 'Scroll Stall',
    radius: 32,
    params: { interact: 'shop', price: '200', item_id: 'EQ_SCR_001', color: '#c084fc' },
  },
  {
    id: 'star_inn',
    type: 'hotel',
    x: 720,
    y: 240,
    z: 2,
    name: 'Softcloud Inn',
    radius: 36,
    params: { interact: 'rest', price: '10', color: '#60a5fa' },
  },
  {
    id: 'star_heal',
    type: 'landmark',
    x: 500,
    y: 600,
    z: 2,
    name: 'Star Spring',
    radius: 34,
    params: { interact: 'heal', kind: 'heal', color: '#2dd4bf' },
  },
  {
    id: 'star_golf',
    type: 'landmark',
    x: 720,
    y: 580,
    z: 2,
    name: 'Star Golf',
    radius: 40,
    params: { interact: 'golf', kind: 'golf', color: '#86efac' },
  },
  {
    id: 'gate_town_exit',
    type: 'landmark',
    x: 880,
    y: 400,
    z: 1,
    name: 'East Gate',
    radius: 36,
    params: {
      kind: 'gate',
      gate: 'exit',
      to: 'park1',
      sibling: 'gate_park_enter',
      spawn_x: '1080',
      spawn_y: '400',
      color: '#facc15',
    },
  },
  {
    id: 'whisperwood',
    type: 'forest',
    x: 1950,
    y: 970,
    z: 0,
    name: 'Whisperwood Park',
    radius: 930,
    params: {
      shape: 'poly',
      w: String(PARK_BOUNDS.w),
      h: String(PARK_BOUNDS.h),
      map_id: 'park1',
      pts: parkPtsParam(),
    },
  },
  {
    id: 'gate_park_enter',
    type: 'landmark',
    x: 1040,
    y: 400,
    z: 1,
    name: 'Town Gate',
    radius: 36,
    params: {
      kind: 'gate',
      gate: 'entrance',
      to: 'town1',
      sibling: 'gate_town_exit',
      spawn_x: '800',
      spawn_y: '400',
      color: '#facc15',
      hidden: '1',
    },
  },
  {
    id: 'forest_rabbit_1',
    type: 'monster',
    x: 1400,
    y: 280,
    z: 1,
    name: 'Fluff Rabbit',
    radius: 30,
    params: { entity_id: 'MON_003' },
  },
  {
    id: 'forest_rabbit_2',
    type: 'monster',
    x: 2400,
    y: 1500,
    z: 1,
    name: 'Fluff Rabbit',
    radius: 30,
    params: { entity_id: 'MON_003' },
  },
  {
    id: 'forest_bunny_3',
    type: 'monster',
    x: 1950,
    y: 900,
    z: 1,
    name: 'Fluff Rabbit',
    radius: 30,
    params: { entity_id: 'MON_003' },
  },
  {
    id: 'forest_sloth_1',
    type: 'monster',
    x: 2600,
    y: 700,
    z: 1,
    name: 'Sleepy Sloth',
    radius: 34,
    params: { entity_id: 'MON_004' },
  },
]

export const PLACEABLE_TYPES: { type: WorldObjectType; label: string; color: string }[] = [
  { type: 'monster', label: 'Monster', color: '#ef4444' },
  { type: 'boss', label: 'Boss', color: '#9333ea' },
  { type: 'spawner', label: 'Spawner', color: '#64748b' },
  { type: 'town', label: 'Town', color: '#22c55e' },
  { type: 'safezone', label: 'Safe Zone', color: '#3b82f6' },
  { type: 'npc', label: 'NPC', color: '#f59e0b' },
  { type: 'market', label: 'Shop', color: '#10b981' },
  { type: 'hotel', label: 'Hotel', color: '#60a5fa' },
  { type: 'landmark', label: 'Landmark', color: '#a78bfa' },
  { type: 'forest', label: 'Forest', color: '#166534' },
]

export function drawCuteCritter(
  ctx: CanvasRenderingContext2D,
  face: string,
  color: string,
  r: number,
) {
  ctx.fillStyle = color
  if (face === 'bunny') {
    ctx.beginPath()
    ctx.ellipse(0, 2, r * 0.85, r * 0.75, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(-r * 0.45, -r * 0.85, r * 0.22, r * 0.55, -0.25, 0, Math.PI * 2)
    ctx.ellipse(r * 0.45, -r * 0.85, r * 0.22, r * 0.55, 0.25, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fda4af'
    ctx.beginPath()
    ctx.ellipse(-r * 0.45, -r * 0.75, r * 0.1, r * 0.28, -0.25, 0, Math.PI * 2)
    ctx.ellipse(r * 0.45, -r * 0.75, r * 0.1, r * 0.28, 0.25, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#1e1b4b'
    ctx.beginPath()
    ctx.arc(-r * 0.28, -r * 0.05, r * 0.1, 0, Math.PI * 2)
    ctx.arc(r * 0.28, -r * 0.05, r * 0.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fb7185'
    ctx.beginPath()
    ctx.arc(0, r * 0.15, r * 0.12, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  if (face === 'sloth') {
    ctx.beginPath()
    ctx.ellipse(0, 0, r * 0.95, r * 0.8, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#78716c'
    ctx.beginPath()
    ctx.ellipse(-r * 0.55, -r * 0.15, r * 0.28, r * 0.22, 0, 0, Math.PI * 2)
    ctx.ellipse(r * 0.55, -r * 0.15, r * 0.28, r * 0.22, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#1c1917'
    ctx.beginPath()
    ctx.arc(-r * 0.28, -r * 0.08, r * 0.12, 0, Math.PI * 2)
    ctx.arc(r * 0.28, -r * 0.08, r * 0.12, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#1c1917'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, r * 0.2, r * 0.22, 0.15 * Math.PI, 0.85 * Math.PI)
    ctx.stroke()
    return
  }
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2)
  ctx.fill()
}

/** Darken a hex color by a fraction (0-1) toward black, for facade shading. */
function shade(hex: string, amt: number): string {
  const c = hex.replace('#', '')
  if (c.length !== 6) return hex
  const r = Math.max(0, Math.min(255, parseInt(c.slice(0, 2), 16) * (1 - amt)))
  const g = Math.max(0, Math.min(255, parseInt(c.slice(2, 4), 16) * (1 - amt)))
  const b = Math.max(0, Math.min(255, parseInt(c.slice(4, 6), 16) * (1 - amt)))
  return `rgb(${r | 0}, ${g | 0}, ${b | 0})`
}

const OUTLINE = 'rgba(26, 20, 16, 0.55)'

/** Ground contact shadow so buildings/props feel planted, not floating. */
function buildingShadow(ctx: CanvasRenderingContext2D, s: number, dy: number) {
  ctx.save()
  const grad = ctx.createRadialGradient(0, dy, 0, 0, dy, s * 0.95)
  grad.addColorStop(0, 'rgba(10, 8, 6, 0.38)')
  grad.addColorStop(1, 'rgba(10, 8, 6, 0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.ellipse(0, dy, s * 0.85, s * 0.32, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Filled building facades — house is larger so it reads as home. */
export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  type: string,
  color: string,
  size: number,
  kind?: string,
) {
  const s = size
  ctx.lineJoin = 'round'

  if (kind === 'house' || type === 'house') {
    const hs = s * 1.4
    buildingShadow(ctx, hs, hs * 0.85)
    ctx.fillStyle = shade(color, 0.15)
    ctx.strokeStyle = OUTLINE
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(-hs * 0.55, -hs * 0.15, hs * 1.1, hs * 0.95, 3)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#fbe4a8'
    ctx.beginPath()
    ctx.moveTo(-hs * 0.72, -hs * 0.1)
    ctx.lineTo(0, -hs * 1.1)
    ctx.lineTo(hs * 0.72, -hs * 0.1)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.beginPath()
    ctx.moveTo(-hs * 0.72, -hs * 0.1)
    ctx.lineTo(0, -hs * 1.1)
    ctx.lineTo(-hs * 0.1, -hs * 1.02)
    ctx.lineTo(-hs * 0.58, -hs * 0.14)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#8a4a1e'
    ctx.fillRect(-hs * 0.12, hs * 0.25, hs * 0.24, hs * 0.55)
    ctx.strokeStyle = OUTLINE
    ctx.lineWidth = 1
    ctx.strokeRect(-hs * 0.12, hs * 0.25, hs * 0.24, hs * 0.55)
    ctx.fillStyle = '#a7e3fb'
    ctx.fillRect(-hs * 0.4, hs * 0.05, hs * 0.2, hs * 0.22)
    ctx.fillRect(hs * 0.2, hs * 0.05, hs * 0.2, hs * 0.22)
    ctx.strokeRect(-hs * 0.4, hs * 0.05, hs * 0.2, hs * 0.22)
    ctx.strokeRect(hs * 0.2, hs * 0.05, hs * 0.2, hs * 0.22)
    ctx.fillStyle = '#57534e'
    ctx.fillRect(hs * 0.32, -hs * 0.9, hs * 0.14, hs * 0.45)
    return
  }

  if (kind === 'gate') {
    buildingShadow(ctx, s, s * 0.55)
    ctx.fillStyle = shade(color || '#facc15', 0.1)
    ctx.strokeStyle = OUTLINE
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(-s * 0.55, -s * 0.7, s * 1.1, s * 1.35, 4)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#6b3a13'
    ctx.fillRect(-s * 0.08, -s * 0.55, s * 0.16, s * 1.1)
    ctx.fillStyle = '#fef08a'
    ctx.beginPath()
    ctx.arc(s * 0.22, s * 0.05, 3.5, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  if (type === 'market' || type === 'shop') {
    buildingShadow(ctx, s, s * 0.7)
    ctx.fillStyle = shade(color, 0.12)
    ctx.strokeStyle = OUTLINE
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(-s * 0.55, -s * 0.2, s * 1.1, s * 0.85, 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#fbe4a8'
    ctx.beginPath()
    ctx.moveTo(-s * 0.7, -s * 0.15)
    ctx.lineTo(0, -s * 0.85)
    ctx.lineTo(s * 0.7, -s * 0.15)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#0f766e'
    ctx.fillRect(-s * 0.15, s * 0.15, s * 0.3, s * 0.5)
    ctx.strokeStyle = OUTLINE
    ctx.lineWidth = 1
    ctx.strokeRect(-s * 0.15, s * 0.15, s * 0.3, s * 0.5)
    return
  }
  if (type === 'hotel') {
    buildingShadow(ctx, s, s * 0.85)
    ctx.fillStyle = shade(color, 0.12)
    ctx.strokeStyle = OUTLINE
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(-s * 0.6, -s * 0.35, s * 1.2, s, 3)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#cfe6fb'
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(-s * 0.4 + i * s * 0.35, -s * 0.15, s * 0.2, s * 0.22)
      ctx.fillRect(-s * 0.4 + i * s * 0.35, s * 0.2, s * 0.2, s * 0.22)
    }
    ctx.fillStyle = '#1e3a8a'
    ctx.beginPath()
    ctx.moveTo(-s * 0.75, -s * 0.3)
    ctx.lineTo(0, -s * 0.95)
    ctx.lineTo(s * 0.75, -s * 0.3)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    return
  }
  if (type === 'landmark' && kind === 'heal') {
    buildingShadow(ctx, s, s * 0.35)
    ctx.fillStyle = color
    ctx.strokeStyle = OUTLINE
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(0, s * 0.1, s * 0.75, s * 0.4, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.beginPath()
    ctx.ellipse(-s * 0.15, 0, s * 0.25, s * 0.15, 0, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  if (type === 'landmark') {
    buildingShadow(ctx, s, s * 0.55)
    ctx.fillStyle = color
    ctx.strokeStyle = OUTLINE
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.beginPath()
    ctx.arc(-s * 0.15, -s * 0.15, s * 0.25, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  buildingShadow(ctx, s, s * 0.3)
  ctx.fillStyle = color
  ctx.strokeStyle = OUTLINE
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}

export function drawGolfGreen(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = '#4ade80'
  ctx.beginPath()
  ctx.ellipse(0, 8, size * 1.1, size * 0.7, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#166534'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(-2, -size * 0.9, 4, size * 0.95)
  ctx.fillStyle = '#f43f5e'
  ctx.beginPath()
  ctx.moveTo(2, -size * 0.9)
  ctx.lineTo(size * 0.55, -size * 0.7)
  ctx.lineTo(2, -size * 0.5)
  ctx.closePath()
  ctx.fill()
}

export function drawForestDecor(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  width: number,
  height: number,
) {
  const trees: [number, number][] = []
  const outline = PARK_OUTLINE_PTS
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]
    const b = outline[(i + 1) % outline.length]
    const steps = 2
    for (let s = 0; s < steps; s++) {
      const t = (s + 0.35 + (i % 3) * 0.08) / steps
      const inset = 28 + (i % 2 === 0 ? 18 : -8) + (s % 2) * 12
      const mx = a.x + (b.x - a.x) * t
      const my = a.y + (b.y - a.y) * t
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = Math.hypot(dx, dy) || 1
      const nx = -dy / len
      const ny = dx / len
      trees.push([Math.round(mx + nx * inset), Math.round(my + ny * inset)])
    }
  }
  const clusters: [number, number][] = [
    [1500, 500], [1680, 720], [1850, 480], [2100, 620],
    [2300, 900], [2500, 1100], [2200, 1300], [1900, 1450],
    [1600, 1200], [1450, 900], [1750, 1050], [2050, 1100],
    [2400, 500], [2650, 850], [2550, 1400], [2000, 1600],
    [1300, 600], [1350, 1400], [1700, 1600], [2150, 1700],
  ]
  for (const c of clusters) trees.push(c)

  const pathClearY0 = 360
  const pathClearY1 = 440
  const pathClearX1 = 1180
  for (const [tx, ty] of trees) {
    if (tx < pathClearX1 && ty >= pathClearY0 && ty <= pathClearY1) continue
    if (tx < 1050) continue
    if (tx < camX - 50 || tx > camX + width + 50 || ty < camY - 60 || ty > camY + height + 50) continue
    ctx.save()
    ctx.translate(tx, ty)
    const grad = ctx.createRadialGradient(0, 4, 0, 0, 4, 22)
    grad.addColorStop(0, 'rgba(8, 6, 5, 0.35)')
    grad.addColorStop(1, 'rgba(8, 6, 5, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.ellipse(0, 4, 20, 7, 0, 0, Math.PI * 2)
    ctx.fill()
    if (!drawSprite(ctx, 'tree', 56, 6)) {
      ctx.fillStyle = '#3f2a14'
      ctx.fillRect(-4, 0, 8, 18)
      ctx.fillStyle = '#15803d'
      ctx.beginPath()
      ctx.arc(0, -8, 16, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#22c55e'
      ctx.beginPath()
      ctx.arc(-6, -14, 10, 0, Math.PI * 2)
      ctx.arc(7, -12, 9, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
}

/** Warm curved town floor (poly or soft rect) — not yellow circle branding. */
export function drawStarTownFloor(ctx: CanvasRenderingContext2D, obj: WorldObject) {
  const shape = String(obj.params?.shape || 'circle')
  ctx.save()
  if (shape === 'poly') {
    const pts = parsePolyPts(obj.params?.pts)
    if (pts.length >= 3) {
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.closePath()
      const g = ctx.createRadialGradient(obj.x, obj.y, 40, obj.x, obj.y, 520)
      g.addColorStop(0, 'rgba(232, 199, 138, 0.5)')
      g.addColorStop(0.55, 'rgba(196, 168, 112, 0.42)')
      g.addColorStop(1, 'rgba(120, 148, 96, 0.3)')
      ctx.fillStyle = g
      ctx.fill()
      ctx.strokeStyle = 'rgba(180, 130, 62, 0.6)'
      ctx.lineWidth = 4
      ctx.stroke()
    }
  } else if (shape === 'rect') {
    const { hw, hh } = zoneHalfSize(obj)
    const g = ctx.createLinearGradient(obj.x - hw, obj.y - hh, obj.x + hw, obj.y + hh)
    g.addColorStop(0, 'rgba(232, 199, 138, 0.45)')
    g.addColorStop(0.5, 'rgba(213, 180, 120, 0.36)')
    g.addColorStop(1, 'rgba(120, 148, 96, 0.32)')
    ctx.fillStyle = g
    ctx.beginPath()
    const r = Math.min(36, hw * 0.18, hh * 0.18)
    ctx.moveTo(obj.x - hw + r, obj.y - hh)
    ctx.quadraticCurveTo(obj.x, obj.y - hh - 14, obj.x + hw - r, obj.y - hh)
    ctx.lineTo(obj.x + hw, obj.y - hh + r)
    ctx.quadraticCurveTo(obj.x + hw + 14, obj.y, obj.x + hw, obj.y + hh - r)
    ctx.lineTo(obj.x + hw - r, obj.y + hh)
    ctx.quadraticCurveTo(obj.x, obj.y + hh + 14, obj.x - hw + r, obj.y + hh)
    ctx.lineTo(obj.x - hw, obj.y + hh - r)
    ctx.quadraticCurveTo(obj.x - hw - 14, obj.y, obj.x - hw, obj.y - hh + r)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(180, 130, 62, 0.6)'
    ctx.lineWidth = 4
    ctx.stroke()
  } else {
    ctx.fillStyle = 'rgba(34, 197, 94, 0.1)'
    ctx.beginPath()
    ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export function drawLabelBelow(
  ctx: CanvasRenderingContext2D,
  label: string,
  yOffset: number,
) {
  ctx.save()
  ctx.font = '600 10px Outfit, sans-serif'
  const tw = ctx.measureText(label).width
  ctx.shadowColor = 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = 4
  ctx.shadowOffsetY = 2
  ctx.fillStyle = 'rgba(17,15,20,0.78)'
  ctx.beginPath()
  ctx.roundRect(-tw / 2 - 7, yOffset, tw + 14, 17, 6)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = '#f5efe0'
  ctx.textAlign = 'center'
  ctx.fillText(label, 0, yOffset + 12.5)
  ctx.restore()
}

export function ensureStarTownObjects(objects: WorldObject[]): WorldObject[] {
  const byId = new Map(STAR_TOWN_FALLBACK.map((o) => [o.id, o]))
  const knownIds = new Set(byId.keys())
  const hasCore =
    objects.some((o) => o.id === 'town_start' || o.name === 'Star Town') &&
    objects.some((o) => o.id === 'star_inn' || o.type === 'hotel') &&
    objects.some((o) => o.id === 'gate_town_exit') &&
    objects.some((o) => o.id === 'player_home')

  if (hasCore) {
    const extras = objects.filter((o) => !knownIds.has(o.id) && o.id !== 'spawn_slime_1')
    return [...STAR_TOWN_FALLBACK, ...extras]
  }

  const keep = objects.filter((o) => !knownIds.has(o.id) && o.id !== 'spawn_slime_1')
  return [...STAR_TOWN_FALLBACK, ...keep]
}

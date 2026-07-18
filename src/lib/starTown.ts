import type { WorldObject, WorldObjectType } from '@/store/gameStore'

export const STAR_TOWN_SPAWN = { x: 400, y: 300 }

export type InteractKind = 'talk' | 'shop' | 'rest' | 'heal' | 'golf'

export function parseNum(v: unknown, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function zoneHalfSize(obj: WorldObject): { hw: number; hh: number } {
  const shape = String(obj.params?.shape || 'circle')
  if (shape === 'rect') {
    return {
      hw: parseNum(obj.params?.w, obj.radius * 2) / 2,
      hh: parseNum(obj.params?.h, obj.radius * 2) / 2,
    }
  }
  return { hw: obj.radius, hh: obj.radius }
}

export function pointInZone(px: number, py: number, obj: WorldObject): boolean {
  const shape = String(obj.params?.shape || 'circle')
  if (shape === 'rect') {
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

export function interactKindOf(obj: WorldObject): InteractKind | null {
  const raw = String(obj.params?.interact || '')
  if (raw === 'talk' || raw === 'shop' || raw === 'rest' || raw === 'heal' || raw === 'golf') {
    return raw
  }
  if (obj.type === 'npc') return 'talk'
  if (obj.type === 'market') return 'shop'
  if (obj.type === 'hotel') return 'rest'
  if (obj.type === 'landmark' && String(obj.params?.kind || '') === 'heal') return 'heal'
  if (obj.type === 'landmark' && String(obj.params?.kind || '') === 'golf') return 'golf'
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
            'Welcome to Star Town! Shops, inns, and healing are safe here. Cute critters live in the forest outside the walls.',
        ),
      }
  }
}

/** Client fallback if Pi map has not been reseeded yet. */
export const STAR_TOWN_FALLBACK: WorldObject[] = [
  {
    id: 'town_start',
    type: 'town',
    x: 400,
    y: 300,
    name: 'Star Town',
    radius: 180,
    params: { shape: 'rect', w: '360', h: '320', safe: '1' },
  },
  {
    id: 'npc_stella',
    type: 'npc',
    x: 400,
    y: 270,
    name: 'Stella',
    radius: 28,
    params: {
      interact: 'talk',
      entity_id: 'NPC_STELLA',
      line: 'Hi! This is Star Town — our first city. Rest at Softcloud Inn, shop at Star Mart, heal at the spring. The forest past the east gate has fluffy friends!',
      color: '#fbbf24',
      face: 'star',
    },
  },
  {
    id: 'star_mart',
    type: 'market',
    x: 300,
    y: 230,
    name: 'Star Mart',
    radius: 36,
    params: { interact: 'shop', price: '25', item_id: 'EQ_004', color: '#34d399' },
  },
  {
    id: 'star_inn',
    type: 'hotel',
    x: 500,
    y: 230,
    name: 'Softcloud Inn',
    radius: 36,
    params: { interact: 'rest', price: '10', color: '#60a5fa' },
  },
  {
    id: 'star_heal',
    type: 'landmark',
    x: 300,
    y: 370,
    name: 'Star Spring',
    radius: 34,
    params: { interact: 'heal', kind: 'heal', color: '#2dd4bf' },
  },
  {
    id: 'star_golf',
    type: 'landmark',
    x: 510,
    y: 380,
    name: 'Star Golf',
    radius: 40,
    params: { interact: 'golf', kind: 'golf', color: '#86efac' },
  },
  {
    id: 'forest_rabbit_1',
    type: 'monster',
    x: 700,
    y: 260,
    name: 'Fluff Rabbit',
    radius: 30,
    params: { entity_id: 'MON_003' },
  },
  {
    id: 'forest_rabbit_2',
    type: 'monster',
    x: 760,
    y: 380,
    name: 'Fluff Rabbit',
    radius: 30,
    params: { entity_id: 'MON_003' },
  },
  {
    id: 'forest_sloth_1',
    type: 'monster',
    x: 820,
    y: 300,
    name: 'Sleepy Sloth',
    radius: 34,
    params: { entity_id: 'MON_004' },
  },
  {
    id: 'forest_bunny_3',
    type: 'monster',
    x: 680,
    y: 340,
    name: 'Fluff Rabbit',
    radius: 30,
    params: { entity_id: 'MON_003' },
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

export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  type: string,
  color: string,
  size: number,
) {
  const s = size
  ctx.fillStyle = color
  if (type === 'market' || type === 'shop') {
    ctx.fillRect(-s * 0.55, -s * 0.2, s * 1.1, s * 0.85)
    ctx.fillStyle = '#fef3c7'
    ctx.beginPath()
    ctx.moveTo(-s * 0.7, -s * 0.15)
    ctx.lineTo(0, -s * 0.85)
    ctx.lineTo(s * 0.7, -s * 0.15)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#0f766e'
    ctx.fillRect(-s * 0.15, s * 0.15, s * 0.3, s * 0.5)
    return
  }
  if (type === 'hotel') {
    ctx.fillRect(-s * 0.6, -s * 0.35, s * 1.2, s)
    ctx.fillStyle = '#bfdbfe'
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
    return
  }
  if (type === 'landmark') {
    ctx.beginPath()
    ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.beginPath()
    ctx.arc(-s * 0.15, -s * 0.15, s * 0.25, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  ctx.beginPath()
  ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2)
  ctx.fill()
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
  const trees = [
    [640, 200], [690, 420], [780, 180], [850, 360], [740, 300],
    [900, 240], [650, 480], [820, 460], [920, 400], [600, 320],
  ]
  for (const [tx, ty] of trees) {
    if (tx < camX - 40 || tx > camX + width + 40 || ty < camY - 40 || ty > camY + height + 40) continue
    ctx.fillStyle = '#3f2a14'
    ctx.fillRect(tx - 4, ty, 8, 18)
    ctx.fillStyle = '#15803d'
    ctx.beginPath()
    ctx.arc(tx, ty - 8, 16, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#22c55e'
    ctx.beginPath()
    ctx.arc(tx - 6, ty - 14, 10, 0, Math.PI * 2)
    ctx.arc(tx + 7, ty - 12, 9, 0, Math.PI * 2)
    ctx.fill()
  }
}

export function drawStarTownFloor(ctx: CanvasRenderingContext2D, obj: WorldObject) {
  const { hw, hh } = zoneHalfSize(obj)
  const shape = String(obj.params?.shape || 'circle')
  ctx.save()
  if (shape === 'rect') {
    const g = ctx.createLinearGradient(obj.x - hw, obj.y - hh, obj.x + hw, obj.y + hh)
    g.addColorStop(0, 'rgba(254, 243, 199, 0.22)')
    g.addColorStop(0.5, 'rgba(253, 230, 138, 0.16)')
    g.addColorStop(1, 'rgba(167, 243, 208, 0.2)')
    ctx.fillStyle = g
    ctx.fillRect(obj.x - hw, obj.y - hh, hw * 2, hh * 2)
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)'
    ctx.lineWidth = 3
    ctx.strokeRect(obj.x - hw, obj.y - hh, hw * 2, hh * 2)
    ctx.fillStyle = 'rgba(251, 191, 36, 0.12)'
    for (let gx = obj.x - hw + 20; gx < obj.x + hw; gx += 40) {
      for (let gy = obj.y - hh + 20; gy < obj.y + hh; gy += 40) {
        ctx.beginPath()
        ctx.arc(gx, gy, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  } else {
    ctx.fillStyle = 'rgba(34, 197, 94, 0.1)'
    ctx.beginPath()
    ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#22c55e66'
    ctx.setLineDash([10, 10])
    ctx.beginPath()
    ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }
  ctx.restore()
}

export function ensureStarTownObjects(objects: WorldObject[]): WorldObject[] {
  const hasStar = objects.some((o) => o.id === 'town_start' || o.name === 'Star Town')
  const hasInn = objects.some((o) => o.id === 'star_inn' || o.type === 'hotel')
  if (hasStar && hasInn) {
    return objects.map((o) =>
      o.id === 'town_start' || o.name === 'Starter Town'
        ? { ...o, name: 'Star Town', params: { ...o.params, shape: o.params?.shape || 'rect', w: o.params?.w || '360', h: o.params?.h || '320' } }
        : o,
    )
  }
  const keep = objects.filter((o) => {
    if (o.id === 'town_start' || o.id === 'spawn_slime_1') return false
    if (STAR_TOWN_FALLBACK.some((f) => f.id === o.id)) return false
    return true
  })
  return [...STAR_TOWN_FALLBACK, ...keep]
}

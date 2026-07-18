import { drawSprite } from '@/lib/sprites'

export const CELL_SIZE = 40

export type TileKind = 'empty' | 'path' | 'grass' | 'cobble' | 'wall' | 'water' | 'gate' | 'tree'

const CHAR_TO_KIND: Record<string, TileKind> = {
  '.': 'empty',
  p: 'path',
  g: 'grass',
  c: 'cobble',
  w: 'wall',
  '~': 'water',
  G: 'gate',
  t: 'tree',
}

export type TileMapDef = {
  id: string
  originX: number
  originY: number
  width: number
  height: number
  cellSize: number
  /** Row-major string, length = width * height */
  cells: string
}

function row(s: string): string {
  return s.replace(/\s/g, '')
}

/** Town 1 — curved cobble hub (soft oval rim of wall tiles). */
export const TOWN1_TILES: TileMapDef = {
  id: 'town1',
  originX: 150,
  originY: 110,
  width: 12,
  height: 10,
  cellSize: CELL_SIZE,
  cells: [
    row('..wwwwwwww..'),
    row('.wccccccccw.'),
    row('wccccccccccw'),
    row('wcccpppccccw'),
    row('wcccpppcccGw'),
    row('wcccpppccccw'),
    row('wccccccccccw'),
    row('wccccccccccw'),
    row('.wccccccccw.'),
    row('..wwwwwwww..'),
  ].join(''),
}

/** Park 1 — trail park east of town. */
export const PARK1_TILES: TileMapDef = {
  id: 'park1',
  originX: 580,
  originY: 140,
  width: 14,
  height: 12,
  cellSize: CELL_SIZE,
  cells: [
    row('ttggggggggggtt'),
    row('tgggppppgggggt'),
    row('gggppggppggggg'),
    row('ggppggggppgggg'),
    row('Gpppgggggppggg'),
    row('ggppggggggppgg'),
    row('gggppgtgggppgg'),
    row('ggggppppppgggg'),
    row('gggggptggggggg'),
    row('tgggggg~gggggt'),
    row('ttgggg~~~gggtt'),
    row('ttggggggggggtt'),
  ].join(''),
}

export const ALL_TILE_MAPS: TileMapDef[] = [TOWN1_TILES, PARK1_TILES]

export function tileKindAt(map: TileMapDef, col: number, rowIdx: number): TileKind {
  if (col < 0 || rowIdx < 0 || col >= map.width || rowIdx >= map.height) return 'empty'
  const ch = map.cells[rowIdx * map.width + col] || '.'
  return CHAR_TO_KIND[ch] || 'empty'
}

export function worldToCell(
  map: TileMapDef,
  wx: number,
  wy: number,
): { col: number; row: number } | null {
  const col = Math.floor((wx - map.originX) / map.cellSize)
  const rowIdx = Math.floor((wy - map.originY) / map.cellSize)
  if (col < 0 || rowIdx < 0 || col >= map.width || rowIdx >= map.height) return null
  return { col, row: rowIdx }
}

export function encodeTiles(map: TileMapDef): string {
  return `${map.width}x${map.height}@${map.originX},${map.originY};${map.cells}`
}

export function drawTileCell(
  ctx: CanvasRenderingContext2D,
  kind: TileKind,
  x: number,
  y: number,
  size: number,
) {
  if (kind === 'empty') return
  const pad = 1
  ctx.save()
  switch (kind) {
    case 'cobble': {
      ctx.fillStyle = '#a9a0a6'
      ctx.fillRect(x + pad, y + pad, size - pad * 2, size - pad * 2)
      ctx.strokeStyle = 'rgba(184, 168, 136, 0.5)'
      ctx.lineWidth = 1
      ctx.strokeRect(x + pad, y + pad, size - pad * 2, size - pad * 2)
      ctx.fillStyle = 'rgba(70, 62, 58, 0.3)'
      ctx.beginPath()
      ctx.arc(x + size * 0.32, y + size * 0.38, 2.4, 0, Math.PI * 2)
      ctx.arc(x + size * 0.68, y + size * 0.62, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)'
      ctx.beginPath()
      ctx.arc(x + size * 0.3, y + size * 0.34, 1.3, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'path': {
      ctx.fillStyle = '#cba36e'
      ctx.beginPath()
      ctx.roundRect(x + 3, y + 5, size - 6, size - 10, 8)
      ctx.fill()
      ctx.strokeStyle = 'rgba(138, 107, 77, 0.45)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      break
    }
    case 'grass': {
      ctx.fillStyle = '#7cb668'
      ctx.fillRect(x + pad, y + pad, size - pad * 2, size - pad * 2)
      ctx.fillStyle = 'rgba(90, 148, 86, 0.5)'
      ctx.fillRect(x + pad, y + size - size * 0.32, size - pad * 2, size * 0.32 - pad)
      ctx.fillStyle = 'rgba(168, 216, 120, 0.35)'
      ctx.beginPath()
      ctx.arc(x + size * 0.3, y + size * 0.28, 2, 0, Math.PI * 2)
      ctx.arc(x + size * 0.65, y + size * 0.45, 1.6, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'wall': {
      ctx.fillStyle = '#9c5a30'
      ctx.fillRect(x + 2, y + 2, size - 4, size - 4)
      ctx.strokeStyle = 'rgba(46, 26, 14, 0.55)'
      ctx.lineWidth = 1.5
      ctx.strokeRect(x + 2, y + 2, size - 4, size - 4)
      ctx.fillStyle = 'rgba(250, 220, 150, 0.55)'
      ctx.fillRect(x + 4, y + size * 0.52, size - 8, size * 0.3)
      break
    }
    case 'water': {
      ctx.fillStyle = 'rgba(74, 159, 216, 0.85)'
      ctx.beginPath()
      ctx.ellipse(x + size * 0.5, y + size * 0.55, size * 0.42, size * 0.32, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(44, 106, 148, 0.6)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.fillStyle = 'rgba(126, 200, 234, 0.7)'
      ctx.beginPath()
      ctx.ellipse(x + size * 0.4, y + size * 0.46, size * 0.14, size * 0.09, 0, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'gate': {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.55)'
      ctx.fillRect(x + 6, y + 4, size - 12, size - 8)
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.6)'
      ctx.lineWidth = 1.5
      ctx.strokeRect(x + 6, y + 4, size - 12, size - 8)
      ctx.fillStyle = 'rgba(120, 53, 15, 0.65)'
      ctx.fillRect(x + size * 0.45, y + 6, 4, size - 12)
      break
    }
    case 'tree': {
      ctx.save()
      ctx.translate(x + size * 0.5, y + size * 0.5)
      if (!drawSprite(ctx, 'tree', size * 1.5, size * 0.28)) {
        ctx.fillStyle = '#3f2a14'
        ctx.fillRect(-3, -size * 0.05, 6, size * 0.4)
        ctx.fillStyle = '#15803d'
        ctx.beginPath()
        ctx.arc(0, -size * 0.12, size * 0.28, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#22c55e'
        ctx.beginPath()
        ctx.arc(-size * 0.15, -size * 0.08, size * 0.16, 0, Math.PI * 2)
        ctx.arc(size * 0.15, -size * 0.1, size * 0.15, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
      break
    }
  }
  ctx.restore()
}

export function drawTileMap(
  ctx: CanvasRenderingContext2D,
  map: TileMapDef,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
) {
  const s = map.cellSize
  const c0 = Math.max(0, Math.floor((camX - map.originX) / s) - 1)
  const r0 = Math.max(0, Math.floor((camY - map.originY) / s) - 1)
  const c1 = Math.min(map.width - 1, Math.ceil((camX + viewW - map.originX) / s) + 1)
  const r1 = Math.min(map.height - 1, Math.ceil((camY + viewH - map.originY) / s) + 1)
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const kind = tileKindAt(map, c, r)
      if (kind === 'empty') continue
      drawTileCell(ctx, kind, map.originX + c * s, map.originY + r * s, s)
    }
  }
}

export function drawAllTileMaps(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
) {
  for (const map of ALL_TILE_MAPS) {
    drawTileMap(ctx, map, camX, camY, viewW, viewH)
  }
}

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
  originX: 160,
  originY: 100,
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
      ctx.fillStyle = 'rgba(253, 230, 138, 0.22)'
      ctx.fillRect(x + pad, y + pad, size - pad * 2, size - pad * 2)
      ctx.fillStyle = 'rgba(251, 191, 36, 0.12)'
      ctx.beginPath()
      ctx.arc(x + size * 0.35, y + size * 0.4, 2.2, 0, Math.PI * 2)
      ctx.arc(x + size * 0.7, y + size * 0.65, 1.8, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'path': {
      ctx.fillStyle = 'rgba(214, 211, 209, 0.28)'
      ctx.beginPath()
      ctx.roundRect(x + 4, y + 6, size - 8, size - 12, 8)
      ctx.fill()
      break
    }
    case 'grass': {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.14)'
      ctx.fillRect(x + pad, y + pad, size - pad * 2, size - pad * 2)
      break
    }
    case 'wall': {
      ctx.fillStyle = 'rgba(180, 83, 9, 0.35)'
      ctx.fillRect(x + 2, y + 2, size - 4, size - 4)
      ctx.fillStyle = 'rgba(251, 191, 36, 0.45)'
      ctx.fillRect(x + 4, y + size * 0.55, size - 8, size * 0.28)
      break
    }
    case 'water': {
      ctx.fillStyle = 'rgba(14, 165, 233, 0.28)'
      ctx.beginPath()
      ctx.ellipse(x + size * 0.5, y + size * 0.55, size * 0.38, size * 0.28, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(125, 211, 252, 0.35)'
      ctx.beginPath()
      ctx.ellipse(x + size * 0.42, y + size * 0.48, size * 0.12, size * 0.08, 0, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'gate': {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.35)'
      ctx.fillRect(x + 6, y + 4, size - 12, size - 8)
      ctx.fillStyle = 'rgba(120, 53, 15, 0.55)'
      ctx.fillRect(x + size * 0.45, y + 6, 4, size - 12)
      break
    }
    case 'tree': {
      ctx.fillStyle = '#3f2a14'
      ctx.fillRect(x + size * 0.45, y + size * 0.45, 6, size * 0.4)
      ctx.fillStyle = '#15803d'
      ctx.beginPath()
      ctx.arc(x + size * 0.5, y + size * 0.38, size * 0.28, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#22c55e'
      ctx.beginPath()
      ctx.arc(x + size * 0.35, y + size * 0.42, size * 0.16, 0, Math.PI * 2)
      ctx.arc(x + size * 0.65, y + size * 0.4, size * 0.15, 0, Math.PI * 2)
      ctx.fill()
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

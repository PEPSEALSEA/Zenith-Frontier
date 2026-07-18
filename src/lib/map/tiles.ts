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
  const ink = 'rgba(226, 232, 240, 0.55)'
  const soft = 'rgba(148, 163, 184, 0.35)'
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = ink
  ctx.lineWidth = 1.6

  switch (kind) {
    case 'cobble': {
      ctx.strokeStyle = soft
      ctx.strokeRect(x + 3, y + 3, size - 6, size - 6)
      ctx.beginPath()
      ctx.moveTo(x + size * 0.35, y + 6)
      ctx.lineTo(x + size * 0.35, y + size - 6)
      ctx.moveTo(x + 6, y + size * 0.55)
      ctx.lineTo(x + size - 6, y + size * 0.55)
      ctx.stroke()
      break
    }
    case 'path': {
      ctx.beginPath()
      ctx.moveTo(x + 4, y + size * 0.5)
      ctx.quadraticCurveTo(x + size * 0.5, y + size * 0.35, x + size - 4, y + size * 0.5)
      ctx.moveTo(x + 6, y + size * 0.62)
      ctx.quadraticCurveTo(x + size * 0.5, y + size * 0.72, x + size - 6, y + size * 0.58)
      ctx.stroke()
      break
    }
    case 'grass': {
      ctx.strokeStyle = 'rgba(134, 239, 172, 0.45)'
      for (let i = 0; i < 3; i++) {
        const gx = x + 8 + i * 10
        ctx.beginPath()
        ctx.moveTo(gx, y + size - 8)
        ctx.quadraticCurveTo(gx + 2, y + size * 0.45, gx - 2, y + 10)
        ctx.stroke()
      }
      break
    }
    case 'wall': {
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)'
      ctx.lineWidth = 2.2
      ctx.beginPath()
      ctx.moveTo(x + 4, y + size - 4)
      ctx.quadraticCurveTo(x + size * 0.5, y + 4, x + size - 4, y + size - 4)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x + size * 0.5, y + size * 0.55, 3, 0, Math.PI * 2)
      ctx.stroke()
      break
    }
    case 'water': {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)'
      ctx.beginPath()
      ctx.moveTo(x + 4, y + size * 0.4)
      ctx.quadraticCurveTo(x + size * 0.35, y + size * 0.55, x + size * 0.7, y + size * 0.4)
      ctx.quadraticCurveTo(x + size * 0.85, y + size * 0.32, x + size - 4, y + size * 0.45)
      ctx.moveTo(x + 6, y + size * 0.65)
      ctx.quadraticCurveTo(x + size * 0.5, y + size * 0.78, x + size - 6, y + size * 0.62)
      ctx.stroke()
      break
    }
    case 'gate': {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.75)'
      ctx.lineWidth = 2
      ctx.strokeRect(x + 8, y + 6, size - 16, size - 10)
      ctx.beginPath()
      ctx.moveTo(x + size * 0.5, y + 6)
      ctx.lineTo(x + size * 0.5, y + size - 4)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x + size * 0.62, y + size * 0.55, 2.5, 0, Math.PI * 2)
      ctx.stroke()
      break
    }
    case 'tree': {
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.55)'
      ctx.beginPath()
      ctx.moveTo(x + size * 0.5, y + size - 6)
      ctx.lineTo(x + size * 0.5, y + size * 0.45)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x + size * 0.5, y + size * 0.35, size * 0.28, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x + size * 0.35, y + size * 0.42, size * 0.18, 0, Math.PI * 2)
      ctx.arc(x + size * 0.65, y + size * 0.4, size * 0.18, 0, Math.PI * 2)
      ctx.stroke()
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

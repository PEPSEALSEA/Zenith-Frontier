import { ALL_TILE_MAPS, encodeTiles, TOWN1_TILES, PARK1_TILES } from './tiles'
import {
  HIT_CHANCE_BASE,
  DODGE_CHANCE_BASE,
  HIT_CHANCE_MIN,
  HIT_CHANCE_MAX,
  DODGE_CHANCE_MIN,
  DODGE_CHANCE_MAX,
} from '@/lib/combat/hitDodge'

export type MapPoi = {
  id: string
  kind: string
  name: string
  x: number
  y: number
  interact?: string
  line?: string
  labelAnchor: 'below'
  drawLayer: number
  noStack: true
}

export type MapGate = {
  id: string
  to: string
  x: number
  y: number
  sibling: string
  spawnX: number
  spawnY: number
}

export type MapRegionManifest = {
  id: string
  name: string
  safe: boolean
  bounds: { x: number; y: number; w: number; h: number }
  spawn?: { x: number; y: number }
  gates: MapGate[]
  pois: MapPoi[]
  tiles: { cellSize: number; width: number; height: number; originX: number; originY: number; cells: string; encoded: string }
  monsters?: { templateId: string; count: number; patrol: string }[]
  combatRules?: {
    hitFormula: string
    dodgeFormula: string
    skillTier: number
  }
  notes: string
}

const combatRules = {
  hitFormula: `clamp(${HIT_CHANCE_BASE} + playerAcc - monsterEva, ${HIT_CHANCE_MIN}, ${HIT_CHANCE_MAX})`,
  dodgeFormula: `clamp(${DODGE_CHANCE_BASE} + playerEva - monsterAcc, ${DODGE_CHANCE_MIN}, ${DODGE_CHANCE_MAX})`,
  skillTier: 1 as const,
}

function tilesBlock(map: (typeof ALL_TILE_MAPS)[0]) {
  return {
    cellSize: map.cellSize,
    width: map.width,
    height: map.height,
    originX: map.originX,
    originY: map.originY,
    cells: map.cells,
    encoded: encodeTiles(map),
  }
}

export const MAP_MANIFEST: { maps: MapRegionManifest[] } = {
  maps: [
    {
      id: 'town1',
      name: 'Star Town',
      safe: true,
      bounds: {
        x: TOWN1_TILES.originX,
        y: TOWN1_TILES.originY,
        w: TOWN1_TILES.width * TOWN1_TILES.cellSize,
        h: TOWN1_TILES.height * TOWN1_TILES.cellSize,
      },
      spawn: { x: 400, y: 300 },
      gates: [
        {
          id: 'gate_town_exit',
          to: 'park1',
          x: 630,
          y: 300,
          sibling: 'gate_park_enter',
          spawnX: 670,
          spawnY: 300,
        },
      ],
      pois: [
        { id: 'player_home', kind: 'house', name: 'Your House', x: 400, y: 175, interact: 'talk', labelAnchor: 'below', drawLayer: 2, noStack: true, line: 'Home sweet home. Safe walls of Town 1.' },
        { id: 'npc_stella', kind: 'npc', name: 'Stella', x: 330, y: 230, interact: 'talk', labelAnchor: 'below', drawLayer: 2, noStack: true },
        { id: 'star_mart', kind: 'market', name: 'Star Mart', x: 230, y: 300, interact: 'shop', labelAnchor: 'below', drawLayer: 2, noStack: true },
        { id: 'star_scrolls', kind: 'market', name: 'Scroll Stall', x: 260, y: 400, interact: 'shop', labelAnchor: 'below', drawLayer: 2, noStack: true },
        { id: 'star_inn', kind: 'hotel', name: 'Softcloud Inn', x: 540, y: 220, interact: 'rest', labelAnchor: 'below', drawLayer: 2, noStack: true },
        { id: 'star_heal', kind: 'landmark', name: 'Star Spring', x: 400, y: 430, interact: 'heal', labelAnchor: 'below', drawLayer: 2, noStack: true },
        { id: 'star_golf', kind: 'landmark', name: 'Star Golf', x: 540, y: 410, interact: 'golf', labelAnchor: 'below', drawLayer: 2, noStack: true },
      ],
      tiles: tilesBlock(TOWN1_TILES),
      notes: 'Safe hub. No combat. Exit east gate to Park 1. Place tiles/POIs from this manifest only — no zone circles.',
    },
    {
      id: 'park1',
      name: 'Whisperwood Park',
      safe: false,
      bounds: {
        x: PARK1_TILES.originX,
        y: PARK1_TILES.originY,
        w: PARK1_TILES.width * PARK1_TILES.cellSize,
        h: PARK1_TILES.height * PARK1_TILES.cellSize,
      },
      gates: [
        {
          id: 'gate_park_enter',
          to: 'town1',
          x: 610,
          y: 300,
          sibling: 'gate_town_exit',
          spawnX: 570,
          spawnY: 300,
        },
      ],
      pois: [],
      tiles: tilesBlock(PARK1_TILES),
      monsters: [
        { templateId: 'MON_003', count: 3, patrol: 'trail' },
        { templateId: 'MON_004', count: 1, patrol: 'trail' },
      ],
      combatRules: { ...combatRules, skillTier: 1 },
      notes: 'First park stage. Tier-1 monster skills only (hop / spit). Enter west gate back to Town 1.',
    },
  ],
}

export function getMapManifest() {
  return MAP_MANIFEST
}

export function getZoneAt(x: number, y: number): MapRegionManifest | null {
  for (const m of MAP_MANIFEST.maps) {
    const b = m.bounds
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return m
  }
  return null
}

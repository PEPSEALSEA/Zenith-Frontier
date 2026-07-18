import { TOWN_BOUNDS, PARK_BOUNDS } from './worldLayout'
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

export const MAP_MANIFEST: { maps: MapRegionManifest[] } = {
  maps: [
    {
      id: 'town1',
      name: 'Star Town',
      safe: true,
      bounds: { ...TOWN_BOUNDS },
      spawn: { x: 500, y: 400 },
      gates: [
        {
          id: 'gate_town_exit',
          to: 'park1',
          x: 880,
          y: 400,
          sibling: 'gate_park_enter',
          spawnX: 1080,
          spawnY: 400,
        },
      ],
      pois: [
        { id: 'player_home', kind: 'house', name: 'Your House', x: 500, y: 180, interact: 'talk', labelAnchor: 'below', drawLayer: 2, noStack: true, line: 'Home sweet home. Safe walls of Town 1.' },
        { id: 'npc_stella', kind: 'npc', name: 'Stella', x: 380, y: 320, interact: 'talk', labelAnchor: 'below', drawLayer: 2, noStack: true },
        { id: 'star_mart', kind: 'market', name: 'Star Mart', x: 220, y: 400, interact: 'shop', labelAnchor: 'below', drawLayer: 2, noStack: true },
        { id: 'star_scrolls', kind: 'market', name: 'Scroll Stall', x: 260, y: 560, interact: 'shop', labelAnchor: 'below', drawLayer: 2, noStack: true },
        { id: 'star_inn', kind: 'hotel', name: 'Softcloud Inn', x: 720, y: 240, interact: 'rest', labelAnchor: 'below', drawLayer: 2, noStack: true },
        { id: 'star_heal', kind: 'landmark', name: 'Star Spring', x: 500, y: 600, interact: 'heal', labelAnchor: 'below', drawLayer: 2, noStack: true },
        { id: 'star_golf', kind: 'landmark', name: 'Star Golf', x: 720, y: 580, interact: 'golf', labelAnchor: 'below', drawLayer: 2, noStack: true },
      ],
      notes: 'Larger seamless hub. Solid walls. East gate to Park 1.',
    },
    {
      id: 'park1',
      name: 'Whisperwood Park',
      safe: false,
      bounds: { ...PARK_BOUNDS },
      gates: [
        {
          id: 'gate_park_enter',
          to: 'town1',
          x: 1040,
          y: 400,
          sibling: 'gate_town_exit',
          spawnX: 800,
          spawnY: 400,
        },
      ],
      pois: [],
      monsters: [
        { templateId: 'MON_001', count: 2, patrol: 'trail' },
        { templateId: 'MON_002', count: 2, patrol: 'trail' },
        { templateId: 'MON_003', count: 3, patrol: 'trail' },
        { templateId: 'MON_004', count: 1, patrol: 'trail' },
        { templateId: 'MON_005', count: 2, patrol: 'trail' },
        { templateId: 'MON_006', count: 2, patrol: 'trail' },
        { templateId: 'MON_007', count: 2, patrol: 'trail' },
        { templateId: 'MON_008', count: 2, patrol: 'trail' },
        { templateId: 'MON_009', count: 1, patrol: 'trail' },
        { templateId: 'MON_010', count: 1, patrol: 'trail' },
        { templateId: 'MON_011', count: 2, patrol: 'trail' },
        { templateId: 'MON_012', count: 2, patrol: 'trail' },
      ],
      combatRules: { ...combatRules, skillTier: 1 },
      notes: 'Larger park east of town — no overlap.',
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

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
      spawn: { x: 370, y: 300 },
      gates: [
        {
          id: 'gate_town_exit',
          to: 'park1',
          x: 580,
          y: 300,
          sibling: 'gate_park_enter',
          spawnX: 780,
          spawnY: 300,
        },
      ],
      pois: [
        { id: 'player_home', kind: 'house', name: 'Your House', x: 370, y: 175, interact: 'talk', labelAnchor: 'below', drawLayer: 2, noStack: true, line: 'Home sweet home. Safe walls of Town 1.' },
        { id: 'npc_stella', kind: 'npc', name: 'Stella', x: 300, y: 240, interact: 'talk', labelAnchor: 'below', drawLayer: 2, noStack: true },
        { id: 'star_mart', kind: 'market', name: 'Star Mart', x: 220, y: 300, interact: 'shop', labelAnchor: 'below', drawLayer: 2, noStack: true },
        { id: 'star_scrolls', kind: 'market', name: 'Scroll Stall', x: 250, y: 400, interact: 'shop', labelAnchor: 'below', drawLayer: 2, noStack: true },
        { id: 'star_inn', kind: 'hotel', name: 'Softcloud Inn', x: 500, y: 210, interact: 'rest', labelAnchor: 'below', drawLayer: 2, noStack: true },
        { id: 'star_heal', kind: 'landmark', name: 'Star Spring', x: 370, y: 420, interact: 'heal', labelAnchor: 'below', drawLayer: 2, noStack: true },
        { id: 'star_golf', kind: 'landmark', name: 'Star Golf', x: 500, y: 400, interact: 'golf', labelAnchor: 'below', drawLayer: 2, noStack: true },
      ],
      notes: 'Safe hub. Seamless floor + solid walls. Exit east gate to Park 1. No tile grid.',
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
          x: 740,
          y: 300,
          sibling: 'gate_town_exit',
          spawnX: 540,
          spawnY: 300,
        },
      ],
      pois: [],
      monsters: [
        { templateId: 'MON_003', count: 3, patrol: 'trail' },
        { templateId: 'MON_004', count: 1, patrol: 'trail' },
      ],
      combatRules: { ...combatRules, skillTier: 1 },
      notes: 'East of town with a gap — no overlap. Tier-1 monster skills only.',
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

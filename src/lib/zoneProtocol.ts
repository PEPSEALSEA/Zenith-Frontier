export const ZONE_LOOT_RANGE = 280
export const ZONE_MAX_PLAYERS = 8
export const ZONE_CHAT_MAX_LEN = 120
export const ZONE_PRESENCE_HZ = 20
export const ZONE_RESPAWN_MS = 4000
export const ZONE_HIT_RANGE_PAD = 48

export type ZoneAppearance = { color: string; face: string }

export type ZoneStatsSnapshot = {
  atk: number
  def: number
  spd: number
  acc: number
  luk: number
  level: number
}

export type ZoneEntitySeed = {
  id: string
  templateId: string
  name: string
  x: number
  y: number
  hp: number
  maxHp: number
  atk: number
  def: number
  spd: number
  drops: string[]
  color: string
  face: string
  bossId?: string
  scenarioKey?: string
  kind: 'monster' | 'boss'
}

export type ZonePlayerPublic = {
  playerId: string
  name: string
  appearance: ZoneAppearance
  jobMain: string
  x: number
  y: number
  facing: number
  level: number
}

export type ZoneEntityPublic = {
  id: string
  hp: number
  maxHp: number
  x: number
  y: number
  deadUntil: number
  name: string
  color: string
  face: string
  kind: 'monster' | 'boss'
  bossId?: string
}

export type ClientToZone =
  | {
      type: 'join'
      playerId: string
      name: string
      appearance: ZoneAppearance
      jobMain: string
      statsSnapshot: ZoneStatsSnapshot
      x: number
      y: number
      facing: number
      entities?: ZoneEntitySeed[]
    }
  | { type: 'presence'; x: number; y: number; facing: number }
  | { type: 'chat'; text: string }
  | {
      type: 'attack'
      entityId: string
      attackType: 'light' | 'hard' | 'skill'
      skillId?: string
      power?: number
      range?: number
      x?: number
      y?: number
    }
  | { type: 'ping'; t: number }

export type ZoneToClient =
  | { type: 'welcome'; mapId: string; you: string }
  | { type: 'roster'; players: ZonePlayerPublic[] }
  | { type: 'presence_batch'; players: Pick<ZonePlayerPublic, 'playerId' | 'x' | 'y' | 'facing'>[] }
  | { type: 'chat'; playerId: string; name: string; text: string; at: number }
  | { type: 'entity_snapshot'; entities: ZoneEntityPublic[] }
  | { type: 'entity_delta'; entities: Partial<ZoneEntityPublic> & { id: string }[] }
  | {
      type: 'loot_grant'
      grantId: string
      exp: number
      money: number
      items: string[]
    }
  | {
      type: 'world_event'
      kind: 'boss_killed'
      bossId: string
      killerPlayerId: string
      participantIds: string[]
      loreText?: string
    }
  | { type: 'error'; message: string }
  | { type: 'pong'; t: number }

export function parseZoneMessage(raw: string): ClientToZone | ZoneToClient | null {
  try {
    const msg = JSON.parse(raw) as { type?: string }
    if (!msg || typeof msg.type !== 'string') return null
    return msg as ClientToZone | ZoneToClient
  } catch {
    return null
  }
}

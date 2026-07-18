export type AllocStat = 'str' | 'dex' | 'int' | 'vit' | 'luk'

export type AttackProfile = {
  style: string
  light_mult: number
  hard_mult: number
  light_range: number
  hard_range: number
  light_cd: number
  hard_cd: number
  hits: number
  mp_cost_light: number
  mp_cost_hard: number
}

export type SkillDef = {
  skill_id: string
  skill_name: string
  job_id: string
  tier: number
  parent_skill_id: string
  description: string
  unlock_type: 'starter' | 'mastery' | 'gold' | 'scroll' | 'level'
  unlock_value: string
  skill_type: 'damage' | 'heal' | 'buff' | 'dash'
  mp_cost: number
  cooldown_ms: number
  power: number
  range: number
  effect: string
}

export type Potential = Record<AllocStat, number>

export type AllocatedStats = Record<AllocStat, number>

export const ALLOC_STATS: AllocStat[] = ['str', 'dex', 'int', 'vit', 'luk']

export const STAT_POINTS_PER_LEVEL = 3

export const MASTERY_EXP_PER_LEVEL = 100

export const DEFAULT_ATTACK: AttackProfile = {
  style: 'melee',
  light_mult: 1,
  hard_mult: 1.6,
  light_range: 70,
  hard_range: 95,
  light_cd: 280,
  hard_cd: 550,
  hits: 1,
  mp_cost_light: 0,
  mp_cost_hard: 0,
}

export function parsePotential(raw?: string): Potential {
  const out: Potential = { str: 50, dex: 50, int: 50, vit: 50, luk: 50 }
  if (!raw) return out
  for (const part of raw.split(',')) {
    const m = part.trim().match(/^(str|dex|int|vit|luk):(\d+)$/i)
    if (!m) continue
    out[m[1].toLowerCase() as AllocStat] = parseInt(m[2], 10)
  }
  return out
}

export function parseUnlockCondition(raw?: string): { level: number; mastery: number; extra: string[] } {
  let level = 20
  let mastery = 5
  const extra: string[] = []
  if (!raw) return { level, mastery, extra }
  for (const part of raw.split(',')) {
    const [k, v] = part.split(':').map((s) => s.trim())
    if (!k) continue
    if (k === 'level') level = parseInt(v, 10) || 20
    else if (k === 'mastery') mastery = parseInt(v, 10) || 5
    else extra.push(part.trim())
  }
  return { level, mastery, extra }
}

export function parseAttackProfile(raw?: string): AttackProfile {
  if (!raw) return { ...DEFAULT_ATTACK }
  try {
    if (raw.trim().startsWith('{')) {
      return { ...DEFAULT_ATTACK, ...JSON.parse(raw) }
    }
  } catch { /* fall through */ }
  const parts: Record<string, string> = {}
  for (const part of raw.split(',')) {
    const idx = part.indexOf('=')
    if (idx > 0) parts[part.slice(0, idx).trim()] = part.slice(idx + 1).trim()
  }
  return {
    style: parts.style || DEFAULT_ATTACK.style,
    light_mult: Number(parts.light_mult) || DEFAULT_ATTACK.light_mult,
    hard_mult: Number(parts.hard_mult) || DEFAULT_ATTACK.hard_mult,
    light_range: Number(parts.light_range) || DEFAULT_ATTACK.light_range,
    hard_range: Number(parts.hard_range) || DEFAULT_ATTACK.hard_range,
    light_cd: Number(parts.light_cd) || DEFAULT_ATTACK.light_cd,
    hard_cd: Number(parts.hard_cd) || DEFAULT_ATTACK.hard_cd,
    hits: Number(parts.hits) || DEFAULT_ATTACK.hits,
    mp_cost_light: Number(parts.mp_cost_light) || 0,
    mp_cost_hard: Number(parts.mp_cost_hard) || 0,
  }
}

export function combatFromAlloc(alloc: AllocatedStats, jobBonus?: string) {
  const base = {
    atk: 8 + alloc.str * 2,
    def: 5 + Math.floor(alloc.vit * 1.2),
    spd: 8 + alloc.dex * 2,
    luck: 5 + alloc.luk,
    maxHp: 80 + alloc.vit * 8,
    maxMp: 40 + alloc.int * 6,
    acc: alloc.dex * 0.015,
    eva: alloc.dex * 0.01 + (8 + alloc.dex * 2) * 0.002,
  }
  if (jobBonus) {
    for (const part of jobBonus.split(',')) {
      const m = part.trim().match(/^(atk|def|spd|hp|mp|luck)([+-]\d+)$/i)
      if (!m) continue
      const key = m[1].toLowerCase()
      const delta = parseInt(m[2], 10)
      if (key === 'atk') base.atk += delta
      else if (key === 'def') base.def += delta
      else if (key === 'spd') base.spd += delta
      else if (key === 'luck') base.luck += delta
      else if (key === 'hp') base.maxHp += delta
      else if (key === 'mp') base.maxMp += delta
    }
  }
  base.eva = alloc.dex * 0.01 + base.spd * 0.002
  return base
}

export function masteryExpToNext(level: number): number {
  return MASTERY_EXP_PER_LEVEL + (level - 1) * 25
}

export function parseSkillRow(row: Record<string, string>): SkillDef {
  return {
    skill_id: String(row.skill_id || ''),
    skill_name: String(row.skill_name || row.skill_id || ''),
    job_id: String(row.job_id || ''),
    tier: Number(row.tier) || 1,
    parent_skill_id: String(row.parent_skill_id || ''),
    description: String(row.description || ''),
    unlock_type: (row.unlock_type || 'starter') as SkillDef['unlock_type'],
    unlock_value: String(row.unlock_value || ''),
    skill_type: (row.skill_type || 'damage') as SkillDef['skill_type'],
    mp_cost: Number(row.mp_cost) || 0,
    cooldown_ms: Number(row.cooldown_ms) || 1000,
    power: Number(row.power) || 1,
    range: Number(row.range) || 80,
    effect: String(row.effect || ''),
  }
}

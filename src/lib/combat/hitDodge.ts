/** Hit / dodge formulas for player ↔ monster combat (Park 1+). */

export const HIT_CHANCE_BASE = 0.55
export const HIT_CHANCE_MIN = 0.15
export const HIT_CHANCE_MAX = 0.95
export const DODGE_CHANCE_BASE = 0.05
export const DODGE_CHANCE_MIN = 0.05
export const DODGE_CHANCE_MAX = 0.45

export function clampChance(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function playerAccFromDex(dex: number): number {
  return dex * 0.015
}

export function playerEvaFromDexSpd(dex: number, spd: number): number {
  return dex * 0.01 + spd * 0.002
}

export function monsterAccFromAtkSpd(atk: number, spd: number): number {
  return 0.08 + atk * 0.005 + spd * 0.002
}

export function monsterEvaFromSpd(spd: number): number {
  return spd * 0.01
}

export function hitChance(attackerAcc: number, defenderEva: number): number {
  return clampChance(HIT_CHANCE_BASE + attackerAcc - defenderEva, HIT_CHANCE_MIN, HIT_CHANCE_MAX)
}

export function dodgeChance(defenderEva: number, attackerAcc: number): number {
  return clampChance(DODGE_CHANCE_BASE + defenderEva - attackerAcc, DODGE_CHANCE_MIN, DODGE_CHANCE_MAX)
}

export function rollHit(attackerAcc: number, defenderEva: number): boolean {
  return Math.random() < hitChance(attackerAcc, defenderEva)
}

export function rollDodge(defenderEva: number, attackerAcc: number): boolean {
  return Math.random() < dodgeChance(defenderEva, attackerAcc)
}

/** Park 1 monster skill defs (tier 1). */
export type MonsterSkillDef = {
  id: string
  range: number
  cooldownMs: number
  kind: 'hop' | 'spit'
  power: number
  speed?: number
}

export const MONSTER_SKILLS: Record<string, MonsterSkillDef> = {
  hop: { id: 'hop', range: 120, cooldownMs: 2800, kind: 'hop', power: 0.6 },
  spit: { id: 'spit', range: 160, cooldownMs: 3200, kind: 'spit', power: 0.85, speed: 2.4 },
}

export function resolveMonsterSkillIds(skills: string[]): MonsterSkillDef[] {
  return skills.map((s) => MONSTER_SKILLS[s]).filter(Boolean)
}

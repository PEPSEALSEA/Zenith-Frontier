export type MonsterStatus = {
  stunUntil: number
  dotUntil: number
  dotDps: number
  markUntil: number
  markMul: number
}

export type PlayerStealth = {
  until: number
}

const monsterStatus = new Map<string, MonsterStatus>()

export function getMonsterStatus(id: string): MonsterStatus {
  let s = monsterStatus.get(id)
  if (!s) {
    s = { stunUntil: 0, dotUntil: 0, dotDps: 0, markUntil: 0, markMul: 1.25 }
    monsterStatus.set(id, s)
  }
  return s
}

export function applyStun(id: string, now: number, ms = 1200) {
  const s = getMonsterStatus(id)
  s.stunUntil = Math.max(s.stunUntil, now + ms)
}

export function applyDot(id: string, now: number, dps: number, ms = 4000) {
  const s = getMonsterStatus(id)
  s.dotUntil = Math.max(s.dotUntil, now + ms)
  s.dotDps = Math.max(s.dotDps, dps)
}

export function applyMark(id: string, now: number, ms = 8000, mul = 1.3) {
  const s = getMonsterStatus(id)
  s.markUntil = Math.max(s.markUntil, now + ms)
  s.markMul = mul
}

export function isStunned(id: string, now: number) {
  return getMonsterStatus(id).stunUntil > now
}

export function markMultiplier(id: string, now: number) {
  const s = getMonsterStatus(id)
  return s.markUntil > now ? s.markMul : 1
}

export function tickDots(
  now: number,
  dtMs: number,
  onTick: (id: string, dmg: number) => void,
) {
  for (const [id, s] of monsterStatus) {
    if (s.dotUntil <= now || s.dotDps <= 0) continue
    const dmg = Math.max(1, Math.floor(s.dotDps * (dtMs / 1000)))
    if (dmg > 0) onTick(id, dmg)
  }
}

export function clearDeadStatus(id: string) {
  monsterStatus.delete(id)
}

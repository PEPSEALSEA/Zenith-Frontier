import type { AttackProfile } from '@/lib/classSystem'
import { sfx } from '@/lib/sfx'
import {
  fireSkillProjectile,
  fireStyleProjectiles,
  monstersInShape,
  parseEffect,
  skillFx,
  spawnBasicAttackFx,
  spawnSkillVisual,
  styleDelivery,
} from './fxRegistry'
import { aimAngle } from './targeting'
import { applyDot, applyMark, applyStun, markMultiplier } from './status'
import { spawnAnim, spawnBurst } from './particles'
import type { Point } from './hitShapes'

export type FloatFn = (x: number, y: number, text: string, color: string) => void

export type MutableMonster = {
  id: string
  x: number
  y: number
  def: number
  deadUntil: number
  hp: number
  maxHp: number
  atk: number
  drops: string[]
  flashUntil: number
}

export type LockTarget = { id: string; x: number; y: number; deadUntil: number } | null

function rollCrit(luck: number, force: boolean) {
  if (force) return Math.random() < 0.55
  return Math.random() < Math.min(0.35, 0.08 + luck * 0.002)
}

export function resolveBasicAttack(opts: {
  profile: AttackProfile
  type: 'light' | 'hard'
  origin: Point
  facing: number
  locked: LockTarget
  aimPoint?: { x: number; y: number } | null
  atk: number
  luck: number
  rangeAdd: number
  monsters: MutableMonster[]
  now: number
  pushFloat: FloatFn
  onKill: (m: MutableMonster) => void
}) {
  const hard = opts.type === 'hard'
  const range = (hard ? opts.profile.hard_range : opts.profile.light_range) + opts.rangeAdd
  const mult = hard ? opts.profile.hard_mult : opts.profile.light_mult
  const hits = Math.max(1, opts.profile.hits || 1)
  const angle = aimAngle(opts.origin, opts.facing, opts.locked, opts.aimPoint ?? null)
  const delivery = spawnBasicAttackFx(opts.profile, opts.origin, angle, hard)
  const baseDmg = Math.max(1, Math.floor(opts.atk * mult))

  if (delivery.shape === 'projectile' || delivery.shape === 'volley') {
    fireStyleProjectiles(delivery, opts.origin, angle, baseDmg, range, hard, opts.locked?.id || null)
    return
  }

  const shape = delivery.shape === 'beam' ? 'beam' : delivery.shape
  const targets = monstersInShape(opts.monsters, opts.origin, angle, range, shape, opts.now, {
    halfAngle: delivery.halfAngle,
    lineWidth: delivery.lineWidth,
  }) as MutableMonster[]

  for (const m of targets) {
    for (let h = 0; h < hits; h++) {
      applyHit(m, baseDmg, opts.luck, delivery.status === 'crit', opts.now, opts.pushFloat, '#fbbf24')
      if (delivery.status === 'stun' && hard) applyStun(m.id, opts.now, 800)
      if (delivery.status === 'dot') applyDot(m.id, opts.now, Math.max(1, Math.floor(baseDmg * 0.15)), 3000)
    }
    sfx.hit()
    if (m.hp <= 0) opts.onKill(m)
  }
}

export function resolveSkillCast(opts: {
  skill: { skill_id: string; skill_name: string; skill_type: string; power: number; range: number; effect: string }
  origin: Point
  facing: number
  locked: LockTarget
  aimPoint?: { x: number; y: number } | null
  atk: number
  luck: number
  rangeAdd: number
  monsters: MutableMonster[]
  now: number
  pushFloat: FloatFn
  onKill: (m: MutableMonster) => void
  applyHeal: (hp: number, mp: number) => void
  applyBuff: (kind: 'atk' | 'def' | 'range' | 'stealth', power: number, duration: number) => void
  applyDash: (dist: number) => void
}) {
  const tags = parseEffect(opts.skill.effect)
  const angle = aimAngle(opts.origin, opts.facing, opts.locked, opts.aimPoint ?? null)
  const fx = skillFx(opts.skill.skill_id)

  if (opts.skill.skill_type === 'heal') {
    const amt = Math.floor(opts.skill.power)
    opts.applyHeal(tags.mp_heal ? 0 : amt, tags.mp_heal ? amt : 0)
    spawnAnim('heal', opts.origin.x, opts.origin.y - 20, { scale: 1.2, life: 500, frames: 6 })
    spawnBurst(opts.origin.x, opts.origin.y, fx.trailColor, 10)
    sfx.heal()
    opts.pushFloat(opts.origin.x, opts.origin.y - 40, tags.mp_heal ? `+${amt} MP` : `+${amt}`, '#34d399')
    return
  }

  if (opts.skill.skill_type === 'dash' || tags.dash) {
    opts.applyDash(opts.skill.range || 90)
    spawnAnim('dash', opts.origin.x, opts.origin.y, { angle, scale: 1.3, life: 300, frames: 5 })
    sfx.dash()
    opts.pushFloat(opts.origin.x, opts.origin.y - 30, 'DASH', '#a78bfa')
    if (opts.skill.skill_type === 'dash' && opts.skill.power > 0) {
      const targets = monstersInShape(opts.monsters, opts.origin, angle, 70, 'cone', opts.now, { halfAngle: 0.8 }) as MutableMonster[]
      for (const m of targets) {
        applyHit(m, Math.floor(opts.atk * opts.skill.power), opts.luck, false, opts.now, opts.pushFloat, '#c084fc')
        if (m.hp <= 0) opts.onKill(m)
      }
    }
    return
  }

  if (opts.skill.skill_type === 'buff') {
    if (tags.stealth) {
      opts.applyBuff('stealth', 1, 5000)
      spawnAnim('smoke', opts.origin.x, opts.origin.y, { scale: 1.4, life: 600, frames: 6 })
      sfx.whoosh()
      opts.pushFloat(opts.origin.x, opts.origin.y - 40, 'STEALTH', '#94a3b8')
      return
    }
    if (tags.mark && opts.locked) {
      applyMark(opts.locked.id, opts.now, 8000, Math.max(1.2, opts.skill.power))
      spawnAnim('buff', opts.locked.x, opts.locked.y, { scale: 1, life: 400, frames: 6 })
      sfx.buff()
      opts.pushFloat(opts.locked.x, opts.locked.y - 30, 'MARK', '#fbbf24')
      return
    }
    if (tags.range_up) opts.applyBuff('range', opts.skill.power, 10000)
    else if (tags.def_up) opts.applyBuff('def', Math.max(1.1, opts.skill.power), 8000)
    else opts.applyBuff('atk', Math.max(1.1, opts.skill.power), 8000)
    spawnAnim(fx.sheet === 'holy' ? 'holy' : 'buff', opts.origin.x, opts.origin.y - 10, { scale: 1.2, life: 500, frames: 6 })
    sfx.buff()
    opts.pushFloat(opts.origin.x, opts.origin.y - 40, opts.skill.effect.toUpperCase() || 'BUFF', '#60a5fa')
    return
  }

  const range = (opts.skill.range || 80) + opts.rangeAdd
  const base = Math.max(1, Math.floor(opts.atk * opts.skill.power))
  spawnSkillVisual(opts.skill.skill_id, opts.origin, angle)

  if (tags.projectile || fx.sheet === 'fireball' || fx.sheet === 'arrow' || fx.sheet === 'bolt' || fx.sheet === 'hex' || fx.sheet === 'holy') {
    const n = tags.hits
    for (let i = 0; i < n; i++) {
      const spread = n > 1 ? (i - (n - 1) / 2) * 0.1 : 0
      fireSkillProjectile(
        opts.skill.skill_id,
        opts.origin,
        angle + spread,
        Math.floor(base * (n > 1 ? 0.7 : 1)),
        range,
        tags,
        opts.locked?.id || null,
      )
    }
    return
  }

  if (tags.aoe && !tags.line) {
    const at = opts.locked
      ? { x: opts.locked.x, y: opts.locked.y }
      : { x: opts.origin.x + Math.cos(angle) * Math.min(range, 100), y: opts.origin.y + Math.sin(angle) * Math.min(range, 100) }
    spawnAnim(fx.explodeSheet || 'explosion', at.x, at.y, { scale: 1.5, life: 450, frames: 8 })
    spawnBurst(at.x, at.y, fx.trailColor, 16)
    if (fx.sfx === 'explode' || tags.fire) sfx.explode()
    const targets = monstersInShape(opts.monsters, opts.origin, angle, range, 'aoe', opts.now, {
      aoeAt: at,
      aoeR: Math.max(70, range * 0.55),
    }) as MutableMonster[]
    for (const m of targets) {
      for (let h = 0; h < tags.hits; h++) {
        applyHit(m, base, opts.luck, tags.crit, opts.now, opts.pushFloat, '#c084fc')
        if (tags.stun) applyStun(m.id, opts.now)
        if (tags.dot) applyDot(m.id, opts.now, Math.max(1, Math.floor(base * 0.2)))
      }
      sfx.hit()
      if (m.hp <= 0) opts.onKill(m)
    }
    return
  }

  const shape = tags.line ? 'line' : tags.cone ? 'cone' : 'circle'
  const targets = monstersInShape(opts.monsters, opts.origin, angle, range, shape, opts.now, {
    halfAngle: 0.95,
    lineWidth: 24,
  }) as MutableMonster[]
  for (const m of targets) {
    for (let h = 0; h < tags.hits; h++) {
      applyHit(m, base, opts.luck, tags.crit, opts.now, opts.pushFloat, '#c084fc')
      if (tags.stun) applyStun(m.id, opts.now)
      if (tags.dot) applyDot(m.id, opts.now, Math.max(1, Math.floor(base * 0.2)))
      if (tags.mark) applyMark(m.id, opts.now)
    }
    sfx.hit()
    if (m.hp <= 0) opts.onKill(m)
  }
}

function applyHit(
  m: MutableMonster,
  baseDmg: number,
  luck: number,
  forceCrit: boolean,
  now: number,
  pushFloat: FloatFn,
  color: string,
) {
  let dmg = Math.max(1, Math.floor(baseDmg * markMultiplier(m.id, now) - m.def * 0.4))
  const crit = rollCrit(luck, forceCrit)
  if (crit) {
    dmg = Math.floor(dmg * 1.75)
    sfx.crit()
    pushFloat(m.x, m.y - 28, `CRIT -${dmg}`, '#f472b6')
  } else {
    pushFloat(m.x, m.y - 20, `-${dmg}`, color)
  }
  m.hp -= dmg
  m.flashUntil = now + 140
}

export function applyProjectileDamage(
  monsters: MutableMonster[],
  targetId: string,
  damage: number,
  now: number,
  luck: number,
  status: 'stun' | 'dot' | 'mark' | 'crit' | null | undefined,
  aoe: number,
  hitX: number,
  hitY: number,
  pushFloat: FloatFn,
  onKill: (m: MutableMonster) => void,
  onHitSfx?: string,
) {
  const applyOne = (m: MutableMonster, dmgBase: number) => {
    applyHit(m, dmgBase, luck, status === 'crit', now, pushFloat, '#c084fc')
    if (status === 'stun') applyStun(m.id, now)
    if (status === 'dot') applyDot(m.id, now, Math.max(1, Math.floor(dmgBase * 0.2)))
    if (status === 'mark') applyMark(m.id, now)
    if (m.hp <= 0) onKill(m)
  }

  if (aoe > 0) {
    for (const m of monsters) {
      if (m.deadUntil > now) continue
      if (Math.hypot(m.x - hitX, m.y - hitY) > aoe) continue
      applyOne(m, damage)
    }
    if (onHitSfx) sfx.play(onHitSfx)
    else sfx.explode()
    return
  }

  const m = monsters.find((x) => x.id === targetId)
  if (!m || m.deadUntil > now) return
  applyOne(m, damage)
  if (onHitSfx) sfx.play(onHitSfx)
  else sfx.hit()
}

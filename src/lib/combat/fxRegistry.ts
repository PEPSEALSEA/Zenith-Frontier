import type { AttackProfile } from '@/lib/classSystem'
import { sfx } from '@/lib/sfx'
import { inCircle, inCone, inLine, facingAngle } from './hitShapes'
import { spawnAnim, spawnBurst } from './particles'
import type { VfxSheetName } from './particles'
import { spawnProjectile } from './projectiles'
import type { Point } from './hitShapes'

export type EffectTags = {
  projectile: boolean
  aoe: boolean
  line: boolean
  cone: boolean
  hits: number
  stun: boolean
  dot: boolean
  crit: boolean
  stealth: boolean
  mark: boolean
  lock: boolean
  fire: boolean
  dash: boolean
  heal: boolean
  mp_heal: boolean
  atk_up: boolean
  def_up: boolean
  range_up: boolean
}

export function parseEffect(effect: string): EffectTags {
  const e = (effect || '').toLowerCase()
  const multi = /hits:(\d+)/.exec(e)
  return {
    projectile: e.includes('projectile'),
    aoe: e.includes('aoe'),
    line: e.includes('line'),
    cone: e.includes('cone'),
    hits: multi ? parseInt(multi[1], 10) : 1,
    stun: e.includes('stun'),
    dot: e.includes('dot'),
    crit: e.includes('crit'),
    stealth: e.includes('stealth'),
    mark: e.includes('mark'),
    lock: e.includes('lock'),
    fire: e.includes('fire'),
    dash: e.includes('dash'),
    heal: e.includes('heal') && !e.includes('mp_heal'),
    mp_heal: e.includes('mp_heal'),
    atk_up: e.includes('atk_up') || (e.includes('atk') && e.includes('up')),
    def_up: e.includes('def_up') || (e.includes('def') && e.includes('up')),
    range_up: e.includes('range_up') || (e.includes('range') && e.includes('up')),
  }
}

export type StyleDelivery = {
  shape: 'cone' | 'line' | 'circle' | 'projectile' | 'volley' | 'beam'
  sheet: VfxSheetName
  sfx: string
  projectileSheet?: VfxSheetName
  trailColor: string
  halfAngle?: number
  lineWidth?: number
  volley?: number
  aoe?: number
  status?: 'stun' | 'dot' | 'mark' | 'crit' | null
  pierce?: number
}

const STYLE_MAP: Record<string, StyleDelivery> = {
  slash: { shape: 'cone', sheet: 'slash', sfx: 'slash', trailColor: '#fde68a', halfAngle: 0.9 },
  frenzy: { shape: 'cone', sheet: 'slash', sfx: 'slash', trailColor: '#fca5a5', halfAngle: 1.1 },
  vorpal: { shape: 'cone', sheet: 'slash', sfx: 'crit', trailColor: '#e9d5ff', halfAngle: 0.85, status: 'crit' },
  curse_blade: { shape: 'cone', sheet: 'hex', sfx: 'hex', trailColor: '#c084fc', halfAngle: 0.9, status: 'dot' },
  shot: { shape: 'projectile', sheet: 'arrow', sfx: 'arrow', projectileSheet: 'arrow', trailColor: '#d2b48c' },
  volley: { shape: 'volley', sheet: 'arrow', sfx: 'arrow', projectileSheet: 'arrow', trailColor: '#d2b48c', volley: 3 },
  pierce_shot: { shape: 'projectile', sheet: 'arrow', sfx: 'arrow', projectileSheet: 'arrow', trailColor: '#fef3c7', pierce: 2 },
  bolt: { shape: 'projectile', sheet: 'bolt', sfx: 'whoosh', projectileSheet: 'bolt', trailColor: '#c4b5fd', aoe: 0 },
  beam: { shape: 'beam', sheet: 'lightning', sfx: 'thunder', trailColor: '#93c5fd', lineWidth: 18 },
  hex: { shape: 'projectile', sheet: 'hex', sfx: 'hex', projectileSheet: 'hex', trailColor: '#a855f7', status: 'dot' },
  twin: { shape: 'cone', sheet: 'slash', sfx: 'slash', trailColor: '#fda4af', halfAngle: 1.0 },
  riposte: { shape: 'cone', sheet: 'slash', sfx: 'slash', trailColor: '#fbbf24', halfAngle: 0.75 },
  shadow: { shape: 'cone', sheet: 'smoke', sfx: 'whoosh', trailColor: '#64748b', halfAngle: 0.7, status: 'crit' },
  thrust: { shape: 'line', sheet: 'slash', sfx: 'whoosh', trailColor: '#cbd5e1', lineWidth: 22 },
  charge: { shape: 'line', sheet: 'dash', sfx: 'dash', trailColor: '#a5b4fc', lineWidth: 26 },
  phalanx: { shape: 'line', sheet: 'slash', sfx: 'slash', trailColor: '#94a3b8', lineWidth: 28 },
  bash: { shape: 'circle', sheet: 'explosion', sfx: 'hit', trailColor: '#fcd34d', status: 'stun' },
  staff: { shape: 'circle', sheet: 'holy', sfx: 'holy', trailColor: '#fde68a' },
  holy: { shape: 'projectile', sheet: 'holy', sfx: 'holy', projectileSheet: 'holy', trailColor: '#fef08a' },
  song: { shape: 'circle', sheet: 'buff', sfx: 'buff', trailColor: '#67e8f9' },
}

export function styleDelivery(style: string): StyleDelivery {
  return STYLE_MAP[style] || STYLE_MAP.slash
}

export type SkillFx = {
  sheet: VfxSheetName
  sfx: string
  trailColor: string
  explodeSheet?: VfxSheetName
}

const SKILL_FX: Record<string, SkillFx> = {
  SKL_001: { sheet: 'slash', sfx: 'slash', trailColor: '#fde68a' },
  SKL_002: { sheet: 'slash', sfx: 'hit', trailColor: '#fca5a5' },
  SKL_003: { sheet: 'slash', sfx: 'whoosh', trailColor: '#e2e8f0' },
  SKL_004: { sheet: 'arrow', sfx: 'arrow', trailColor: '#d2b48c' },
  SKL_005: { sheet: 'bolt', sfx: 'whoosh', trailColor: '#c4b5fd' },
  SKL_006: { sheet: 'dash', sfx: 'dash', trailColor: '#a78bfa' },
  SKL_007: { sheet: 'slash', sfx: 'whoosh', trailColor: '#cbd5e1' },
  SKL_008: { sheet: 'heal', sfx: 'heal', trailColor: '#6ee7b7' },
  SKL_009: { sheet: 'buff', sfx: 'buff', trailColor: '#60a5fa' },
  SKL_010: { sheet: 'arrow', sfx: 'arrow', trailColor: '#d2b48c', explodeSheet: 'explosion' },
  SKL_011: { sheet: 'buff', sfx: 'buff', trailColor: '#93c5fd' },
  SKL_012: { sheet: 'slash', sfx: 'slash', trailColor: '#fda4af' },
  SKL_013: { sheet: 'smoke', sfx: 'whoosh', trailColor: '#64748b' },
  SKL_014: { sheet: 'slash', sfx: 'whoosh', trailColor: '#94a3b8' },
  SKL_015: { sheet: 'buff', sfx: 'buff', trailColor: '#94a3b8' },
  SKL_016: { sheet: 'buff', sfx: 'buff', trailColor: '#fde68a' },
  SKL_017: { sheet: 'heal', sfx: 'heal', trailColor: '#67e8f9' },
  SKL_018: { sheet: 'fireball', sfx: 'fireball_cast', trailColor: '#fb923c', explodeSheet: 'explosion' },
  SKL_019: { sheet: 'buff', sfx: 'buff', trailColor: '#a78bfa' },
  SKL_020: { sheet: 'explosion', sfx: 'explode', trailColor: '#f97316', explodeSheet: 'explosion' },
  SKL_021: { sheet: 'explosion', sfx: 'hit', trailColor: '#fcd34d' },
  SKL_022: { sheet: 'buff', sfx: 'buff', trailColor: '#94a3b8' },
  SKL_023: { sheet: 'buff', sfx: 'buff', trailColor: '#f87171' },
  SKL_024: { sheet: 'slash', sfx: 'slash', trailColor: '#ef4444' },
  SKL_025: { sheet: 'arrow', sfx: 'arrow', trailColor: '#d2b48c' },
  SKL_026: { sheet: 'buff', sfx: 'buff', trailColor: '#fbbf24' },
  SKL_027: { sheet: 'arrow', sfx: 'arrow', trailColor: '#fef3c7' },
  SKL_028: { sheet: 'arrow', sfx: 'arrow', trailColor: '#fde68a' },
  SKL_029: { sheet: 'smoke', sfx: 'crit', trailColor: '#64748b' },
  SKL_030: { sheet: 'smoke', sfx: 'whoosh', trailColor: '#475569' },
  SKL_031: { sheet: 'slash', sfx: 'slash', trailColor: '#fbbf24' },
  SKL_032: { sheet: 'slash', sfx: 'hit', trailColor: '#fcd34d' },
  SKL_033: { sheet: 'dash', sfx: 'dash', trailColor: '#a5b4fc' },
  SKL_034: { sheet: 'slash', sfx: 'whoosh', trailColor: '#c4b5fd', explodeSheet: 'explosion' },
  SKL_035: { sheet: 'buff', sfx: 'buff', trailColor: '#94a3b8' },
  SKL_036: { sheet: 'slash', sfx: 'whoosh', trailColor: '#cbd5e1' },
  SKL_037: { sheet: 'heal', sfx: 'heal', trailColor: '#6ee7b7' },
  SKL_038: { sheet: 'holy', sfx: 'holy', trailColor: '#fef08a' },
  SKL_039: { sheet: 'buff', sfx: 'buff', trailColor: '#67e8f9' },
  SKL_040: { sheet: 'buff', sfx: 'buff', trailColor: '#22d3ee', explodeSheet: 'explosion' },
  SKL_041: { sheet: 'lightning', sfx: 'thunder', trailColor: '#93c5fd' },
  SKL_042: { sheet: 'explosion', sfx: 'explode', trailColor: '#f472b6', explodeSheet: 'explosion' },
  SKL_043: { sheet: 'hex', sfx: 'hex', trailColor: '#a855f7' },
  SKL_044: { sheet: 'hex', sfx: 'hex', trailColor: '#c084fc' },
  SKL_045: { sheet: 'slash', sfx: 'crit', trailColor: '#e9d5ff' },
  SKL_046: { sheet: 'bolt', sfx: 'whoosh', trailColor: '#ddd6fe', explodeSheet: 'explosion' },
  SKL_047: { sheet: 'hex', sfx: 'hex', trailColor: '#7c3aed' },
  SKL_048: { sheet: 'buff', sfx: 'buff', trailColor: '#f87171' },
  SKL_049: { sheet: 'arrow', sfx: 'arrow', trailColor: '#fde68a' },
  SKL_050: { sheet: 'slash', sfx: 'slash', trailColor: '#fda4af' },
  SKL_051: { sheet: 'slash', sfx: 'whoosh', trailColor: '#cbd5e1', explodeSheet: 'explosion' },
  SKL_052: { sheet: 'holy', sfx: 'holy', trailColor: '#fef08a' },
  SKL_053: { sheet: 'holy', sfx: 'holy', trailColor: '#fde68a' },
  SKL_054: { sheet: 'dash', sfx: 'dash', trailColor: '#94a3b8' },
  SKL_055: { sheet: 'slash', sfx: 'slash', trailColor: '#ef4444' },
  SKL_056: { sheet: 'explosion', sfx: 'hit', trailColor: '#fca5a5', explodeSheet: 'explosion' },
  SKL_057: { sheet: 'arrow', sfx: 'arrow', trailColor: '#d2b48c' },
  SKL_058: { sheet: 'smoke', sfx: 'whoosh', trailColor: '#64748b' },
  SKL_059: { sheet: 'buff', sfx: 'buff', trailColor: '#93c5fd' },
  SKL_060: { sheet: 'arrow', sfx: 'explode', trailColor: '#fb923c', explodeSheet: 'explosion' },
  SKL_061: { sheet: 'hex', sfx: 'hex', trailColor: '#86efac' },
  SKL_062: { sheet: 'dash', sfx: 'dash', trailColor: '#64748b' },
  SKL_063: { sheet: 'slash', sfx: 'whoosh', trailColor: '#fbbf24' },
  SKL_064: { sheet: 'buff', sfx: 'buff', trailColor: '#fcd34d' },
  SKL_065: { sheet: 'slash', sfx: 'whoosh', trailColor: '#a5b4fc' },
  SKL_066: { sheet: 'slash', sfx: 'whoosh', trailColor: '#c4b5fd', explodeSheet: 'explosion' },
  SKL_067: { sheet: 'buff', sfx: 'buff', trailColor: '#94a3b8' },
  SKL_068: { sheet: 'slash', sfx: 'whoosh', trailColor: '#cbd5e1' },
  SKL_069: { sheet: 'holy', sfx: 'holy', trailColor: '#fef08a' },
  SKL_070: { sheet: 'heal', sfx: 'heal', trailColor: '#67e8f9' },
  SKL_071: { sheet: 'buff', sfx: 'hit', trailColor: '#22d3ee', explodeSheet: 'explosion' },
  SKL_072: { sheet: 'heal', sfx: 'heal', trailColor: '#6ee7b7' },
  SKL_073: { sheet: 'bolt', sfx: 'whoosh', trailColor: '#7dd3fc' },
  SKL_074: { sheet: 'fireball', sfx: 'fireball_cast', trailColor: '#fb923c' },
  SKL_075: { sheet: 'hex', sfx: 'hex', trailColor: '#a855f7' },
  SKL_076: { sheet: 'hex', sfx: 'explode', trailColor: '#7c3aed', explodeSheet: 'explosion' },
  SKL_077: { sheet: 'dash', sfx: 'dash', trailColor: '#e9d5ff' },
  SKL_078: { sheet: 'bolt', sfx: 'crit', trailColor: '#ddd6fe' },
  SKL_079: { sheet: 'hex', sfx: 'hit', trailColor: '#f87171', explodeSheet: 'explosion' },
  SKL_080: { sheet: 'dash', sfx: 'dash', trailColor: '#c084fc' },
}

export function skillFx(skillId: string): SkillFx {
  return SKILL_FX[skillId] || { sheet: 'bolt', sfx: 'whoosh', trailColor: '#c084fc' }
}

export function registerSkillFx(id: string, fx: SkillFx) {
  SKILL_FX[id] = fx
}

export type MonsterHit = {
  id: string
  x: number
  y: number
  def: number
  deadUntil: number
}

export function monstersInShape(
  monsters: MonsterHit[],
  origin: Point,
  angle: number,
  range: number,
  shape: StyleDelivery['shape'] | 'aoe',
  now: number,
  opts?: { halfAngle?: number; lineWidth?: number; aoeAt?: Point; aoeR?: number },
): MonsterHit[] {
  const out: MonsterHit[] = []
  for (const m of monsters) {
    if (m.deadUntil > now) continue
    let hit = false
    if (shape === 'cone') {
      hit = inCone(m.x, m.y, origin.x, origin.y, angle, range, opts?.halfAngle ?? 0.85)
    } else if (shape === 'line' || shape === 'beam') {
      hit = inLine(m.x, m.y, origin.x, origin.y, angle, range, opts?.lineWidth ?? 20)
    } else if (shape === 'aoe' && opts?.aoeAt) {
      hit = inCircle(m.x, m.y, opts.aoeAt.x, opts.aoeAt.y, opts.aoeR ?? range)
    } else {
      hit = inCircle(m.x, m.y, origin.x, origin.y, range)
    }
    if (hit) out.push(m)
  }
  return out
}

export function playDeliverySfx(name: string) {
  sfx.play(name)
}

export function spawnBasicAttackFx(
  profile: AttackProfile,
  origin: Point,
  angle: number,
  hard: boolean,
) {
  const d = styleDelivery(profile.style)
  const scale = hard ? 1.35 : 1
  spawnAnim(d.sheet, origin.x + Math.cos(angle) * 28, origin.y + Math.sin(angle) * 28, {
    angle,
    scale: scale * (hard ? 1.15 : 1),
    life: hard ? 340 : 280,
    frames: 6,
  })
  spawnBurst(origin.x, origin.y, d.trailColor, hard ? 16 : 10)
  spawnBurst(origin.x + Math.cos(angle) * 36, origin.y + Math.sin(angle) * 36, '#ffffff', hard ? 8 : 4)
  playDeliverySfx(d.sfx)
  return d
}

export function spawnSkillVisual(skillId: string, origin: Point, angle: number) {
  const fx = skillFx(skillId)
  spawnAnim(fx.sheet, origin.x + Math.cos(angle) * 20, origin.y + Math.sin(angle) * 20, {
    angle,
    scale: 1.15,
    life: 360,
    frames: 6,
  })
  playDeliverySfx(fx.sfx)
  return fx
}

export function fireStyleProjectiles(
  delivery: StyleDelivery,
  origin: Point,
  angle: number,
  damage: number,
  range: number,
  hard: boolean,
  homingId: string | null,
) {
  const sheet = delivery.projectileSheet || 'bolt'
  const count = delivery.shape === 'volley' ? (delivery.volley || 3) : 1
  const isMagic = sheet === 'bolt' || sheet === 'hex' || sheet === 'holy' || sheet === 'fireball'
  const speed = isMagic ? (hard ? 7.2 : 6.2) : (hard ? 9.5 : 8)
  const aoe = hard && (sheet === 'bolt' || sheet === 'hex')
    ? Math.max(delivery.aoe || 0, 48)
    : (delivery.aoe || 0)
  for (let i = 0; i < count; i++) {
    const spread = count > 1 ? (i - (count - 1) / 2) * 0.12 : 0
    spawnProjectile({
      x: origin.x,
      y: origin.y,
      angle: angle + spread,
      speed,
      life: 900 + range * 2,
      radius: isMagic ? 14 : 12,
      damage: Math.floor(damage * (count > 1 ? 0.75 : 1)),
      hits: 1,
      maxPierce: delivery.pierce || 0,
      aoe,
      sheet,
      trailColor: delivery.trailColor,
      explodeSheet: aoe > 0 ? 'explosion' : undefined,
      onHitSfx: aoe > 0 ? 'explode' : 'hit',
      status: delivery.status || null,
      homingId,
      owner: 'player',
    })
  }
}

export function fireSkillProjectile(
  skillId: string,
  origin: Point,
  angle: number,
  damage: number,
  range: number,
  tags: EffectTags,
  homingId: string | null,
) {
  const fx = skillFx(skillId)
  const sheet = (tags.fire ? 'fireball' : fx.sheet) as VfxSheetName
  spawnProjectile({
    x: origin.x,
    y: origin.y,
    angle,
    speed: tags.fire ? 7.5 : 8.5,
    life: 1000 + range * 2,
    radius: tags.fire ? 16 : 12,
    damage,
    hits: 1,
    maxPierce: tags.line ? 3 : 0,
    aoe: tags.aoe ? Math.max(60, range * 0.45) : 0,
    sheet: sheet === 'slash' || sheet === 'explosion' ? 'bolt' : sheet,
    trailColor: fx.trailColor,
    explodeSheet: fx.explodeSheet || (tags.aoe ? 'explosion' : undefined),
    onHitSfx: tags.fire || tags.aoe ? 'explode' : 'hit',
    status: tags.stun ? 'stun' : tags.dot ? 'dot' : tags.crit ? 'crit' : tags.mark ? 'mark' : null,
    homingId: tags.lock || homingId ? homingId : null,
    owner: 'player',
  })
  playDeliverySfx(fx.sfx)
}

export { facingAngle }

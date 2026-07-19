import { dist } from './hitShapes'
import { spawnAnim, spawnBurst } from './particles'
import type { VfxSheetName } from './particles'

export type ZoneHitPayload = {
  attackType: 'light' | 'hard' | 'skill'
  skillId?: string
  power?: number
  range?: number
}

export type Projectile = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  speed: number
  angle: number
  life: number
  born: number
  radius: number
  damage: number
  hits: number
  pierced: number
  maxPierce: number
  aoe: number
  sheet: VfxSheetName
  trailColor: string
  explodeSheet?: VfxSheetName
  onHitSfx?: string
  status?: 'stun' | 'dot' | 'mark' | 'crit' | null
  hitIds: Set<string>
  homingId?: string | null
  owner: 'player'
  zoneHit?: ZoneHitPayload
}

export type HitTarget = {
  id: string
  x: number
  y: number
  hp: number
  deadUntil: number
  def: number
}

let projId = 0
export const projectiles: Projectile[] = []

export function spawnProjectile(opts: Omit<Projectile, 'id' | 'born' | 'hitIds' | 'pierced' | 'vx' | 'vy'> & {
  angle: number
  speed: number
}) {
  const p: Projectile = {
    ...opts,
    id: ++projId,
    born: Date.now(),
    hitIds: new Set(),
    pierced: 0,
    vx: Math.cos(opts.angle) * opts.speed,
    vy: Math.sin(opts.angle) * opts.speed,
  }
  projectiles.push(p)
  spawnAnim(opts.sheet, opts.x, opts.y, { angle: opts.angle, scale: 0.9, life: 120, frames: 4 })
  return p
}

export type ProjHitResult = {
  targetId: string
  x: number
  y: number
  damage: number
  status?: Projectile['status']
  aoe: number
  explodeSheet?: VfxSheetName
  onHitSfx?: string
  zoneHit?: ZoneHitPayload
}

export function updateProjectiles(
  now: number,
  dt: number,
  monsters: HitTarget[],
  getHomingPos: (id: string) => { x: number; y: number } | null,
): ProjHitResult[] {
  const hits: ProjHitResult[] = []
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i]
    if (now - p.born > p.life) {
      projectiles.splice(i, 1)
      continue
    }
    if (p.homingId) {
      const t = getHomingPos(p.homingId)
      if (t) {
        const desired = Math.atan2(t.y - p.y, t.x - p.x)
        let diff = desired - p.angle
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        p.angle += Math.max(-0.12, Math.min(0.12, diff)) * dt
        p.vx = Math.cos(p.angle) * p.speed
        p.vy = Math.sin(p.angle) * p.speed
      }
    }
    p.x += p.vx * dt
    p.y += p.vy * dt
    if (Math.random() < 0.35) {
      spawnBurst(p.x, p.y, p.trailColor, 2)
    }

    let consumed = false
    for (const m of monsters) {
      if (m.deadUntil > now || m.hp <= 0) continue
      if (p.hitIds.has(m.id)) continue
      if (dist(p.x, p.y, m.x, m.y) > p.radius + 16) continue
      p.hitIds.add(m.id)
      hits.push({
        targetId: m.id,
        x: m.x,
        y: m.y,
        damage: p.damage,
        status: p.status,
        aoe: p.aoe,
        explodeSheet: p.explodeSheet,
        onHitSfx: p.onHitSfx,
        zoneHit: p.zoneHit,
      })
      p.pierced++
      if (p.aoe > 0) {
        spawnAnim(p.explodeSheet || 'explosion', p.x, p.y, { scale: 1.55, life: 450, frames: 8 })
        spawnBurst(p.x, p.y, p.trailColor, 22)
      }
      if (p.pierced > p.maxPierce) {
        consumed = true
        break
      }
    }
    if (consumed) projectiles.splice(i, 1)
  }
  return hits
}

export function drawProjectiles(ctx: CanvasRenderingContext2D, now: number) {
  for (const p of projectiles) {
    const age = (now - p.born) / p.life
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.angle)
    ctx.globalAlpha = Math.max(0.4, 1 - age * 0.5)
    ctx.fillStyle = p.trailColor
    ctx.beginPath()
    ctx.ellipse(0, 0, 14, 7, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.globalAlpha = 0.7
    ctx.beginPath()
    ctx.arc(4, 0, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

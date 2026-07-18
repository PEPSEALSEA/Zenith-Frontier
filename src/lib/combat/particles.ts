export type VfxSheetName =
  | 'slash'
  | 'arrow'
  | 'fireball'
  | 'bolt'
  | 'explosion'
  | 'heal'
  | 'buff'
  | 'dash'
  | 'smoke'
  | 'lightning'
  | 'holy'
  | 'hex'

export type AnimFx = {
  id: number
  sheet: VfxSheetName
  x: number
  y: number
  angle: number
  scale: number
  born: number
  life: number
  frames: number
  followId?: string
}

export type ParticleKind = 'dot' | 'spark' | 'star' | 'shard'

export type Particle = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  life: number
  born: number
  color: string
  size: number
  kind: ParticleKind
  drag?: number
}

export type Shockwave = {
  id: number
  x: number
  y: number
  born: number
  life: number
  maxR: number
  color: string
  width: number
}

const sheets = new Map<string, HTMLImageElement>()
let animId = 0
let partId = 0
let waveId = 0

export const anims: AnimFx[] = []
export const particles: Particle[] = []
export const shockwaves: Shockwave[] = []

let shakeAmp = 0
let shakeUntil = 0

export function preloadSheets() {
  if (typeof window === 'undefined') return
  const names: VfxSheetName[] = [
    'slash', 'arrow', 'fireball', 'bolt', 'explosion', 'heal', 'buff', 'dash', 'smoke', 'lightning', 'holy', 'hex',
  ]
  for (const n of names) {
    if (sheets.has(n)) continue
    const img = new Image()
    img.src = `/vfx/${n}.png`
    sheets.set(n, img)
  }
}

export function getSheet(name: VfxSheetName) {
  return sheets.get(name) || null
}

export function spawnAnim(
  sheet: VfxSheetName,
  x: number,
  y: number,
  opts?: { angle?: number; scale?: number; life?: number; frames?: number },
) {
  anims.push({
    id: ++animId,
    sheet,
    x,
    y,
    angle: opts?.angle ?? 0,
    scale: opts?.scale ?? 1,
    born: Date.now(),
    life: opts?.life ?? 320,
    frames: opts?.frames ?? 6,
  })
}

export function spawnBurst(x: number, y: number, color: string, count = 10) {
  const now = Date.now()
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.45
    const sp = 1.4 + Math.random() * 3.2
    particles.push({
      id: ++partId,
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 260 + Math.random() * 220,
      born: now,
      color,
      size: 2 + Math.random() * 3.5,
      kind: Math.random() > 0.55 ? 'spark' : 'dot',
      drag: 0.985,
    })
  }
}

/** Big arcade kill splash — mixed sparks, stars, shards + shockwave. */
export function spawnKillSplash(x: number, y: number, color: string) {
  const now = Date.now()
  const palette = [color, '#fff7ed', '#fde68a', '#fb7185', '#ffffff']
  for (let i = 0; i < 42; i++) {
    const a = Math.random() * Math.PI * 2
    const sp = 2.5 + Math.random() * 7
    const kindRoll = Math.random()
    const kind: ParticleKind = kindRoll > 0.72 ? 'star' : kindRoll > 0.4 ? 'spark' : kindRoll > 0.18 ? 'shard' : 'dot'
    particles.push({
      id: ++partId,
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - Math.random() * 1.2,
      life: 420 + Math.random() * 380,
      born: now,
      color: palette[i % palette.length],
      size: kind === 'star' ? 5 + Math.random() * 5 : 2.5 + Math.random() * 4,
      kind,
      drag: 0.978,
    })
  }
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * 2 * i) / 12
    particles.push({
      id: ++partId,
      x,
      y,
      vx: Math.cos(a) * 9,
      vy: Math.sin(a) * 9,
      life: 280,
      born: now,
      color: '#ffffff',
      size: 3,
      kind: 'spark',
      drag: 0.96,
    })
  }
  spawnShockwave(x, y, color, 90, 420)
  spawnShockwave(x, y, '#ffffff', 55, 280)
  spawnAnim('explosion', x, y, { scale: 2.1, life: 520, frames: 8 })
  addScreenShake(7, 280)
}

export function spawnHitSplash(x: number, y: number, color: string, hard = false) {
  spawnBurst(x, y, color, hard ? 18 : 12)
  spawnBurst(x, y, '#ffffff', hard ? 8 : 4)
  if (hard) {
    spawnShockwave(x, y, color, 42, 260)
    addScreenShake(3.5, 120)
  }
}

export function spawnShockwave(
  x: number,
  y: number,
  color: string,
  maxR = 70,
  life = 360,
  width = 4,
) {
  shockwaves.push({
    id: ++waveId,
    x,
    y,
    born: Date.now(),
    life,
    maxR,
    color,
    width,
  })
}

export function spawnLockSelectFx(fromX: number, fromY: number, toX: number, toY: number) {
  const now = Date.now()
  const dx = toX - fromX
  const dy = toY - fromY
  const dist = Math.hypot(dx, dy) || 1
  const steps = Math.min(18, Math.max(8, Math.floor(dist / 28)))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const px = fromX + dx * t
    const py = fromY + dy * t
    particles.push({
      id: ++partId,
      x: px,
      y: py,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8 - 0.4,
      life: 320 + Math.random() * 180,
      born: now,
      color: i === steps ? '#fbbf24' : '#fde68a',
      size: i === steps ? 5 : 2 + Math.random() * 2,
      kind: i === steps ? 'star' : 'spark',
      drag: 0.99,
    })
  }
  spawnBurst(fromX, fromY, '#fbbf24', 14)
  spawnBurst(toX, toY, '#fde68a', 16)
  spawnShockwave(toX, toY, '#fbbf24', 48, 320)
  spawnAnim('buff', toX, toY - 8, { scale: 1.35, life: 400, frames: 6 })
  addScreenShake(2, 90)
}

export function addScreenShake(amplitude: number, durationMs: number) {
  shakeAmp = Math.max(shakeAmp, amplitude)
  shakeUntil = Math.max(shakeUntil, Date.now() + durationMs)
}

export function getScreenShake(now: number): { x: number; y: number } {
  if (now >= shakeUntil || shakeAmp <= 0) return { x: 0, y: 0 }
  const left = shakeUntil - now
  const t = Math.min(1, left / 280)
  const a = shakeAmp * t
  return {
    x: (Math.random() - 0.5) * 2 * a,
    y: (Math.random() - 0.5) * 2 * a,
  }
}

export function updateFx(now: number, dt: number) {
  for (let i = anims.length - 1; i >= 0; i--) {
    if (now - anims[i].born > anims[i].life) anims.splice(i, 1)
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    const age = now - p.born
    if (age > p.life) {
      particles.splice(i, 1)
      continue
    }
    const drag = p.drag ?? 0.99
    p.vx *= drag
    p.vy *= drag
    p.x += p.vx * dt
    p.y += p.vy * dt
    if (p.kind === 'dot' || p.kind === 'shard') p.vy += 0.035 * dt
  }
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    if (now - shockwaves[i].born > shockwaves[i].life) shockwaves.splice(i, 1)
  }
  if (now >= shakeUntil) shakeAmp = 0
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5
    const b = a + Math.PI / 5
    const ox = i === 0 ? Math.cos(a) * r : Math.cos(a) * r
    const oy = i === 0 ? Math.sin(a) * r : Math.sin(a) * r
    if (i === 0) ctx.moveTo(x + ox, y + oy)
    else ctx.lineTo(x + ox, y + oy)
    ctx.lineTo(x + Math.cos(b) * r * 0.4, y + Math.sin(b) * r * 0.4)
  }
  ctx.closePath()
  ctx.fill()
}

export function drawFx(ctx: CanvasRenderingContext2D, now: number) {
  for (const w of shockwaves) {
    const age = (now - w.born) / w.life
    const r = w.maxR * (0.15 + age * 0.85)
    ctx.save()
    ctx.globalAlpha = Math.max(0, 1 - age) * 0.85
    ctx.strokeStyle = w.color
    ctx.lineWidth = w.width * (1 - age * 0.6)
    ctx.beginPath()
    ctx.arc(w.x, w.y, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = Math.max(0, 0.35 - age * 0.35)
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(w.x, w.y, r * 0.72, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  for (const p of particles) {
    const age = (now - p.born) / p.life
    ctx.save()
    ctx.globalAlpha = Math.max(0, 1 - age)
    ctx.fillStyle = p.color
    const s = p.size * (1 - age * 0.35)
    if (p.kind === 'star') {
      drawStar(ctx, p.x, p.y, s)
    } else if (p.kind === 'spark') {
      const ang = Math.atan2(p.vy, p.vx)
      ctx.translate(p.x, p.y)
      ctx.rotate(ang)
      ctx.fillRect(-s * 1.8, -s * 0.35, s * 3.6, s * 0.7)
    } else if (p.kind === 'shard') {
      ctx.translate(p.x, p.y)
      ctx.rotate(age * 8 + p.id)
      ctx.beginPath()
      ctx.moveTo(0, -s)
      ctx.lineTo(s * 0.7, s * 0.6)
      ctx.lineTo(-s * 0.7, s * 0.6)
      ctx.closePath()
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.arc(p.x, p.y, s, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  for (const a of anims) {
    const img = getSheet(a.sheet)
    if (!img || !img.complete || img.naturalWidth === 0) continue
    const age = (now - a.born) / a.life
    const frame = Math.min(a.frames - 1, Math.floor(age * a.frames))
    const fw = img.naturalWidth / a.frames
    const fh = img.naturalHeight
    ctx.save()
    ctx.translate(a.x, a.y)
    ctx.rotate(a.angle)
    ctx.globalAlpha = Math.max(0, 1 - age * 0.85)
    const s = a.scale * (0.85 + age * 0.25)
    ctx.drawImage(img, frame * fw, 0, fw, fh, (-fw / 2) * s, (-fh / 2) * s, fw * s, fh * s)
    ctx.restore()
  }
}

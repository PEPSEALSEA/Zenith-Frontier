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
}

const sheets = new Map<string, HTMLImageElement>()
let animId = 0
let partId = 0

export const anims: AnimFx[] = []
export const particles: Particle[] = []

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
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.4
    const sp = 1.2 + Math.random() * 2.5
    particles.push({
      id: ++partId,
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 280 + Math.random() * 200,
      born: now,
      color,
      size: 2 + Math.random() * 3,
    })
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
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vy += 0.04 * dt
  }
}

export function drawFx(ctx: CanvasRenderingContext2D, now: number) {
  for (const p of particles) {
    const age = (now - p.born) / p.life
    ctx.globalAlpha = Math.max(0, 1 - age)
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * (1 - age * 0.5), 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
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

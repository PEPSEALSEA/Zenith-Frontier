/**
 * Combat SFX — Howler WAV under /public/sfx with Web Audio beep fallback.
 */
import { Howl } from 'howler'

let ctx: AudioContext | null = null
const howls: Record<string, Howl> = {}
const failed = new Set<string>()

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function beep(freq: number, durationMs: number, type: OscillatorType = 'square', gain = 0.08) {
  const ac = getCtx()
  if (!ac) return
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.value = gain
  osc.connect(g)
  g.connect(ac.destination)
  const t = ac.currentTime
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + durationMs / 1000)
  osc.start(t)
  osc.stop(t + durationMs / 1000 + 0.02)
}

function getHowl(name: string): Howl | null {
  if (failed.has(name)) return null
  if (!howls[name]) {
    howls[name] = new Howl({
      src: [`/sfx/${name}.wav`],
      volume: 0.45,
      preload: true,
      onloaderror: () => {
        failed.add(name)
      },
    })
  }
  return howls[name]
}

function play(name: string, fallback?: () => void) {
  if (typeof window === 'undefined') return
  const h = getHowl(name)
  if (h && !failed.has(name)) {
    try {
      h.play()
      return
    } catch {
      /* fall through */
    }
  }
  fallback?.()
}

const FALLBACKS: Record<string, () => void> = {
  slash: () => beep(180, 80, 'sawtooth', 0.07),
  arrow: () => beep(880, 60, 'sine', 0.06),
  fireball_cast: () => beep(120, 120, 'sawtooth', 0.08),
  explode: () => {
    beep(80, 180, 'sawtooth', 0.1)
    setTimeout(() => beep(60, 100, 'square', 0.06), 40)
  },
  hit: () => beep(220, 60, 'square', 0.06),
  crit: () => {
    beep(523, 70, 'sine', 0.08)
    setTimeout(() => beep(784, 90, 'sine', 0.07), 50)
  },
  heal: () => {
    beep(523, 80, 'sine', 0.07)
    setTimeout(() => beep(659, 100, 'sine', 0.06), 60)
  },
  buff: () => beep(392, 100, 'triangle', 0.07),
  dash: () => beep(300, 80, 'sawtooth', 0.06),
  thunder: () => beep(90, 220, 'sawtooth', 0.1),
  whoosh: () => beep(200, 100, 'sawtooth', 0.05),
  holy: () => {
    beep(660, 80, 'sine', 0.06)
    setTimeout(() => beep(880, 100, 'sine', 0.05), 50)
  },
  hex: () => beep(100, 160, 'sawtooth', 0.07),
  kill: () => {
    beep(440, 80, 'sawtooth', 0.07)
    setTimeout(() => beep(660, 100, 'triangle', 0.05), 60)
  },
  coin: () => {
    beep(880, 50, 'triangle', 0.05)
    setTimeout(() => beep(1175, 70, 'triangle', 0.05), 40)
  },
  levelup: () => {
    beep(523, 80, 'sine', 0.07)
    setTimeout(() => beep(659, 80, 'sine', 0.07), 70)
    setTimeout(() => beep(784, 120, 'sine', 0.08), 140)
  },
  death: () => beep(120, 280, 'sawtooth', 0.09),
}

export type SfxName = keyof typeof FALLBACKS | string

export const sfx = {
  play(name: SfxName) {
    play(String(name), FALLBACKS[String(name)])
  },
  hit() {
    play('hit', FALLBACKS.hit)
  },
  kill() {
    play('kill', FALLBACKS.kill)
  },
  levelUp() {
    play('levelup', FALLBACKS.levelup)
  },
  death() {
    play('death', FALLBACKS.death)
  },
  coin() {
    play('coin', FALLBACKS.coin)
  },
  slash() {
    play('slash', FALLBACKS.slash)
  },
  arrow() {
    play('arrow', FALLBACKS.arrow)
  },
  fireball() {
    play('fireball_cast', FALLBACKS.fireball_cast)
  },
  explode() {
    play('explode', FALLBACKS.explode)
  },
  crit() {
    play('crit', FALLBACKS.crit)
  },
  heal() {
    play('heal', FALLBACKS.heal)
  },
  buff() {
    play('buff', FALLBACKS.buff)
  },
  dash() {
    play('dash', FALLBACKS.dash)
  },
  thunder() {
    play('thunder', FALLBACKS.thunder)
  },
  whoosh() {
    play('whoosh', FALLBACKS.whoosh)
  },
  holy() {
    play('holy', FALLBACKS.holy)
  },
  hex() {
    play('hex', FALLBACKS.hex)
  },
}

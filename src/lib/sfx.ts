/**
 * SFX via Web Audio beeps. `howler` is installed for future WAV/BGM under /public/sfx.
 */
import 'howler'

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext
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

export const sfx = {
  hit() {
    beep(220, 60, 'square', 0.06)
  },
  kill() {
    beep(440, 80, 'sawtooth', 0.07)
    setTimeout(() => beep(660, 100, 'triangle', 0.05), 60)
  },
  levelUp() {
    beep(523, 80, 'sine', 0.07)
    setTimeout(() => beep(659, 80, 'sine', 0.07), 70)
    setTimeout(() => beep(784, 120, 'sine', 0.08), 140)
  },
  death() {
    beep(120, 280, 'sawtooth', 0.09)
  },
  coin() {
    beep(880, 50, 'triangle', 0.05)
    setTimeout(() => beep(1175, 70, 'triangle', 0.05), 40)
  },
}

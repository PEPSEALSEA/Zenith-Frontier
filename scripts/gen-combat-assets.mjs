/**
 * Generate owned combat PNG sprite sheets + WAV SFX into public/.
 * Run: node scripts/gen-combat-assets.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const vfxDir = path.join(root, 'public', 'vfx')
const sfxDir = path.join(root, 'public', 'sfx')
fs.mkdirSync(vfxDir, { recursive: true })
fs.mkdirSync(sfxDir, { recursive: true })

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function setPx(rgba, w, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= w || y >= rgba.length / (w * 4)) return
  const i = (y * w + x) * 4
  rgba[i] = r
  rgba[i + 1] = g
  rgba[i + 2] = b
  rgba[i + 3] = a
}

function disc(rgba, w, cx, cy, rad, r, g, b, a) {
  const r2 = rad * rad
  for (let y = Math.floor(cy - rad); y <= cy + rad; y++) {
    for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
      const d = (x - cx) ** 2 + (y - cy) ** 2
      if (d <= r2) {
        const fall = 1 - Math.sqrt(d) / rad
        setPx(rgba, w, x, y, r, g, b, Math.min(255, Math.floor(a * (0.35 + fall * 0.65))))
      }
    }
  }
}

function arcSlash(rgba, w, h, frame, frames, rgb) {
  const cx = w / 2
  const cy = h / 2
  const t0 = -Math.PI * 0.7 + (frame / frames) * Math.PI * 0.9
  const t1 = t0 + 0.55
  for (let a = t0; a < t1; a += 0.02) {
    for (let rad = 10; rad < 28; rad++) {
      const x = Math.floor(cx + Math.cos(a) * rad)
      const y = Math.floor(cy + Math.sin(a) * rad)
      const edge = 1 - Math.abs(rad - 20) / 10
      setPx(rgba, w, x, y, rgb[0], rgb[1], rgb[2], Math.floor(220 * Math.max(0, edge)))
    }
  }
}

function sheet(name, frames, drawFn, rgb) {
  const fw = 64
  const fh = 64
  const w = fw * frames
  const rgba = Buffer.alloc(w * fh * 4)
  for (let f = 0; f < frames; f++) drawFn(rgba, w, fh, f, frames, fw, rgb, f * fw)
  fs.writeFileSync(path.join(vfxDir, `${name}.png`), encodePng(w, fh, rgba))
  console.log('vfx', name)
}

sheet('slash', 6, (rgba, w, h, f, n, fw, rgb, ox) => {
  const sub = Buffer.alloc(fw * h * 4)
  arcSlash(sub, fw, h, f, n, rgb)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < fw; x++) {
      const si = (y * fw + x) * 4
      if (sub[si + 3]) setPx(rgba, w, ox + x, y, sub[si], sub[si + 1], sub[si + 2], sub[si + 3])
    }
  }
}, [255, 240, 200])

sheet('arrow', 4, (rgba, w, h, f, n, fw, rgb, ox) => {
  const cx = ox + 20 + f * 4
  const cy = h / 2
  for (let i = 0; i < 28; i++) setPx(rgba, w, cx + i, cy, 210, 180, 120, 230)
  disc(rgba, w, cx + 28, cy, 4, 240, 220, 160, 255)
  disc(rgba, w, cx, cy, 3, 180, 80, 60, 220)
}, [210, 180, 120])

sheet('fireball', 6, (rgba, w, h, f, n, fw, rgb, ox) => {
  const cx = ox + fw / 2
  const cy = h / 2
  const pulse = 10 + (f % 3) * 2
  disc(rgba, w, cx, cy, pulse + 6, 255, 120, 20, 120)
  disc(rgba, w, cx, cy, pulse, 255, 80, 10, 200)
  disc(rgba, w, cx - 2, cy - 2, pulse * 0.45, 255, 220, 120, 255)
}, [255, 100, 20])

sheet('bolt', 5, (rgba, w, h, f, n, fw, rgb, ox) => {
  const cx = ox + fw / 2
  const cy = h / 2
  disc(rgba, w, cx, cy, 8 + f, 160, 100, 255, 140)
  disc(rgba, w, cx, cy, 5, 220, 180, 255, 230)
}, [180, 120, 255])

sheet('explosion', 8, (rgba, w, h, f, n, fw, rgb, ox) => {
  const cx = ox + fw / 2
  const cy = h / 2
  const rad = 6 + f * 3.5
  const a = Math.max(40, 240 - f * 28)
  disc(rgba, w, cx, cy, rad, 255, 160, 40, a)
  disc(rgba, w, cx, cy, rad * 0.55, 255, 230, 120, Math.min(255, a + 40))
}, [255, 140, 40])

sheet('heal', 6, (rgba, w, h, f, n, fw, rgb, ox) => {
  const cx = ox + fw / 2
  const cy = h / 2 - f * 2
  disc(rgba, w, cx, cy, 10, 80, 230, 160, 100)
  for (let i = -6; i <= 6; i++) {
    setPx(rgba, w, cx + i, cy, 120, 255, 180, 220)
    setPx(rgba, w, cx, cy + i, 120, 255, 180, 220)
  }
}, [100, 255, 180])

sheet('buff', 6, (rgba, w, h, f, n, fw, rgb, ox) => {
  const cx = ox + fw / 2
  const cy = h / 2
  const rad = 12 + (f % 3) * 3
  for (let a = 0; a < Math.PI * 2; a += 0.15) {
    const x = Math.floor(cx + Math.cos(a + f * 0.4) * rad)
    const y = Math.floor(cy + Math.sin(a + f * 0.4) * rad)
    setPx(rgba, w, x, y, 96, 165, 250, 200)
  }
}, [96, 165, 250])

sheet('dash', 5, (rgba, w, h, f, n, fw, rgb, ox) => {
  for (let i = 0; i < 20; i++) {
    const x = ox + 8 + i * 2 + f
    const y = h / 2 + ((i + f) % 3) - 1
    setPx(rgba, w, x, y, 200, 180, 255, 180 - i * 6)
  }
}, [200, 180, 255])

sheet('smoke', 6, (rgba, w, h, f, n, fw, rgb, ox) => {
  const cx = ox + fw / 2
  const cy = h / 2
  disc(rgba, w, cx - 4, cy, 12 + f, 80, 80, 90, 100 - f * 10)
  disc(rgba, w, cx + 6, cy - 4, 10 + f, 70, 70, 80, 90 - f * 8)
}, [80, 80, 90])

sheet('lightning', 5, (rgba, w, h, f, n, fw, rgb, ox) => {
  let x = ox + fw / 2
  let y = 8
  for (let i = 0; i < 10; i++) {
    const nx = x + ((i + f) % 3) * 4 - 4
    const ny = y + 5
    for (let t = 0; t < 5; t++) {
      const px = Math.floor(x + (nx - x) * (t / 5))
      const py = Math.floor(y + (ny - y) * (t / 5))
      setPx(rgba, w, px, py, 200, 220, 255, 240)
      setPx(rgba, w, px + 1, py, 140, 180, 255, 180)
    }
    x = nx
    y = ny
  }
}, [180, 200, 255])

sheet('holy', 6, (rgba, w, h, f, n, fw, rgb, ox) => {
  const cx = ox + fw / 2
  const cy = h / 2
  disc(rgba, w, cx, cy, 8 + f, 255, 230, 120, 90)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + f * 0.2
    disc(rgba, w, cx + Math.cos(a) * 14, cy + Math.sin(a) * 14, 3, 255, 250, 200, 200)
  }
}, [255, 230, 140])

sheet('hex', 5, (rgba, w, h, f, n, fw, rgb, ox) => {
  const cx = ox + fw / 2
  const cy = h / 2
  disc(rgba, w, cx, cy, 9, 120, 40, 160, 160)
  disc(rgba, w, cx, cy, 4, 220, 80, 255, 230)
  for (let i = 0; i < 3; i++) {
    const a = f * 0.5 + i * 2
    setPx(rgba, w, Math.floor(cx + Math.cos(a) * 14), Math.floor(cy + Math.sin(a) * 10), 180, 60, 220, 200)
  }
}, [160, 60, 200])

function writeWav(name, samples, sampleRate = 22050) {
  const data = Buffer.alloc(samples.length * 2)
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]))
    data.writeInt16LE(Math.floor(v * 32767), i * 2)
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  fs.writeFileSync(path.join(sfxDir, `${name}.wav`), Buffer.concat([header, data]))
  console.log('sfx', name)
}

function tone(freq, dur, type = 'sine', vol = 0.35, sampleRate = 22050) {
  const n = Math.floor(sampleRate * dur)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate
    const env = Math.exp(-3 * t / dur) * (1 - i / n)
    let s = Math.sin(2 * Math.PI * freq * t)
    if (type === 'square') s = Math.sign(s)
    if (type === 'saw') s = 2 * ((freq * t) % 1) - 1
    if (type === 'triangle') s = 2 * Math.abs(2 * ((freq * t) % 1) - 1) - 1
    if (type === 'noise') s = Math.random() * 2 - 1
    out[i] = s * vol * env
  }
  return out
}

function mix(...parts) {
  let len = 0
  for (const p of parts) len = Math.max(len, p.length)
  const out = new Float32Array(len)
  for (const p of parts) {
    for (let i = 0; i < p.length; i++) out[i] += p[i]
  }
  return out
}

function concat(a, b, gap = 0) {
  const out = new Float32Array(a.length + gap + b.length)
  out.set(a, 0)
  out.set(b, a.length + gap)
  return out
}

writeWav('slash', tone(180, 0.12, 'saw', 0.28))
writeWav('arrow', mix(tone(880, 0.08, 'sine', 0.2), tone(440, 0.1, 'square', 0.08)))
writeWav('fireball_cast', mix(tone(120, 0.18, 'saw', 0.25), tone(90, 0.22, 'noise', 0.12)))
writeWav('explode', mix(tone(60, 0.35, 'noise', 0.4), tone(90, 0.25, 'saw', 0.2)))
writeWav('hit', tone(220, 0.07, 'square', 0.22))
writeWav('crit', concat(tone(523, 0.08, 'sine', 0.3), tone(784, 0.12, 'sine', 0.28)))
writeWav('heal', concat(tone(523, 0.1, 'sine', 0.22), tone(659, 0.14, 'sine', 0.2)))
writeWav('buff', concat(tone(392, 0.1, 'triangle', 0.2), tone(523, 0.14, 'triangle', 0.18)))
writeWav('dash', tone(300, 0.1, 'noise', 0.25))
writeWav('thunder', mix(tone(80, 0.4, 'noise', 0.45), tone(140, 0.2, 'saw', 0.2)))
writeWav('whoosh', tone(200, 0.15, 'noise', 0.2))
writeWav('holy', concat(tone(660, 0.1, 'sine', 0.2), tone(880, 0.14, 'sine', 0.18)))
writeWav('hex', mix(tone(100, 0.2, 'saw', 0.22), tone(70, 0.25, 'sine', 0.15)))
writeWav('kill', concat(tone(440, 0.08, 'saw', 0.25), tone(660, 0.12, 'triangle', 0.2)))
writeWav('coin', concat(tone(880, 0.05, 'triangle', 0.2), tone(1175, 0.08, 'triangle', 0.18)))
writeWav('levelup', concat(concat(tone(523, 0.08, 'sine', 0.22), tone(659, 0.08, 'sine', 0.2)), tone(784, 0.14, 'sine', 0.22)))
writeWav('death', tone(90, 0.4, 'saw', 0.3))

console.log('done')

'use client'

import React from 'react'
import type { AllocatedStats } from '@/store/gameStore'
import type { Potential } from '@/lib/classSystem'
import { ALLOC_STATS } from '@/lib/classSystem'

type Props = {
  alloc: AllocatedStats
  potential: Potential
  size?: number
}

const LABELS: Record<string, string> = {
  str: 'STR',
  dex: 'DEX',
  int: 'INT',
  vit: 'VIT',
  luk: 'LUK',
}

export default function RadarChart({ alloc, potential, size = 220 }: Props) {
  const cx = size / 2
  const cy = size / 2
  const maxR = size * 0.36
  const n = ALLOC_STATS.length

  const pointAt = (i: number, ratio: number) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return {
      x: cx + Math.cos(angle) * maxR * ratio,
      y: cy + Math.sin(angle) * maxR * ratio,
    }
  }

  const potPoly = ALLOC_STATS.map((_, i) => {
    const p = pointAt(i, 1)
    return `${p.x},${p.y}`
  }).join(' ')

  const allocPoly = ALLOC_STATS.map((stat, i) => {
    const cap = Math.max(1, potential[stat])
    const ratio = Math.min(1, alloc[stat] / cap)
    const p = pointAt(i, ratio)
    return `${p.x},${p.y}`
  }).join(' ')

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <polygon
          key={r}
          points={ALLOC_STATS.map((_, i) => {
            const p = pointAt(i, r)
            return `${p.x},${p.y}`
          }).join(' ')}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />
      ))}
      {ALLOC_STATS.map((_, i) => {
        const p = pointAt(i, 1)
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={1}
          />
        )
      })}
      <polygon points={potPoly} fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.35)" strokeWidth={1.5} />
      <polygon points={allocPoly} fill="rgba(52,211,153,0.35)" stroke="#34d399" strokeWidth={2} />
      {ALLOC_STATS.map((stat, i) => {
        const p = pointAt(i, 1.22)
        return (
          <text
            key={stat}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-white/60"
            style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em' }}
          >
            {LABELS[stat]}
          </text>
        )
      })}
    </svg>
  )
}

'use client'

import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useGameStore, type AllocatedStats } from '@/store/gameStore'
import { ALLOC_STATS, parsePotential } from '@/lib/classSystem'
import RadarChart from './RadarChart'

export default function LevelUpModal() {
  const { player, allocateStat, clearPendingLevelUps } = useGameStore()
  const show = player.pendingLevelUps > 0 && player.statPoints > 0

  useEffect(() => {
    if (player.pendingLevelUps > 0 && player.statPoints <= 0) {
      clearPendingLevelUps()
    }
  }, [player.pendingLevelUps, player.statPoints, clearPendingLevelUps])

  if (!show) return null

  const potential = parsePotential(player.jobs.main?.potential)

  const onAlloc = async (stat: keyof AllocatedStats) => {
    await allocateStat(stat)
    if (useGameStore.getState().player.statPoints <= 0) clearPendingLevelUps()
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-[min(92vw,420px)] rounded-2xl border border-emerald-500/30 bg-zinc-950 p-6 shadow-2xl"
      >
        <p className="text-[10px] font-bold tracking-[0.35em] text-emerald-400 uppercase mb-2">Level Up</p>
        <h3 className="text-2xl font-black italic text-white uppercase tracking-tight mb-1">
          Allocate Potential
        </h3>
        <p className="text-xs text-white/40 mb-4">
          Free points: <span className="text-emerald-300 font-mono font-bold">{player.statPoints}</span>
        </p>
        <RadarChart alloc={player.alloc} potential={potential} size={200} />
        <div className="mt-4 grid grid-cols-5 gap-2">
          {ALLOC_STATS.map((stat) => {
            const capped = player.alloc[stat] >= potential[stat]
            return (
              <button
                key={stat}
                disabled={capped || player.statPoints < 1}
                onClick={() => void onAlloc(stat)}
                className="rounded-lg border border-white/10 bg-white/5 py-2 text-[10px] font-black tracking-widest text-white uppercase disabled:opacity-30 hover:border-emerald-400/50 hover:bg-emerald-500/10"
              >
                {stat}
                <div className="font-mono text-emerald-300 mt-1">{player.alloc[stat]}/{potential[stat]}</div>
              </button>
            )
          })}
        </div>
        <button
          onClick={() => clearPendingLevelUps()}
          className="mt-5 w-full rounded-lg border border-white/10 py-2 text-[10px] font-bold tracking-[0.25em] text-white/50 uppercase hover:text-white"
        >
          Later
        </button>
      </motion.div>
    </div>
  )
}

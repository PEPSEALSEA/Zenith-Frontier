'use client'

import React from 'react'
import { useGameStore } from '@/store/gameStore'
import { motion } from 'framer-motion'
import {
    Shield,
    Sword,
    Wind,
    ChevronUp,
    Trophy,
    Activity
} from 'lucide-react'

const HUD = () => {
    const { player, world } = useGameStore()
    const { stats, jobs } = player

    const hpPercent = (stats.hp / stats.maxHp) * 100
    const mpPercent = (stats.mp / stats.maxMp) * 100
    const expPercent = (stats.exp / stats.maxExp) * 100

    return (
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6 z-10">
            {/* Top Left: Character Identity */}
            <div className="flex flex-col gap-2">
                <motion.div
                    initial={{ x: -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-center gap-4 animate-in fade-in duration-700"
                >
                    <div className="relative group pointer-events-auto cursor-pointer">
                        <motion.div
                            style={{ backgroundColor: player.appearance.color }}
                            className="h-16 w-16 rounded-full border-2 border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)] flex items-center justify-center text-3xl transition-all duration-300 group-hover:scale-105"
                        >
                            {player.appearance.face}
                            <div className="absolute inset-0 rounded-full border-2 border-white/5" />
                        </motion.div>
                        <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-black border border-black shadow-lg">
                            {stats.level}
                        </div>
                    </div>

                    <div className="flex flex-col drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-bold tracking-tight text-white uppercase">{player.name}</span>
                            <span className="text-xs font-medium text-emerald-400/80 uppercase tracking-[0.2em]">
                                {jobs.main?.name || 'Vagrant'}
                            </span>
                        </div>

                        {/* HP Bar */}
                        <div className="mt-1 h-3 w-64 rounded-sm bg-black/60 border border-white/10 backdrop-blur-sm relative overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                                initial={{ width: 0 }}
                                animate={{ width: `${hpPercent}%` }}
                                transition={{ duration: 1 }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold uppercase tracking-widest text-white mix-blend-difference">
                                HP {Math.ceil(stats.hp)} / {stats.maxHp}
                            </div>
                        </div>

                        {/* MP Bar */}
                        <div className="mt-1 h-2 w-48 rounded-sm bg-black/60 border border-white/10 backdrop-blur-sm relative overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-blue-600 to-cyan-400"
                                initial={{ width: 0 }}
                                animate={{ width: `${mpPercent}%` }}
                                transition={{ duration: 1.2 }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center text-[7px] font-bold uppercase tracking-widest text-white mix-blend-difference">
                                MP {Math.ceil(stats.mp)} / {stats.maxMp}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Bottom Center: Action Bars / EXP */}
            <div className="flex flex-col items-center gap-4">
                <div className="h-1 w-[600px] rounded-full bg-black/40 border border-white/5 relative overflow-hidden backdrop-blur-sm overflow-hidden">
                    <motion.div
                        className="h-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${expPercent}%` }}
                    />
                </div>
            </div>

            {/* Top Right: Status / World Icons */}
            <div className="absolute top-6 right-6 flex flex-col items-end gap-3">
                <div className="flex items-center gap-3">
                    <StatusIcon icon={Activity} label="VORPAL SOUL" value={player.hiddenParams.vorpalSoul} color="emerald" />
                    <StatusIcon icon={Trophy} label="TITLES" value={player.titles.length} color="amber" />
                </div>

                <div className="flex flex-col items-end">
                    <div className="text-[10px] uppercase tracking-[0.3em] font-medium text-white/50 mb-1">Mana Cycle</div>
                    <div className="flex gap-1">
                        {[...Array(8)].map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 w-4 rounded-full border border-white/10 ${i < Math.floor(world.manaCycle * 8) ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'bg-black/40'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Floating Combat Text / Mini Stats */}
            <div className="absolute left-6 bottom-32 flex flex-col gap-2">
                <StatRow icon={Sword} label="ATK" value={stats.atk} />
                <StatRow icon={Shield} label="DEF" value={stats.def} />
                <StatRow icon={Wind} label="SPD" value={stats.spd} />
            </div>

            <style jsx global>{`
        .glass-panel {
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>
        </div>
    )
}

const StatusIcon = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: any, color: 'emerald' | 'amber' | 'blue' | 'rose' }) => {
    const colorMap = {
        emerald: 'text-emerald-400 group-hover:text-emerald-300',
        amber: 'text-amber-400 group-hover:text-amber-300',
        blue: 'text-blue-400 group-hover:text-blue-300',
        rose: 'text-rose-400 group-hover:text-rose-300',
    }

    return (
        <div className="flex items-center gap-2 group cursor-default pointer-events-auto rounded-full bg-black/40 backdrop-blur-md px-3 py-1.5 border border-white/5 transition-colors hover:bg-white/5">
            <Icon className={`h-3 w-3 ${colorMap[color]}`} />
            <div className="flex flex-col">
                <span className="text-[7px] text-white/40 uppercase tracking-tighter leading-none">{label}</span>
                <span className="text-[10px] font-bold text-white leading-none">{value}</span>
            </div>
        </div>
    )
}

const StatRow = ({ icon: Icon, label, value }: { icon: any, label: string, value: number }) => (
    <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity duration-300 group">
        <div className="h-6 w-6 rounded bg-black/40 flex items-center justify-center border border-white/10 group-hover:border-emerald-500/30">
            <Icon className="h-3 w-3 text-emerald-500/70" />
        </div>
        <div className="flex flex-col -gap-1">
            <span className="text-[8px] font-bold text-white/40 group-hover:text-emerald-500/50">{label}</span>
            <span className="text-xs font-bold text-white group-hover:text-white leading-none">{value}</span>
        </div>
    </div>
)

export default HUD

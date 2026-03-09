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
    Activity,
    Coins,
    Ghost,
    Skull,
    Flame,
    Star,
    Crown,
    Swords,
    Target,
    Activity as HeartIcon,
    Shield as ShieldIcon,
    Zap,
    Moon
} from 'lucide-react'

import { FACES_MAP, FaceKey } from '@/store/gameStore'

const FaceIcon = ({ faceKey, className }: { faceKey: string, className?: string }) => {
    const Icon = FACES_MAP[faceKey as FaceKey] || Ghost
    return <Icon className={className} />
}

const HUD = () => {
    const { player, world } = useGameStore()
    const { stats, jobs } = player

    const hpPercent = (stats.hp / stats.maxHp) * 100
    const mpPercent = (stats.mp / stats.maxMp) * 100
    const expPercent = (stats.exp / stats.maxExp) * 100

    return (
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6 z-10">
            {/* Top Left: Character Identity & High-Performance HUD Bars */}
            <div className="flex flex-col gap-2">
                <motion.div
                    initial={{ x: -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-start gap-4 animate-in fade-in duration-700"
                >
                    <div className="relative group pointer-events-auto cursor-pointer">
                        <motion.div
                            style={{ backgroundColor: player.appearance.color }}
                            className="h-20 w-20 rounded-full border-2 border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.15)] flex items-center justify-center transition-all duration-300 group-hover:scale-105"
                        >
                            <FaceIcon faceKey={player.appearance.face} className="h-10 w-10 text-white drop-shadow-sm" />
                            <div className="absolute inset-0 rounded-full border-2 border-white/5" />
                        </motion.div>
                        <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-black border-2 border-black shadow-lg">
                            {stats.level}
                        </div>
                    </div>

                    <div className="flex flex-col drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] pt-1">
                        <div className="flex items-baseline gap-4 mb-2">
                            <span className="text-3xl font-black tracking-tighter text-white uppercase italic leading-none">{player.name}</span>
                            <span className="text-[11px] font-black text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded border border-cyan-500/30 uppercase tracking-[0.2em] shadow-inner">
                                {jobs.main?.name || 'Vagrant'}
                            </span>
                        </div>

                        {/* HP Bar - Vibrant Neon Red */}
                        <div className="group relative h-6 w-96 rounded-sm bg-black/80 border border-white/10 backdrop-blur-xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
                            <motion.div
                                className="h-full bg-gradient-to-r from-rose-700 via-rose-500 to-rose-400 relative"
                                initial={{ width: 0 }}
                                animate={{ width: `${hpPercent}%` }}
                                transition={{ duration: 0.8, ease: "circOut" }}
                            >
                                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.15)_50%,transparent_75%)] bg-[length:50px_50px] animate-[pulse_1.5s_infinite]" />
                                <div className="absolute top-0 left-0 w-full h-px bg-white/20" />
                            </motion.div>
                            <div className="absolute inset-0 flex items-center justify-between px-4 text-[11px] font-black uppercase tracking-tighter text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                <span className="flex items-center gap-1.5"><HeartIcon className="h-3 w-3 text-rose-300" /> Vitality</span>
                                <span className="font-mono">{Math.ceil(stats.hp)} / {stats.maxHp}</span>
                            </div>
                        </div>

                        {/* MP Bar - Vibrant Neon Blue/Cyan */}
                        <div className="group relative mt-2 h-4.5 w-72 rounded-sm bg-black/80 border border-white/10 backdrop-blur-xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
                            <motion.div
                                className="h-full bg-gradient-to-r from-blue-700 via-cyan-500 to-indigo-400 relative"
                                initial={{ width: 0 }}
                                animate={{ width: `${mpPercent}%` }}
                                transition={{ duration: 1, ease: "circOut" }}
                            >
                                <div className="absolute inset-0 bg-[linear-gradient(-45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:40px_40px]" />
                                <div className="absolute top-0 left-0 w-full h-px bg-white/10" />
                            </motion.div>
                            <div className="absolute inset-0 flex items-center justify-between px-4 text-[9px] font-black uppercase tracking-tighter text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                <span className="flex items-center gap-1.5"><Zap className="h-3 w-3 text-cyan-300" /> Arcanum</span>
                                <span className="font-mono">{Math.ceil(stats.mp)} / {stats.maxMp}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Top Right: Mana Cycle Floating Interface (Shifted to Top Right) */}
            <div className="absolute top-6 right-6 flex flex-col items-end gap-4">
                <div className="flex flex-col items-center gap-2 pointer-events-auto bg-black/60 backdrop-blur-2xl px-6 py-4 rounded-3xl border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.4)] ring-1 ring-white/5">
                    <div className="flex items-center gap-2.5 mb-1">
                        <Moon className="h-4 w-4 text-cyan-400 animate-pulse" />
                        <span className="text-[10px] uppercase tracking-[0.5em] font-black text-cyan-500/70">Mana Resonance</span>
                    </div>
                    <div className="flex gap-1.5">
                        {[...Array(12)].map((_, i) => (
                            <div
                                key={i}
                                className={`h-2.5 w-6 rounded-full border border-white/10 transition-all duration-1000 ${i < Math.floor(world.manaCycle * 12) ? 'bg-gradient-to-t from-cyan-600 to-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.5)] scale-110 border-cyan-400/50' : 'bg-white/5 opacity-10'}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Status Icons Row */}
                <div className="flex items-center gap-3">
                    <StatusIcon icon={Coins} label="GOLD" value={stats.money.toLocaleString()} color="amber" />
                    <StatusIcon icon={Activity} label="VORPAL" value={player.hiddenParams.vorpalSoul} color="emerald" />
                    <StatusIcon icon={Trophy} label="TITLE" value={player.titles.length} color="blue" />
                </div>
            </div>

            {/* Bottom Center: System EXP Progress */}
            <div className="flex flex-col items-center gap-4 mb-3">
                <div className="h-1.5 w-[600px] rounded-full bg-black/60 border border-white/5 relative overflow-hidden backdrop-blur-md">
                    <motion.div
                        className="h-full bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${expPercent}%` }}
                        transition={{ duration: 1.5, ease: "backOut" }}
                    />
                </div>
            </div>

            {/* Bottom Left: Static Combat Stats */}
            <div className="absolute left-6 bottom-32 flex flex-col gap-4 pointer-events-none">
                <StatRow icon={Sword} label="ATK" value={stats.atk} color="rose" />
                <StatRow icon={Shield} label="DEF" value={stats.def} color="blue" />
                <StatRow icon={Wind} label="SPD" value={stats.spd} color="emerald" />
            </div>

            <style jsx global>{`
                .hud-glass {
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(24px);
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
        <div className="flex items-center gap-3 group cursor-default pointer-events-auto rounded-full bg-black/70 backdrop-blur-xl px-5 py-2.5 border border-white/10 transition-all hover:bg-white/10 hover:scale-105 active:scale-95 shadow-xl ring-1 ring-white/5">
            <Icon className={`h-4.5 w-4.5 ${colorMap[color]} transition-transform group-hover:rotate-12`} />
            <div className="flex flex-col">
                <span className="text-[8px] text-white/30 uppercase tracking-[0.2em] font-black leading-none mb-1">{label}</span>
                <span className="text-sm font-black text-white leading-none tracking-tighter italic">{value}</span>
            </div>
        </div>
    )
}

const StatRow = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: number, color: string }) => {
    const colorClasses: any = {
        rose: 'text-rose-500 border-rose-500/20 bg-rose-500/5',
        blue: 'text-blue-500 border-blue-500/20 bg-blue-500/5',
        emerald: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5',
    }

    return (
        <div className="flex items-center gap-4 opacity-50 hover:opacity-100 transition-all duration-500 group cursor-default pointer-events-auto">
            <div className={`h-11 w-11 rounded-lg flex items-center justify-center border transition-all group-hover:scale-110 shadow-2xl ${colorClasses[color]}`}>
                <Icon className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-black text-white/30 group-hover:text-white/60 uppercase tracking-[0.3em]">{label}</span>
                <span className="text-xl font-black text-white group-hover:text-cyan-400 leading-none italic transition-colors drop-shadow-md">{value}</span>
            </div>
        </div>
    )
}

export default HUD

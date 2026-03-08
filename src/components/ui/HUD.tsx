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

import { FACES_MAP, FaceKey } from './CharacterCreator'

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
            {/* Top Left: Character Identity & Large Bars */}
            <div className="flex flex-col gap-2">
                <motion.div
                    initial={{ x: -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-start gap-4 animate-in fade-in duration-700"
                >
                    <div className="relative group pointer-events-auto cursor-pointer">
                        <motion.div
                            style={{ backgroundColor: player.appearance.color }}
                            className="h-20 w-20 rounded-full border-2 border-white/20 shadow-[0_0_25px_rgba(255,255,255,0.1)] flex items-center justify-center transition-all duration-300 group-hover:scale-105"
                        >
                            <FaceIcon faceKey={player.appearance.face} className="h-10 w-10 text-white drop-shadow-sm" />
                            <div className="absolute inset-0 rounded-full border-2 border-white/5" />
                        </motion.div>
                        <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-black border-2 border-black shadow-lg">
                            {stats.level}
                        </div>
                    </div>

                    <div className="flex flex-col drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] pt-1">
                        <div className="flex items-baseline gap-3 mb-1">
                            <span className="text-2xl font-black tracking-tighter text-white uppercase italic">{player.name}</span>
                            <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest">
                                {jobs.main?.name || 'Vagrant'}
                            </span>
                        </div>

                        {/* HP Bar - Large & Premium */}
                        <div className="group relative h-5 w-80 rounded-sm bg-black/80 border border-white/10 backdrop-blur-md overflow-hidden ring-1 ring-white/5">
                            <motion.div
                                className="h-full bg-gradient-to-r from-rose-600 via-rose-500 to-rose-400 relative"
                                initial={{ width: 0 }}
                                animate={{ width: `${hpPercent}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                            >
                                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:40px_40px] animate-[pulse_2s_infinite]" />
                            </motion.div>
                            <div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-black uppercase tracking-tighter text-white drop-shadow-md">
                                <span className="flex items-center gap-1"><HeartIcon className="h-2.5 w-2.5" /> Vitality</span>
                                <span>{Math.ceil(stats.hp)} / {stats.maxHp}</span>
                            </div>
                        </div>

                        {/* MP Bar - Large & Premium */}
                        <div className="group relative mt-1.5 h-4 w-64 rounded-sm bg-black/80 border border-white/10 backdrop-blur-md overflow-hidden ring-1 ring-white/5">
                            <motion.div
                                className="h-full bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-400 relative"
                                initial={{ width: 0 }}
                                animate={{ width: `${mpPercent}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            >
                                <div className="absolute inset-0 bg-[linear-gradient(-45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%)] bg-[length:30px_30px]" />
                            </motion.div>
                            <div className="absolute inset-0 flex items-center justify-between px-3 text-[8px] font-black uppercase tracking-tighter text-white drop-shadow-md">
                                <span className="flex items-center gap-1"><Zap className="h-2.5 w-2.5" /> Arcanum</span>
                                <span>{Math.ceil(stats.mp)} / {stats.maxMp}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Top Center: Mana Cycle (Avoid Overlap) */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-auto bg-black/60 backdrop-blur-xl px-8 py-4 rounded-3xl border border-white/10 shadow-2xl">
                <div className="flex items-center gap-2 mb-1">
                    <Moon className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                    <span className="text-[10px] uppercase tracking-[0.4em] font-black text-white/50">Mana Cycle Resonance</span>
                </div>
                <div className="flex gap-2">
                    {[...Array(12)].map((_, i) => (
                        <div
                            key={i}
                            className={`h-2.5 w-6 rounded-full border border-white/10 transition-all duration-700 ${i < Math.floor(world.manaCycle * 12) ? 'bg-gradient-to-t from-cyan-600 to-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.5)] scale-110 border-cyan-400/50' : 'bg-white/5 opacity-20 shadow-inner'}`}
                        />
                    ))}
                </div>
            </div>

            {/* Top Right: Status Icons */}
            <div className="absolute top-6 right-24 flex items-center gap-3">
                <StatusIcon icon={Coins} label="GOLD" value={stats.money.toLocaleString()} color="amber" />
                <StatusIcon icon={Activity} label="VORPAL" value={player.hiddenParams.vorpalSoul} color="emerald" />
                <StatusIcon icon={Trophy} label="TITLE" value={player.titles.length} color="blue" />
            </div>

            {/* Bottom Center: Action Bars / EXP */}
            <div className="flex flex-col items-center gap-4 mb-4">
                <div className="h-1.5 w-[600px] rounded-full bg-black/60 border border-white/10 relative overflow-hidden backdrop-blur-sm">
                    <motion.div
                        className="h-full bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${expPercent}%` }}
                        transition={{ duration: 1.5, ease: "circOut" }}
                    />
                </div>
            </div>

            {/* Floating Combat Stats */}
            <div className="absolute left-6 bottom-32 flex flex-col gap-3">
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
        <div className="flex items-center gap-2 group cursor-default pointer-events-auto rounded-full bg-black/60 backdrop-blur-md px-4 py-2 border border-white/10 transition-all hover:bg-white/10 hover:scale-105 active:scale-95 shadow-lg">
            <Icon className={`h-4 w-4 ${colorMap[color]}`} />
            <div className="flex flex-col">
                <span className="text-[7px] text-white/40 uppercase tracking-widest leading-none mb-0.5">{label}</span>
                <span className="text-sm font-black text-white leading-none tracking-tighter">{value}</span>
            </div>
        </div>
    )
}

const StatRow = ({ icon: Icon, label, value }: { icon: any, label: string, value: number }) => (
    <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-all duration-300 group cursor-default">
        <div className="h-10 w-10 rounded-lg bg-black/60 flex items-center justify-center border border-white/10 group-hover:border-emerald-500/50 group-hover:scale-110 shadow-lg">
            <Icon className="h-5 w-5 text-emerald-500/70" />
        </div>
        <div className="flex flex-col">
            <span className="text-[9px] font-black text-white/40 group-hover:text-emerald-500/50 uppercase tracking-widest">{label}</span>
            <span className="text-lg font-black text-white group-hover:text-white leading-none italic">{value}</span>
        </div>
    </div>
)

export default HUD

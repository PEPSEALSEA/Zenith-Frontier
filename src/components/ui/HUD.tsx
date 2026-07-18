'use client'

import React, { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { motion } from 'framer-motion'
import ProfileDropdown from '@/components/ui/ProfileDropdown'
import {
    Shield,
    Sword,
    Wind,
    Trophy,
    Activity,
    Coins,
    Ghost,
    Activity as HeartIcon,
    Zap,
    Moon
} from 'lucide-react'

import { FACES_MAP, FaceKey } from '@/store/gameStore'

const FaceIcon = ({ faceKey, className }: { faceKey: string, className?: string }) => {
    const Icon = FACES_MAP[faceKey as FaceKey] || Ghost
    return <Icon className={className} />
}

const HUD = () => {
    const { player, world, auth } = useGameStore()
    const { stats, jobs, skillSlots, skillCatalog, skillCooldowns, statPoints } = player
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [, setTick] = useState(0)

    React.useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 200)
        return () => clearInterval(id)
    }, [])

    const hpPercent = (stats.hp / stats.maxHp) * 100
    const mpPercent = (stats.mp / stats.maxMp) * 100
    const expPercent = (stats.exp / stats.maxExp) * 100
    const now = Date.now()

    return (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-6 font-sans">
            <div className="flex flex-col gap-2">
                <motion.div
                    initial={{ x: -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-start gap-4"
                >
                    <div
                        className="relative group pointer-events-auto cursor-pointer"
                        onClick={() => setIsProfileOpen(prev => !prev)}
                    >
                        <motion.div
                            style={{ backgroundColor: player.appearance.color }}
                            className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all duration-300 group-hover:scale-105 group-hover:border-white/50"
                        >
                            <FaceIcon faceKey={player.appearance.face} className="h-10 w-10 text-white drop-shadow-sm" />
                            <div className="absolute inset-0 rounded-full border-2 border-white/5" />
                        </motion.div>
                        <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-black bg-emerald-500 font-display text-xs font-bold text-black shadow-lg">
                            {stats.level}
                        </div>
                        {auth.user?.picture && (
                            <div className="absolute -top-1 -right-1 h-6 w-6 overflow-hidden rounded-full border-2 border-black shadow-lg">
                                <img src={auth.user.picture} alt="" className="h-full w-full object-cover" />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col pt-1 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                        <div className="mb-2 flex items-baseline gap-3">
                            <span className="font-display text-3xl font-bold uppercase leading-none tracking-tight text-white">
                                {player.name}
                            </span>
                            <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-300">
                                {jobs.main?.name || 'Vagrant'}
                            </span>
                        </div>

                        <div className="relative h-6 w-96 overflow-hidden rounded-sm border border-white/10 bg-black/80 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
                            <motion.div
                                className="relative h-full bg-gradient-to-r from-rose-700 via-rose-500 to-rose-400"
                                initial={{ width: 0 }}
                                animate={{ width: `${hpPercent}%` }}
                                transition={{ duration: 0.8, ease: "circOut" }}
                            >
                                <div className="absolute inset-0 animate-[pulse_1.5s_infinite] bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.15)_50%,transparent_75%)] bg-[length:50px_50px]" />
                                <div className="absolute left-0 top-0 h-px w-full bg-white/20" />
                            </motion.div>
                            <div className="absolute inset-0 flex items-center justify-between px-4 text-[11px] uppercase tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                <span className="flex items-center gap-1.5 font-semibold">
                                    <HeartIcon className="h-3 w-3 text-rose-300" /> Vitality
                                </span>
                                <span className="font-mono text-[11px] tabular-nums">{Math.ceil(stats.hp)} / {stats.maxHp}</span>
                            </div>
                        </div>

                        <div className="relative mt-2 h-4.5 w-72 overflow-hidden rounded-sm border border-white/10 bg-black/80 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
                            <motion.div
                                className="relative h-full bg-gradient-to-r from-blue-700 via-cyan-500 to-indigo-400"
                                initial={{ width: 0 }}
                                animate={{ width: `${mpPercent}%` }}
                                transition={{ duration: 1, ease: "circOut" }}
                            >
                                <div className="absolute inset-0 bg-[linear-gradient(-45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:40px_40px]" />
                                <div className="absolute left-0 top-0 h-px w-full bg-white/10" />
                            </motion.div>
                            <div className="absolute inset-0 flex items-center justify-between px-4 text-[9px] uppercase tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                <span className="flex items-center gap-1.5 font-semibold">
                                    <Zap className="h-3 w-3 text-cyan-300" /> Arcanum
                                </span>
                                <span className="font-mono text-[10px] tabular-nums">{Math.ceil(stats.mp)} / {stats.maxMp}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            <div className="absolute right-20 top-6 flex flex-col items-end gap-3">
                <div className="pointer-events-auto flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-black/60 px-5 py-3 shadow-[0_20px_40px_rgba(0,0,0,0.4)] ring-1 ring-white/5 backdrop-blur-2xl">
                    <div className="mb-0.5 flex items-center gap-2">
                        <Moon className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-400/80">Mana Resonance</span>
                    </div>
                    <div className="flex gap-1.5">
                        {[...Array(12)].map((_, i) => (
                            <div
                                key={i}
                                className={`h-2 w-5 rounded-full border border-white/10 transition-all duration-1000 ${i < Math.floor(world.manaCycle * 12) ? 'scale-110 border-cyan-400/50 bg-gradient-to-t from-cyan-600 to-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.45)]' : 'bg-white/5 opacity-15'}`}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <StatusIcon icon={Coins} label="GOLD" value={stats.money.toLocaleString()} color="amber" />
                    <StatusIcon icon={Activity} label="VORPAL" value={player.hiddenParams.vorpalSoul} color="emerald" />
                    <StatusIcon icon={Trophy} label="TITLE" value={player.titles.length} color="blue" />
                </div>
            </div>

            <div className="mb-3 flex flex-col items-center gap-3">
                {statPoints > 0 && (
                    <div className="pointer-events-none rounded-full border border-emerald-500/40 bg-emerald-500/15 px-4 py-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                        Level Up — {statPoints} points to allocate
                    </div>
                )}
                <div className="pointer-events-none flex items-end gap-2.5">
                    {([1, 2, 3, 4] as const).map((slot) => {
                        const id = skillSlots[slot - 1]
                        const sk = skillCatalog.find((s) => s.skill_id === id)
                        const cdUntil = id ? (skillCooldowns[id] || 0) : 0
                        const onCd = now < cdUntil
                        const cdPct = onCd && sk ? Math.max(0, (cdUntil - now) / sk.cooldown_ms) : 0
                        return (
                            <div
                                key={slot}
                                className="relative flex h-14 w-14 flex-col items-center justify-center overflow-hidden rounded-lg border border-white/20 bg-black/75 shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-white/5 backdrop-blur-md"
                            >
                                {onCd && (
                                    <div
                                        className="absolute inset-0 origin-bottom bg-black/75"
                                        style={{ transform: `scaleY(${cdPct})` }}
                                    />
                                )}
                                <span className="relative font-mono text-[10px] tabular-nums text-white/50">{slot}</span>
                                <span className="relative w-12 truncate text-center text-[8px] font-semibold uppercase leading-tight tracking-wide text-white/90">
                                    {sk?.skill_name?.slice(0, 8) || '—'}
                                </span>
                            </div>
                        )
                    })}
                </div>
                <div className="relative h-1.5 w-[600px] overflow-hidden rounded-full border border-white/5 bg-black/60 backdrop-blur-md">
                    <motion.div
                        className="h-full bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${expPercent}%` }}
                        transition={{ duration: 1.5, ease: "backOut" }}
                    />
                </div>
            </div>

            <div className="pointer-events-none absolute bottom-32 left-6 flex flex-col gap-3">
                <StatRow icon={Sword} label="ATK" value={stats.atk} color="rose" />
                <StatRow icon={Shield} label="DEF" value={stats.def} color="blue" />
                <StatRow icon={Wind} label="SPD" value={stats.spd} color="emerald" />
            </div>

            <ProfileDropdown isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
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
        <div className="group pointer-events-auto flex cursor-default items-center gap-2.5 rounded-xl border border-white/10 bg-black/70 px-4 py-2 shadow-xl ring-1 ring-white/5 backdrop-blur-xl transition-all hover:scale-[1.03] hover:bg-white/10 active:scale-95">
            <Icon className={`h-4 w-4 ${colorMap[color]} transition-transform group-hover:rotate-12`} />
            <div className="flex flex-col">
                <span className="mb-0.5 text-[8px] font-semibold uppercase leading-none tracking-[0.16em] text-white/40">{label}</span>
                <span className="font-mono text-sm font-semibold leading-none tabular-nums tracking-tight text-white">{value}</span>
            </div>
        </div>
    )
}

const StatRow = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: number, color: string }) => {
    const colorClasses: Record<string, string> = {
        rose: 'text-rose-400 border-rose-500/25 bg-rose-500/10',
        blue: 'text-blue-400 border-blue-500/25 bg-blue-500/10',
        emerald: 'text-emerald-400 border-emerald-500/25 bg-emerald-500/10',
    }

    return (
        <div className="group pointer-events-auto flex cursor-default items-center gap-3 opacity-80 transition-all duration-300 hover:opacity-100">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg border shadow-lg transition-transform group-hover:scale-110 ${colorClasses[color]}`}>
                <Icon className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col">
                <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45 group-hover:text-white/70">{label}</span>
                <span className="font-display text-xl font-bold leading-none tabular-nums text-white transition-colors group-hover:text-cyan-300">
                    {value}
                </span>
            </div>
        </div>
    )
}

export default HUD

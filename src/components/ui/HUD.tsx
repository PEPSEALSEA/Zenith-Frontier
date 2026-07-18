'use client'

import React, { useEffect, useState } from 'react'
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
    Heart,
    Zap,
    Moon
} from 'lucide-react'

import { FACES_MAP, FaceKey } from '@/store/gameStore'

const FaceIcon = ({ faceKey, className }: { faceKey: string, className?: string }) => {
    const Icon = FACES_MAP[faceKey as FaceKey] || Ghost
    return <Icon className={className} />
}

function useLaggingPercent(target: number, lagMs = 380) {
    const [fill, setFill] = useState(target)
    const [ghost, setGhost] = useState(target)
    const ghostRef = React.useRef(target)

    useEffect(() => {
        setFill(target)
        if (target >= ghostRef.current) {
            ghostRef.current = target
            setGhost(target)
            return
        }
        const id = window.setTimeout(() => {
            ghostRef.current = target
            setGhost(target)
        }, lagMs)
        return () => window.clearTimeout(id)
    }, [target, lagMs])

    return { fill, ghost }
}

const HUD = () => {
    const { player, world, auth } = useGameStore()
    const { stats, jobs, skillSlots, skillCatalog, skillCooldowns, itemSlots, inventory, equipmentCatalog, itemCooldowns, statPoints } = player
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [, setTick] = useState(0)

    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 100)
        return () => clearInterval(id)
    }, [])

    const hpPercent = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100))
    const mpPercent = Math.max(0, Math.min(100, (stats.mp / stats.maxMp) * 100))
    const expPercent = Math.max(0, Math.min(100, (stats.exp / stats.maxExp) * 100))
    const hp = useLaggingPercent(hpPercent)
    const mp = useLaggingPercent(mpPercent, 280)
    const now = Date.now()

    return (
        <div className="pointer-events-none absolute inset-0 z-10 font-sans">
            <motion.div
                initial={{ x: -24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                className="absolute left-4 top-4 flex items-start gap-3"
            >
                <div
                    className="group relative pointer-events-auto cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation()
                        setIsProfileOpen((prev) => !prev)
                    }}
                >
                    <div className="rpg-panel rpg-panel-gold animate-soft-bob rounded-2xl p-1.5">
                        <motion.div
                            style={{ backgroundColor: player.appearance.color }}
                            className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/15 transition-transform duration-200 group-hover:scale-[1.03]"
                        >
                            <FaceIcon faceKey={player.appearance.face} className="h-8 w-8 text-white drop-shadow" />
                        </motion.div>
                    </div>
                    <div className="absolute -bottom-1.5 -right-1.5 flex h-6 min-w-6 items-center justify-center rounded-md border border-emerald-300/40 bg-emerald-500 px-1.5 font-display text-[11px] font-bold text-black shadow-md">
                        {stats.level}
                    </div>
                    {auth.user?.picture && (
                        <div className="absolute -right-1 -top-1 h-5 w-5 overflow-hidden rounded-md border border-black/80 shadow">
                            <img src={auth.user.picture} alt="" className="h-full w-full object-cover" />
                        </div>
                    )}
                </div>

                <div className="rpg-panel rpg-panel-gold rounded-2xl px-4 py-3">
                    <div className="mb-2.5 flex items-center gap-2.5">
                        <span className="font-display text-xl font-bold leading-none tracking-tight text-white">
                            {player.name}
                        </span>
                        <span className="rounded-md border border-cyan-400/25 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-cyan-200/90">
                            {jobs.main?.name || 'Vagrant'}
                        </span>
                    </div>

                    <div className="space-y-2">
                        <RpgBar
                            label="HP"
                            icon={<Heart className="h-3 w-3 text-rose-300" />}
                            value={`${Math.ceil(stats.hp)} / ${stats.maxHp}`}
                            fill={hp.fill}
                            ghost={hp.ghost}
                            fillClass="from-rose-800 via-rose-500 to-rose-300"
                            ghostClass="bg-rose-300/35"
                            widthClass="w-72"
                            heightClass="h-5"
                        />
                        <RpgBar
                            label="MP"
                            icon={<Zap className="h-3 w-3 text-sky-300" />}
                            value={`${Math.ceil(stats.mp)} / ${stats.maxMp}`}
                            fill={mp.fill}
                            ghost={mp.ghost}
                            fillClass="from-sky-800 via-cyan-500 to-sky-300"
                            ghostClass="bg-cyan-300/30"
                            widthClass="w-56"
                            heightClass="h-3.5"
                            textSize="text-[9px]"
                        />
                    </div>
                </div>
            </motion.div>

            <motion.div
                initial={{ y: -16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 240, damping: 26, delay: 0.05 }}
                className="absolute right-20 top-4 flex flex-col items-end gap-2"
            >
                <div className="rpg-panel rounded-xl px-3.5 py-2.5">
                    <div className="mb-1.5 flex items-center justify-center gap-1.5">
                        <Moon className="h-3 w-3 text-cyan-300/80" />
                        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-200/70">Mana</span>
                    </div>
                    <div className="flex gap-1">
                        {[...Array(12)].map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 w-3.5 rounded-sm transition-all duration-500 ${
                                    i < Math.floor(world.manaCycle * 12)
                                        ? 'bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.45)]'
                                        : 'bg-white/10'
                                }`}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    <StatusChip icon={Coins} label="Gold" value={stats.money.toLocaleString()} tone="amber" />
                    <StatusChip icon={Activity} label="Vorpal" value={player.hiddenParams.vorpalSoul} tone="emerald" />
                    <StatusChip icon={Trophy} label="Title" value={player.titles.length} tone="sky" />
                </div>
            </motion.div>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 26, delay: 0.08 }}
                className="absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
            >
                {statPoints > 0 && (
                    <div className="rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-3 py-1 font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                        +{statPoints} stat points
                    </div>
                )}

                <div className="relative rpg-panel rpg-panel-gold flex items-end gap-1.5 rounded-2xl px-3 py-2.5">
                    <p className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] uppercase tracking-wider text-white/40">
                        Aim with mouse · Tab lock · 1–4 skills
                    </p>
                    {([1, 2, 3, 4] as const).map((slot) => {
                        const id = skillSlots[slot - 1]
                        const sk = skillCatalog.find((s) => s.skill_id === id)
                        const cdUntil = id ? (skillCooldowns[id] || 0) : 0
                        const onCd = now < cdUntil
                        const cdLeftMs = onCd ? cdUntil - now : 0
                        const cdPct = onCd && sk ? Math.max(0, Math.min(1, cdLeftMs / sk.cooldown_ms)) : 0
                        const cdSec = cdLeftMs / 1000
                        const cdLabel = cdSec >= 10 ? String(Math.ceil(cdSec)) : cdSec.toFixed(1)
                        return (
                            <div
                                key={slot}
                                className="relative flex h-12 w-12 flex-col items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-black/45"
                                title={sk ? `${sk.skill_name} — ${sk.description || sk.effect}` : 'Empty'}
                            >
                                {onCd && (
                                    <>
                                        <div
                                            className="pointer-events-none absolute inset-0 bg-slate-950/70"
                                            style={{
                                                clipPath: `inset(0 0 ${100 - cdPct * 100}% 0)`,
                                            }}
                                        />
                                        <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center font-mono text-sm font-bold tabular-nums text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                                            {cdLabel}
                                        </span>
                                    </>
                                )}
                                <span className={`absolute left-1 top-0.5 font-mono text-[9px] tabular-nums ${onCd ? 'text-amber-200/40' : 'text-amber-200/70'}`}>
                                    {slot}
                                </span>
                                <span className={`relative mt-1 w-11 truncate text-center text-[8px] font-semibold uppercase leading-tight tracking-wide ${onCd ? 'text-white/35' : 'text-white/90'}`}>
                                    {sk?.skill_name?.slice(0, 7) || '—'}
                                </span>
                            </div>
                        )
                    })}
                    <div className="mx-0.5 h-10 w-px bg-white/10" />
                    {([1, 2] as const).map((slot) => {
                        const id = itemSlots[slot - 1]
                        const inv = inventory.find((i) => i.item_id === id)
                        const def = equipmentCatalog.find((e) => e.item_id === id)
                        const key = slot === 1 ? 'Z' : 'X'
                        const cdUntil = id ? (itemCooldowns[id] || 0) : 0
                        const onCd = now < cdUntil
                        const label = def?.item_name || inv?.name || '—'
                        return (
                            <div
                                key={`item-${slot}`}
                                className="relative flex h-12 w-12 flex-col items-center justify-center overflow-hidden rounded-xl border border-amber-300/25 bg-amber-500/10"
                            >
                                {onCd && <div className="absolute inset-0 bg-slate-950/60" />}
                                <span className="absolute left-1 top-0.5 font-mono text-[9px] text-amber-200/80">{key}</span>
                                <span className="relative mt-1 w-11 truncate text-center text-[8px] font-semibold leading-tight text-white/90">
                                    {id ? label.slice(0, 7) : '—'}
                                </span>
                                {inv && (
                                    <span className="absolute bottom-0.5 right-1 font-mono text-[8px] text-emerald-300">
                                        ×{inv.quantity}
                                    </span>
                                )}
                            </div>
                        )
                    })}
                </div>

                <div className="w-80">
                    <div className="mb-1 flex items-baseline justify-between gap-3 px-0.5">
                        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-amber-200/65">
                            Exp
                        </span>
                        <span className="font-mono text-[10px] font-semibold tabular-nums tracking-tight text-amber-50/90">
                            {Math.floor(stats.exp).toLocaleString()}
                            <span className="mx-1 text-white/30">/</span>
                            {Math.floor(stats.maxExp).toLocaleString()}
                        </span>
                    </div>
                    <div className="rpg-bar-track relative h-1.5 overflow-hidden rounded-full">
                        <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-amber-700 via-amber-400 to-yellow-200"
                            animate={{ width: `${expPercent}%` }}
                            transition={{ type: 'spring', stiffness: 120, damping: 22 }}
                        />
                    </div>
                </div>
            </motion.div>

            <motion.div
                initial={{ x: -16, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 240, damping: 28, delay: 0.1 }}
                className="absolute bottom-28 left-4 flex flex-col gap-1.5"
            >
                <StatPill icon={Sword} label="ATK" value={stats.atk} tone="rose" />
                <StatPill icon={Shield} label="DEF" value={stats.def} tone="sky" />
                <StatPill icon={Wind} label="SPD" value={stats.spd} tone="emerald" />
            </motion.div>

            <ProfileDropdown isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
        </div>
    )
}

function RpgBar({
    label,
    icon,
    value,
    fill,
    ghost,
    fillClass,
    ghostClass,
    widthClass,
    heightClass,
    textSize = 'text-[10px]',
}: {
    label: string
    icon: React.ReactNode
    value: string
    fill: number
    ghost: number
    fillClass: string
    ghostClass: string
    widthClass: string
    heightClass: string
    textSize?: string
}) {
    return (
        <div className={`rpg-bar-track relative ${heightClass} ${widthClass} rounded-md`}>
            <motion.div
                className={`absolute inset-y-0 left-0 ${ghostClass}`}
                animate={{ width: `${ghost}%` }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
            />
            <motion.div
                className={`rpg-bar-sheen absolute inset-y-0 left-0 bg-gradient-to-r ${fillClass}`}
                animate={{ width: `${fill}%` }}
                transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            />
            <div className={`absolute inset-0 flex items-center justify-between px-2.5 ${textSize} font-semibold uppercase tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]`}>
                <span className="flex items-center gap-1">{icon}{label}</span>
                <span className="font-mono tabular-nums normal-case tracking-normal">{value}</span>
            </div>
        </div>
    )
}

function StatusChip({
    icon: Icon,
    label,
    value,
    tone,
}: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: string | number
    tone: 'amber' | 'emerald' | 'sky'
}) {
    const tones = {
        amber: 'text-amber-300',
        emerald: 'text-emerald-300',
        sky: 'text-sky-300',
    }
    return (
        <div className="rpg-panel pointer-events-auto flex items-center gap-2 rounded-lg px-2.5 py-1.5">
            <Icon className={`h-3.5 w-3.5 ${tones[tone]}`} />
            <div className="flex flex-col">
                <span className="text-[7px] font-semibold uppercase tracking-[0.14em] text-white/35">{label}</span>
                <span className="font-mono text-[12px] font-semibold leading-none tabular-nums text-white">{value}</span>
            </div>
        </div>
    )
}

function StatPill({
    icon: Icon,
    label,
    value,
    tone,
}: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: number
    tone: 'rose' | 'sky' | 'emerald'
}) {
    const tones = {
        rose: 'text-rose-300 border-rose-400/20 bg-rose-500/10',
        sky: 'text-sky-300 border-sky-400/20 bg-sky-500/10',
        emerald: 'text-emerald-300 border-emerald-400/20 bg-emerald-500/10',
    }
    return (
        <div className="rpg-panel flex items-center gap-2 rounded-lg px-2 py-1.5">
            <div className={`flex h-7 w-7 items-center justify-center rounded-md border ${tones[tone]}`}>
                <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex min-w-10 flex-col">
                <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-white/40">{label}</span>
                <span className="font-display text-base font-bold leading-none tabular-nums text-white">{value}</span>
            </div>
        </div>
    )
}

export default HUD

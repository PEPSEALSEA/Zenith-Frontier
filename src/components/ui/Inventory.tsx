'use client'

import React, { useEffect, useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Backpack,
    Settings,
    Users,
    LayoutGrid,
    Zap,
    Sword,
    Shield,
    X,
    Sparkles,
    Coins,
} from 'lucide-react'
import AdminPortal from './AdminPortal'
import RadarChart from './RadarChart'
import { ALLOC_STATS, masteryExpToNext, parsePotential } from '@/lib/classSystem'
import type { AllocatedStats } from '@/store/gameStore'
import { FACES_MAP, FaceKey } from '@/store/gameStore'
import { Ghost } from 'lucide-react'
import { isConsumableType, isSkillScrollType } from '@/lib/items'

type TabId = 'character' | 'bag' | 'skills' | 'job' | 'arcanum' | 'admin'

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; adminOnly?: boolean }[] = [
    { id: 'character', label: 'Character', icon: Sword },
    { id: 'bag', label: 'Bag', icon: Backpack },
    { id: 'skills', label: 'Skills', icon: Zap },
    { id: 'job', label: 'Job', icon: Users },
    { id: 'arcanum', label: 'Arcanum', icon: Sparkles },
    { id: 'admin', label: 'Admin', icon: Settings, adminOnly: true },
]

const Inventory = () => {
    const [isOpen, setIsOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<TabId>('character')
    const { player, gainExp, takeDamage, auth, isEditorMode, setEditorMode, refreshSkills } = useGameStore()
    const isAdmin = auth.user?.email === 'sealseapep@gmail.com'
    const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin)

    useEffect(() => {
        if (isOpen && (activeTab === 'skills' || activeTab === 'job')) {
            void refreshSkills()
        }
    }, [isOpen, activeTab, refreshSkills])

    useEffect(() => {
        if (!isOpen) return
        const onKey = (e: KeyboardEvent) => {
            if (e.code === 'Escape') setIsOpen(false)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [isOpen])

    return (
        <>
            <div className="pointer-events-auto absolute right-6 top-6 z-20">
                <button
                    type="button"
                    onClick={() => setIsOpen((v) => !v)}
                    aria-label={isOpen ? 'Close menu' : 'Open menu'}
                    className="rpg-panel flex h-12 w-12 items-center justify-center rounded-xl border-emerald-400/30 transition hover:border-emerald-300/50"
                >
                    {isOpen ? <X className="h-5 w-5 text-emerald-300" /> : <LayoutGrid className="h-5 w-5 text-emerald-300" />}
                </button>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm sm:p-6"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setIsOpen(false)
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 16, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 12, scale: 0.98 }}
                            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                            className="rpg-panel rpg-panel-gold flex h-[min(88vh,820px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl"
                        >
                            <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/70">Menu</p>
                                    <h2 className="truncate font-display text-xl font-bold text-white sm:text-2xl">
                                        {player.name}
                                        <span className="ml-2 font-sans text-sm font-medium text-white/40">
                                            Lv.{player.stats.level} · {player.jobs.main?.name || 'Vagrant'}
                                        </span>
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="rpg-panel hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:flex">
                                        <Coins className="h-3.5 w-3.5 text-amber-300" />
                                        <span className="font-mono text-sm font-semibold tabular-nums text-amber-100">
                                            {player.stats.money.toLocaleString()} G
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                        className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/5 hover:text-white"
                                    >
                                        Close <span className="text-white/35">Esc</span>
                                    </button>
                                </div>
                            </header>

                            <nav className="flex gap-1 overflow-x-auto border-b border-white/10 px-2 py-2 sm:px-4">
                                {visibleTabs.map((tab) => {
                                    const Icon = tab.icon
                                    const active = activeTab === tab.id
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                                                active
                                                    ? 'bg-amber-400/15 text-amber-100 ring-1 ring-amber-300/35'
                                                    : 'text-white/45 hover:bg-white/5 hover:text-white/80'
                                            }`}
                                        >
                                            <Icon className="h-4 w-4" />
                                            {tab.label}
                                        </button>
                                    )
                                })}
                            </nav>

                            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                                {activeTab === 'character' && <CharacterPanel />}
                                {activeTab === 'bag' && <BagPanel />}
                                {activeTab === 'skills' && <SkillsPanel />}
                                {activeTab === 'job' && <JobPanel />}
                                {activeTab === 'arcanum' && <ArcanumPanel />}
                                {activeTab === 'admin' && isAdmin && (
                                    <AdminPanel
                                        isEditorMode={isEditorMode}
                                        setEditorMode={setEditorMode}
                                        gainExp={gainExp}
                                        takeDamage={takeDamage}
                                        onCloseMenu={() => setIsOpen(false)}
                                    />
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}

function FaceIcon({ faceKey, className }: { faceKey: string; className?: string }) {
    const Icon = FACES_MAP[faceKey as FaceKey] || Ghost
    return <Icon className={className} />
}

function CharacterPanel() {
    const { player, allocateStat } = useGameStore()
    const potential = parsePotential(player.jobs.main?.potential)
    const maxStat = (k: keyof AllocatedStats) => Math.max(potential[k], 1)
    const hpPct = Math.round((player.stats.hp / player.stats.maxHp) * 100)
    const mpPct = Math.round((player.stats.mp / player.stats.maxMp) * 100)
    const expPct = Math.round((player.stats.exp / player.stats.maxExp) * 100)

    return (
        <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
            <section className="space-y-4">
                <div className="rpg-panel flex items-center gap-4 rounded-xl p-4">
                    <div
                        className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/15"
                        style={{ backgroundColor: player.appearance.color }}
                    >
                        <FaceIcon faceKey={player.appearance.face} className="h-8 w-8 text-white" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                        <MiniBar label="HP" value={`${Math.ceil(player.stats.hp)}/${player.stats.maxHp}`} pct={hpPct} color="bg-rose-500" />
                        <MiniBar label="MP" value={`${Math.ceil(player.stats.mp)}/${player.stats.maxMp}`} pct={mpPct} color="bg-sky-400" />
                        <MiniBar label="EXP" value={`${player.stats.exp}/${player.stats.maxExp}`} pct={expPct} color="bg-amber-400" />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <StatBox label="ATK" value={player.stats.atk} />
                    <StatBox label="DEF" value={player.stats.def} />
                    <StatBox label="SPD" value={player.stats.spd} />
                </div>

                <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Equipment</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <EquipSlot icon={Sword} title="Weapon" hint="Empty" />
                        <EquipSlot icon={Shield} title="Armor" hint="Empty" />
                    </div>
                </div>
            </section>

            <section className="rpg-panel rounded-xl p-4">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-display text-lg font-bold text-white">Allocate Stats</h3>
                    <span className={`rounded-md px-2 py-1 font-mono text-xs font-semibold ${player.statPoints > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-white/40'}`}>
                        {player.statPoints} points
                    </span>
                </div>
                <div className="mb-4 flex justify-center">
                    <RadarChart alloc={player.alloc} potential={potential} size={180} />
                </div>
                <div className="space-y-2">
                    {ALLOC_STATS.map((stat) => {
                        const cur = player.alloc[stat]
                        const max = maxStat(stat)
                        const locked = player.statPoints < 1 || cur >= potential[stat]
                        return (
                            <div key={stat} className="flex items-center gap-2 rounded-lg bg-black/25 px-2.5 py-2">
                                <div className="w-10 text-xs font-bold uppercase text-white/55">{stat}</div>
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/50">
                                    <div
                                        className="h-full rounded-full bg-emerald-400/80"
                                        style={{ width: `${Math.min(100, (cur / max) * 100)}%` }}
                                    />
                                </div>
                                <div className="w-12 text-right font-mono text-xs tabular-nums text-white/70">
                                    {cur}/{potential[stat]}
                                </div>
                                <button
                                    type="button"
                                    disabled={locked}
                                    onClick={() => void allocateStat(stat)}
                                    className="flex h-8 w-8 items-center justify-center rounded-md border border-emerald-400/35 text-emerald-300 transition enabled:hover:bg-emerald-500/15 disabled:opacity-25"
                                >
                                    +
                                </button>
                            </div>
                        )
                    })}
                </div>
                {player.statPoints < 1 && (
                    <p className="mt-3 text-center text-[11px] text-white/35">Level up to earn more stat points.</p>
                )}
            </section>
        </div>
    )
}

function BagPanel() {
    const { player, useItem, setItemSlot } = useGameStore()
    const items = player.inventory
    const [selectedId, setSelectedId] = useState<string | null>(null)

    const selected = items.find((i) => i.item_id === selectedId) || null
    const selectedDef = selected
        ? player.equipmentCatalog.find((e) => e.item_id === selected.item_id)
        : null
    const canUse = selected
        ? isConsumableType(selectedDef?.item_type || (selected.item_id === 'EQ_004' ? 'consumable' : ''))
            || isSkillScrollType(selectedDef?.item_type || (selected.item_id.startsWith('EQ_SCR_') ? 'skill_scroll' : ''))
        : false
    const canQuick = selected
        ? isConsumableType(selectedDef?.item_type || (selected.item_id === 'EQ_004' ? 'consumable' : ''))
        : false

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h3 className="font-display text-lg font-bold text-white">Bag</h3>
                    <p className="text-xs text-white/40">
                        {items.length} items · Select an item to use or assign to Z / X
                    </p>
                </div>
                <div className="flex gap-2">
                    {([1, 2] as const).map((slot) => {
                        const id = player.itemSlots[slot - 1]
                        const inv = player.inventory.find((i) => i.item_id === id)
                        const def = player.equipmentCatalog.find((e) => e.item_id === id)
                        const key = slot === 1 ? 'Z' : 'X'
                        return (
                            <div key={slot} className="rpg-panel min-w-[88px] rounded-xl px-2.5 py-2 text-center">
                                <div className="font-mono text-[10px] text-amber-200/70">{key}</div>
                                <div className="truncate text-[11px] font-semibold text-white">
                                    {def?.item_name || inv?.name || (id ? id : 'Empty')}
                                </div>
                                <div className="font-mono text-[10px] text-white/40">
                                    {inv ? `×${inv.quantity}` : '—'}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {selected && (
                <div className="rpg-panel flex flex-wrap items-center gap-2 rounded-xl p-3">
                    <div className="min-w-0 flex-1">
                        <div className="font-display text-sm font-bold text-white">
                            {selectedDef?.item_name || selected.name || selected.item_id}
                        </div>
                        <div className="text-xs text-white/45">
                            {selectedDef?.description || selectedDef?.item_type || 'Item'} · ×{selected.quantity}
                        </div>
                    </div>
                    {canUse && (
                        <button
                            type="button"
                            onClick={() => void useItem(selected.item_id)}
                            className="rounded-lg bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/30 hover:bg-emerald-500/30"
                        >
                            Use
                        </button>
                    )}
                    {canQuick && (
                        <>
                            <button
                                type="button"
                                onClick={() => setItemSlot(1, selected.item_id)}
                                className="rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-100 ring-1 ring-amber-400/30 hover:bg-amber-500/25"
                            >
                                Set Z
                            </button>
                            <button
                                type="button"
                                onClick={() => setItemSlot(2, selected.item_id)}
                                className="rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-100 ring-1 ring-amber-400/30 hover:bg-amber-500/25"
                            >
                                Set X
                            </button>
                        </>
                    )}
                    {player.itemSlots[0] === selected.item_id && (
                        <button type="button" onClick={() => setItemSlot(1, '')} className="text-xs text-white/40 hover:text-white/70">
                            Clear Z
                        </button>
                    )}
                    {player.itemSlots[1] === selected.item_id && (
                        <button type="button" onClick={() => setItemSlot(2, '')} className="text-xs text-white/40 hover:text-white/70">
                            Clear X
                        </button>
                    )}
                </div>
            )}

            {items.length === 0 ? (
                <div className="rpg-panel flex flex-col items-center justify-center rounded-xl px-6 py-16 text-center">
                    <Backpack className="mb-3 h-10 w-10 text-white/20" />
                    <p className="font-display text-base font-semibold text-white/70">Bag is empty</p>
                    <p className="mt-1 max-w-xs text-sm text-white/35">Buy potions in Star Mart or defeat critters in Whisperwood.</p>
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
                    {items.map((item, i) => {
                        const def = player.equipmentCatalog.find((e) => e.item_id === item.item_id)
                        const active = selectedId === item.item_id
                        const onZ = player.itemSlots[0] === item.item_id
                        const onX = player.itemSlots[1] === item.item_id
                        return (
                            <button
                                key={`${item.item_id}-${i}`}
                                type="button"
                                title={def?.item_name || item.name || item.item_id}
                                onClick={() => setSelectedId(item.item_id)}
                                className={`relative flex aspect-square flex-col items-center justify-center rounded-xl border p-2 text-left transition ${
                                    active
                                        ? 'border-amber-300/50 bg-amber-500/15'
                                        : 'border-amber-300/20 bg-amber-500/5 hover:border-amber-300/40'
                                }`}
                            >
                                <Zap className="mb-1 h-5 w-5 text-amber-300/90" />
                                <span className="line-clamp-2 w-full text-center text-[9px] font-semibold leading-tight text-white/80">
                                    {def?.item_name || item.name || item.item_id}
                                </span>
                                <span className="absolute bottom-1 right-1.5 font-mono text-[10px] text-emerald-300">
                                    ×{item.quantity}
                                </span>
                                {(onZ || onX) && (
                                    <span className="absolute left-1 top-1 rounded bg-black/60 px-1 font-mono text-[8px] text-amber-200">
                                        {onZ ? 'Z' : ''}{onZ && onX ? '/' : ''}{onX ? 'X' : ''}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function SkillsPanel() {
    const { player, setSkillSlot, unlockSkill, useSkillScroll } = useGameStore()
    const [selectedSlot, setSelectedSlot] = useState<1 | 2 | 3 | 4>(1)
    const jobId = player.jobs.main?.id
    const jobSkills = player.skillCatalog.filter(
        (s) => !jobId || s.job_id === jobId || player.ownedSkillIds.includes(s.skill_id),
    )
    const scrolls = player.inventory.filter((i) => i.item_id.startsWith('EQ_SCR_'))

    const unlockHint = (s: (typeof jobSkills)[0]) => {
        if (s.unlock_type === 'mastery') return `Need Mastery ${s.unlock_value}`
        if (s.unlock_type === 'gold') return `Cost ${s.unlock_value} G`
        if (s.unlock_type === 'scroll') return 'Needs scroll'
        if (s.unlock_type === 'level') return `Need Lv ${s.unlock_value}`
        return 'Starter'
    }

    const unlockBlockReason = (s: (typeof jobSkills)[0]): string | null => {
        if (s.parent_skill_id && !player.ownedSkillIds.includes(s.parent_skill_id)) {
            const parent = player.skillCatalog.find((p) => p.skill_id === s.parent_skill_id)
            return `Need ${parent?.skill_name || s.parent_skill_id} first`
        }
        if (s.unlock_type === 'mastery' && player.jobMastery < (Number(s.unlock_value) || 1)) {
            return `Need Mastery ${s.unlock_value}`
        }
        if (s.unlock_type === 'level' && player.stats.level < (Number(s.unlock_value) || 1)) {
            return `Need Lv ${s.unlock_value}`
        }
        if (s.unlock_type === 'gold' && player.stats.money < (Number(s.unlock_value) || 0)) {
            return `Need ${s.unlock_value} G`
        }
        return null
    }

    return (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <aside className="space-y-3">
                <div>
                    <h3 className="font-display text-lg font-bold text-white">Hotbar</h3>
                    <p className="text-xs text-white/40">Pick a slot, then equip a skill.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {([1, 2, 3, 4] as const).map((slot) => {
                        const id = player.skillSlots[slot - 1]
                        const sk = player.skillCatalog.find((s) => s.skill_id === id)
                        const selected = selectedSlot === slot
                        return (
                            <button
                                key={slot}
                                type="button"
                                onClick={() => setSelectedSlot(slot)}
                                className={`rounded-xl border p-3 text-left transition ${
                                    selected
                                        ? 'border-amber-300/40 bg-amber-400/10'
                                        : 'border-white/10 bg-black/25 hover:border-white/20'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-[10px] text-white/40">Key {slot}</span>
                                    {id && (
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                void setSkillSlot(slot, '')
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.stopPropagation()
                                                    void setSkillSlot(slot, '')
                                                }
                                            }}
                                            className="text-[10px] font-semibold text-rose-300/80 hover:text-rose-200"
                                        >
                                            Clear
                                        </span>
                                    )}
                                </div>
                                <div className="mt-1 truncate font-display text-sm font-semibold text-white">
                                    {sk?.skill_name || 'Empty'}
                                </div>
                                {sk && (
                                    <div className="mt-0.5 text-[10px] text-cyan-300/70">
                                        MP {sk.mp_cost} · {sk.skill_type}
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>
                {scrolls.length > 0 && (
                    <div className="space-y-2 pt-2">
                        <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-300/80">Scrolls</h4>
                        {scrolls.map((sc) => (
                            <button
                                key={sc.item_id}
                                type="button"
                                onClick={() => void useSkillScroll(sc.item_id)}
                                className="w-full rounded-lg border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-left text-xs text-violet-100 transition hover:bg-violet-500/20"
                            >
                                Use {sc.name || sc.item_id} ×{sc.quantity}
                            </button>
                        ))}
                    </div>
                )}
            </aside>

            <section>
                <div className="mb-3 flex items-end justify-between gap-2">
                    <div>
                        <h3 className="font-display text-lg font-bold text-white">Skill list</h3>
                        <p className="text-xs text-white/40">
                            Equipping into slot <span className="font-mono text-amber-200">{selectedSlot}</span>
                        </p>
                    </div>
                </div>
                <div className="space-y-2">
                    {jobSkills.length === 0 && (
                        <div className="rpg-panel rounded-xl px-4 py-10 text-center text-sm text-white/40">
                            No skills for this job yet.
                        </div>
                    )}
                    {jobSkills.map((s) => {
                        const owned = player.ownedSkillIds.includes(s.skill_id)
                        const block = !owned ? unlockBlockReason(s) : null
                        const buyLabel = s.unlock_type === 'gold'
                            ? `Buy ${s.unlock_value} G`
                            : 'Unlock'
                        return (
                            <div
                                key={s.skill_id}
                                className="flex flex-col gap-3 rounded-xl border border-white/8 bg-black/25 p-3 sm:flex-row sm:items-center"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="font-display text-sm font-bold text-white">{s.skill_name}</h4>
                                        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/35">
                                            {s.skill_type}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs leading-relaxed text-white/45">{s.description}</p>
                                    <p className="mt-1 font-mono text-[10px] text-white/30">
                                        MP {s.mp_cost} · CD {(s.cooldown_ms / 1000).toFixed(1)}s · {unlockHint(s)}
                                    </p>
                                    {block && (
                                        <p className="mt-1 text-[10px] text-amber-200/70">{block}</p>
                                    )}
                                </div>
                                {owned ? (
                                    <button
                                        type="button"
                                        onClick={() => void setSkillSlot(selectedSlot, s.skill_id)}
                                        className="shrink-0 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/25"
                                    >
                                        Equip to {selectedSlot}
                                    </button>
                                ) : s.unlock_type === 'scroll' ? (
                                    <span className="shrink-0 text-xs text-violet-300/70">Needs scroll</span>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={!!block}
                                        onClick={() => void unlockSkill(s.skill_id)}
                                        className="shrink-0 rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/30 transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-amber-500/15"
                                    >
                                        {buyLabel}
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>
            </section>
        </div>
    )
}

function JobPanel() {
    const { player, promoteJob } = useGameStore()
    const potential = parsePotential(player.jobs.main?.potential)
    const masteryNeed = masteryExpToNext(player.jobMastery)
    const masteryPct = Math.min(100, (player.jobMasteryExp / masteryNeed) * 100)

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <section className="rpg-panel space-y-4 rounded-xl p-5">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300/70">Current job</p>
                    <h3 className="mt-1 font-display text-2xl font-bold text-white">
                        {player.jobs.main?.name || 'Trainee'}
                    </h3>
                    <p className="mt-1 text-sm text-white/45">Character level {player.stats.level}</p>
                </div>
                <div>
                    <div className="mb-1 flex justify-between text-xs text-white/45">
                        <span>Job mastery {player.jobMastery}</span>
                        <span className="font-mono">
                            {player.jobMasteryExp}/{masteryNeed}
                        </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-black/45">
                        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${masteryPct}%` }} />
                    </div>
                </div>
                <div className="rounded-lg border border-white/8 bg-black/25 p-3 text-xs leading-relaxed text-white/50">
                    Promotions need Warrior + Level 20 + Mastery 5.
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => void promoteJob('JOB_006')}
                        className="rounded-xl border border-sky-400/25 bg-sky-500/10 py-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/20"
                    >
                        → Knight
                    </button>
                    <button
                        type="button"
                        onClick={() => void promoteJob('JOB_007')}
                        className="rounded-xl border border-rose-400/25 bg-rose-500/10 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20"
                    >
                        → Berserker
                    </button>
                </div>
            </section>

            <section className="rpg-panel flex flex-col items-center rounded-xl p-5">
                <h3 className="mb-2 self-start font-display text-lg font-bold text-white">Class potential</h3>
                <RadarChart alloc={player.alloc} potential={potential} size={220} />
                <p className="mt-2 text-center text-xs text-white/40">
                    Free points:{' '}
                    <span className="font-mono text-emerald-300">{player.statPoints}</span>
                    {' · '}Allocate on the Character tab
                </p>
            </section>
        </div>
    )
}

function ArcanumPanel() {
    const cards = [
        { name: 'The Fool', description: 'Increased luck and unpredictable skill activation.', reverse: false },
        { name: 'The Empress', description: 'Natural mana regeneration increased.', reverse: true },
        { name: 'Death', description: 'Skills have a chance to inflict Oblivion.', reverse: false },
    ]

    return (
        <div className="space-y-4">
            <div>
                <h3 className="font-display text-lg font-bold text-white">Arcanum cards</h3>
                <p className="text-xs text-white/40">Passive tarot-style bonuses. Collection expands later.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((c) => (
                    <div
                        key={c.name}
                        className={`rounded-xl border p-4 ${
                            c.reverse
                                ? 'border-rose-400/30 bg-rose-500/5'
                                : 'border-emerald-400/25 bg-emerald-500/5'
                        }`}
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <Sparkles className={`h-5 w-5 ${c.reverse ? 'text-rose-300' : 'text-emerald-300'}`} />
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${c.reverse ? 'text-rose-300/80' : 'text-emerald-300/80'}`}>
                                {c.reverse ? 'Reversal' : 'Upright'}
                            </span>
                        </div>
                        <h4 className="font-display text-xl font-bold text-white">{c.name}</h4>
                        <p className="mt-2 text-sm leading-relaxed text-white/50">{c.description}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

function AdminPanel({
    isEditorMode,
    setEditorMode,
    gainExp,
    takeDamage,
    onCloseMenu,
}: {
    isEditorMode: boolean
    setEditorMode: (v: boolean) => void
    gainExp: (n: number) => void
    takeDamage: (n: number) => void
    onCloseMenu: () => void
}) {
    return (
        <div className="space-y-4">
            <div>
                <h3 className="font-display text-lg font-bold text-white">Admin tools</h3>
                <p className="text-xs text-white/40">Debug and forge controls — players never see this tab.</p>
            </div>
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => gainExp(50)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10"
                >
                    +50 EXP
                </button>
                <button
                    type="button"
                    onClick={() => takeDamage(10)}
                    className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/20"
                >
                    −10 HP
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setEditorMode(!isEditorMode)
                        onCloseMenu()
                    }}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                        isEditorMode
                            ? 'bg-amber-400 text-stone-900'
                            : 'border border-amber-400/30 bg-amber-500/10 text-amber-100'
                    }`}
                >
                    {isEditorMode ? 'Exit map editor' : 'Open map editor'}
                </button>
            </div>
            <AdminPortal />
        </div>
    )
}

function MiniBar({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
    return (
        <div>
            <div className="mb-0.5 flex justify-between text-[10px]">
                <span className="font-semibold text-white/50">{label}</span>
                <span className="font-mono tabular-nums text-white/70">{value}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/50">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
            </div>
        </div>
    )
}

function StatBox({ label, value }: { label: string; value: number }) {
    return (
        <div className="rpg-panel rounded-xl px-3 py-2.5 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">{label}</div>
            <div className="font-display text-xl font-bold tabular-nums text-white">{value}</div>
        </div>
    )
}

function EquipSlot({
    icon: Icon,
    title,
    hint,
}: {
    icon: React.ComponentType<{ className?: string }>
    title: string
    hint: string
}) {
    return (
        <div className="flex h-28 flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/20">
            <Icon className="mb-1 h-7 w-7 text-white/20" />
            <div className="text-xs font-semibold text-white/55">{title}</div>
            <div className="text-[10px] text-white/30">{hint}</div>
        </div>
    )
}

export default Inventory

'use client'

import React, { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Backpack,
    Settings,
    Users,
    LayoutGrid,
    Scroll,
    Zap,
    Sword,
    Shield,
    Search,
    X,
    Plus
} from 'lucide-react'
import AdminPortal from './AdminPortal'
import RadarChart from './RadarChart'
import { ALLOC_STATS, masteryExpToNext, parsePotential } from '@/lib/classSystem'
import type { AllocatedStats } from '@/store/gameStore'

const Inventory = () => {
    const [isOpen, setIsOpen] = useState(false)
    const [activeTab, setActiveTab] = useState('EQUIPMENT')
    const { player, gainExp, takeDamage, auth, isEditorMode, setEditorMode, refreshSkills } = useGameStore()
    const isAdmin = auth.user?.email === 'sealseapep@gmail.com'

    const tabs = ['EQUIPMENT', 'JOB SYSTEM', 'SKILLS', 'INVENTORY', 'WORLD BOOK', 'ARCANUM']
    if (isAdmin) tabs.push('ADMIN')

    React.useEffect(() => {
        if (isOpen && (activeTab === 'SKILLS' || activeTab === 'JOB SYSTEM')) {
            void refreshSkills()
        }
    }, [isOpen, activeTab, refreshSkills])

    return (
        <>
            {/* Menu Toggle Button */}
            <div className="absolute top-6 right-6 z-20 pointer-events-auto">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-emerald-500/30 bg-black/60 backdrop-blur-md transition-all duration-300 hover:border-emerald-400 hover:bg-emerald-500/10 group overflow-hidden"
                >
                    <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                    >
                        {isOpen ? <X className="h-6 w-6 text-emerald-400" /> : <LayoutGrid className="h-6 w-6 text-emerald-400" />}
                    </motion.div>
                    <div className="absolute inset-0 bg-emerald-500 opacity-0 group-active:opacity-20 transition-opacity" />
                </button>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.98, x: 20 }}
                        className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-md"
                    >
                        <div className="relative flex h-[85vh] w-[95vw] sm:w-[80vw] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)]">
                            {/* Sidebar Navigation */}
                            <div className="flex w-24 flex-col border-r border-white/5 bg-black/40 p-4 gap-6">
                                <NavIcon icon={Backpack} active={activeTab === 'INVENTORY'} onClick={() => setActiveTab('INVENTORY')} />
                                <NavIcon icon={Sword} active={activeTab === 'EQUIPMENT'} onClick={() => setActiveTab('EQUIPMENT')} />
                                <NavIcon icon={Users} active={activeTab === 'JOB SYSTEM'} onClick={() => setActiveTab('JOB SYSTEM')} />
                                <NavIcon icon={Zap} active={activeTab === 'SKILLS'} onClick={() => setActiveTab('SKILLS')} />
                                <NavIcon icon={Scroll} active={activeTab === 'WORLD BOOK'} onClick={() => setActiveTab('WORLD BOOK')} />
                                <NavIcon icon={LayoutGrid} active={activeTab === 'ARCANUM'} onClick={() => setActiveTab('ARCANUM')} />
                                {isAdmin && <NavIcon icon={Settings} active={activeTab === 'ADMIN'} onClick={() => setActiveTab('ADMIN')} />}
                            </div>

                            {/* Main Content Area */}
                            <div className="flex-1 flex flex-col">
                                {/* Header */}
                                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold tracking-[0.4em] text-emerald-500/80 mb-1">SYSTEM OVERLAY</span>
                                        <h2 className="text-3xl font-black tracking-tighter text-white italic uppercase">{activeTab}</h2>
                                    </div>

                                    {/* Search Bar Placeholder */}
                                    <div className="relative h-10 w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                                        <input
                                            type="text"
                                            placeholder="SEARCH ENTRIES..."
                                            className="h-full w-full rounded-full border border-white/5 bg-black/40 pl-10 pr-4 text-xs font-mono tracking-widest text-emerald-100 placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50"
                                        />
                                    </div>
                                </div>

                                {/* Content Render Grid */}
                                <div className="flex-1 overflow-y-auto p-8 overflow-hidden">
                                    {activeTab === 'INVENTORY' && <InventoryGrid />}
                                    {activeTab === 'JOB SYSTEM' && <JobSystemView />}
                                    {activeTab === 'SKILLS' && <SkillsView />}
                                    {activeTab === 'EQUIPMENT' && <EquipmentGrid />}
                                    {activeTab === 'ARCANUM' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            <ArcanumCard name="THE FOOL" description="Increased luck and unpredictable skill activation." reverse={false} />
                                            <ArcanumCard name="THE EMPRESS" description="Natural mana regeneration increased +500%." reverse={true} />
                                            <ArcanumCard name="DEATH" description="Skills have a chance to inflict 'Oblivion'." reverse={false} />
                                        </div>
                                    )}
                                    {activeTab === 'ADMIN' && <AdminPortal />}
                                </div>

                                {/* Footer Controls */}
                                <div className="p-6 border-t border-white/5 bg-black/40 flex items-center justify-end gap-4">
                                    {auth.user?.email === 'sealseapep@gmail.com' && (
                                        <>
                                            <button
                                                onClick={() => gainExp(50)}
                                                className="px-6 py-2 rounded border border-white/10 bg-zinc-900 text-[10px] font-bold tracking-widest text-white/60 hover:bg-zinc-800 hover:text-white transition-all uppercase"
                                            >
                                                Gain EXP (DEBUG)
                                            </button>
                                            <button
                                                onClick={() => takeDamage(10)}
                                                className="px-6 py-2 rounded border border-white/10 bg-zinc-900 text-[10px] font-bold tracking-widest text-white/60 hover:bg-zinc-800 hover:text-rose-500 hover:border-rose-500/30 transition-all uppercase"
                                            >
                                                Take DMG (DEBUG)
                                            </button>
                                        </>
                                    )}
                                    {isAdmin && (
                                        <button
                                            onClick={() => setEditorMode(!isEditorMode)}
                                            className={`px-8 py-2 rounded border font-bold tracking-widest transition-all uppercase text-[10px] ${isEditorMode ? 'border-amber-500 bg-amber-500 text-black' : 'border-amber-500/50 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black'}`}
                                        >
                                            {isEditorMode ? 'EXIT EDITOR' : 'MAP EDITOR'}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="px-8 py-2 rounded border border-emerald-500/50 bg-emerald-500/10 text-[10px] font-bold tracking-widest text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all uppercase"
                                    >
                                        CLOSE INTERFACE
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}

const NavIcon = ({ icon: Icon, active, onClick }: { icon: any, active: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`flex h-12 w-12 items-center justify-center rounded-xl border border-white/5 transition-all duration-300 relative group overflow-hidden ${active ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-transparent text-white/40 hover:bg-white/5 hover:text-white/80'}`}
    >
        <Icon className="h-5 w-5" />
        {active && <motion.div layoutId="nav-glow" className="absolute inset-0 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.3)]" />}
    </button>
)

const InventoryGrid = () => {
    const { player } = useGameStore()
    const items = player.inventory
    const slots = Math.max(24, items.length)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 px-6 py-4">
                <span className="text-[10px] font-black tracking-[0.3em] text-amber-400 uppercase">Purse</span>
                <span className="text-2xl font-black italic text-amber-300">{player.stats.money} G</span>
            </div>
            <div className="grid grid-cols-6 gap-4">
                {[...Array(slots)].map((_, i) => {
                    const item = items[i]
                    return (
                        <div
                            key={item ? `${item.item_id}-${i}` : `empty-${i}`}
                            className="aspect-square rounded-lg bg-black/40 border border-white/5 transition-all duration-300 hover:border-emerald-500/40 hover:bg-emerald-500/5 cursor-pointer group flex flex-col items-center justify-center p-2 relative overflow-hidden"
                            title={item?.name || item?.item_id}
                        >
                            {item ? (
                                <>
                                    <Zap className="h-6 w-6 text-amber-500/80 transition-transform group-hover:scale-110 mb-1" />
                                    <span className="text-[8px] font-bold text-white/70 text-center leading-tight uppercase tracking-wide truncate w-full px-1">
                                        {item.name || item.item_id}
                                    </span>
                                    <span className="absolute bottom-1 right-1 text-[9px] font-mono text-emerald-400">x{item.quantity}</span>
                                </>
                            ) : (
                                <Plus className="h-4 w-4 text-white/10 group-hover:text-white/40" />
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

const EquipmentGrid = () => {
    const { player, allocateStat } = useGameStore()
    const potential = parsePotential(player.jobs.main?.potential)
    const maxStat = (k: keyof AllocatedStats) => Math.max(potential[k], 1)

    return (
    <div className="grid grid-cols-4 gap-8">
        <div className="col-span-2 space-y-6">
            <label className="text-[10px] font-bold tracking-[0.3em] text-white/30 uppercase">Primary Armament</label>
            <div className="h-48 rounded-xl border-2 border-dashed border-white/5 bg-white/[0.02] flex items-center justify-center relative group group-hover:bg-white/[0.04] transition-all cursor-pointer">
                <Sword className="h-12 w-12 text-white/10 transition-all group-hover:scale-110 group-hover:text-emerald-500/20" />
                <div className="absolute bottom-4 text-[10px] font-mono tracking-widest text-white/20 italic">EMPTY_SLOT_01</div>
            </div>

            <label className="text-[10px] font-bold tracking-[0.3em] text-white/30 uppercase block mt-12">Armor Plating</label>
            <div className="h-48 rounded-xl border-2 border-dashed border-white/5 bg-white/[0.02] flex items-center justify-center relative group group-hover:bg-white/[0.04] transition-all cursor-pointer">
                <Shield className="h-12 w-12 text-white/10 transition-all group-hover:scale-110 group-hover:text-emerald-500/20" />
                <div className="absolute bottom-4 text-[10px] font-mono tracking-widest text-white/20 italic">EMPTY_SLOT_02</div>
            </div>
        </div>

        <div className="col-span-2 bg-black/40 rounded-xl p-8 border border-white/5">
            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                <h4 className="text-xl font-black italic tracking-tight text-white/80 uppercase">Potential</h4>
                <span className="text-[10px] font-mono text-emerald-400">PTS {player.statPoints}</span>
            </div>
            <RadarChart alloc={player.alloc} potential={potential} size={200} />
            <div className="space-y-3 mt-4">
                {ALLOC_STATS.map((stat) => (
                    <div key={stat} className="flex items-center gap-2">
                        <div className="flex-1">
                            <AffineStat
                                label={stat.toUpperCase()}
                                value={Math.round((player.alloc[stat] / maxStat(stat)) * 100)}
                                color={stat === 'str' ? 'amber' : stat === 'dex' ? 'emerald' : stat === 'int' ? 'blue' : 'cyan'}
                            />
                        </div>
                        <button
                            disabled={player.statPoints < 1 || player.alloc[stat] >= potential[stat]}
                            onClick={() => void allocateStat(stat)}
                            className="h-8 w-8 rounded border border-white/10 text-emerald-400 disabled:opacity-20 hover:bg-emerald-500/10"
                        >
                            +
                        </button>
                    </div>
                ))}
            </div>
        </div>
    </div>
    )
}

const AffineStat = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-1">
            <span className="text-[9px] font-bold tracking-widest text-white/40">{label}</span>
            <span className="text-[10px] font-mono font-bold text-white">{value}%</span>
        </div>
        <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, value)}%` }}
                className={`h-full rounded-full ${color === 'emerald' ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-500' : color === 'blue' ? 'bg-blue-500' : 'bg-cyan-500'}`}
            />
        </div>
    </div>
)

const JobSystemView = () => {
    const { player, promoteJob } = useGameStore()
    const potential = parsePotential(player.jobs.main?.potential)
    const masteryNeed = masteryExpToNext(player.jobMastery)
    const masteryPct = Math.min(100, (player.jobMasteryExp / masteryNeed) * 100)

    return (
        <div className="grid grid-cols-2 gap-8 h-full">
            <div className="flex flex-col gap-4">
                <label className="text-[10px] font-bold tracking-[0.3em] text-emerald-500 uppercase">Main Occupation</label>
                <div className="p-8 rounded-2xl bg-gradient-to-br from-emerald-600/20 to-zinc-950 border border-emerald-500/30 flex flex-col items-center justify-center gap-4 relative overflow-hidden">
                    <Zap className="h-16 w-16 text-emerald-400 opacity-60 mb-2" />
                    <h3 className="text-2xl font-black tracking-tighter text-white uppercase italic">{player.jobs.main?.name || 'TRAINEE'}</h3>
                    <span className="text-[10px] font-bold tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full uppercase">
                        CHAR LVL {player.stats.level}
                    </span>
                    <div className="w-full mt-2">
                        <div className="flex justify-between text-[9px] font-bold tracking-widest text-white/40 uppercase mb-1">
                            <span>Job Mastery {player.jobMastery}</span>
                            <span>{player.jobMasteryExp}/{masteryNeed}</span>
                        </div>
                        <div className="h-2 rounded-full bg-black/50 overflow-hidden">
                            <div className="h-full bg-emerald-400" style={{ width: `${masteryPct}%` }} />
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/10 rounded-full blur-3xl -mr-12 -mt-12" />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => void promoteJob('JOB_006')}
                        className="flex-1 rounded-lg border border-white/10 py-3 text-[9px] font-black tracking-widest text-cyan-300 uppercase hover:bg-cyan-500/10"
                    >
                        Promote Knight
                    </button>
                    <button
                        onClick={() => void promoteJob('JOB_007')}
                        className="flex-1 rounded-lg border border-white/10 py-3 text-[9px] font-black tracking-widest text-rose-300 uppercase hover:bg-rose-500/10"
                    >
                        Promote Berserker
                    </button>
                </div>
                <p className="text-[9px] text-white/30 tracking-wide">Promotions require Warrior + Lv20 + Mastery 5</p>
            </div>

            <div className="flex flex-col gap-4">
                <label className="text-[10px] font-bold tracking-[0.3em] text-cyan-500 uppercase">Class Potential</label>
                <div className="p-6 rounded-2xl bg-black/40 border border-white/5 flex flex-col items-center">
                    <RadarChart alloc={player.alloc} potential={potential} size={240} />
                    <p className="text-[10px] text-white/40 mt-2 text-center">
                        Free points: <span className="text-emerald-300 font-mono">{player.statPoints}</span>
                    </p>
                </div>
            </div>
        </div>
    )
}

const SkillsView = () => {
    const { player, setSkillSlot, unlockSkill, useSkillScroll } = useGameStore()
    const [selectedSlot, setSelectedSlot] = useState<1 | 2 | 3 | 4>(1)
    const jobId = player.jobs.main?.id
    const jobSkills = player.skillCatalog.filter((s) => !jobId || s.job_id === jobId || player.ownedSkillIds.includes(s.skill_id))
    const scrolls = player.inventory.filter((i) => i.item_id.startsWith('EQ_SCR_'))

    const unlockHint = (s: typeof jobSkills[0]) => {
        if (s.unlock_type === 'mastery') return `Mastery ${s.unlock_value}`
        if (s.unlock_type === 'gold') return `${s.unlock_value} G`
        if (s.unlock_type === 'scroll') return `Scroll ${s.unlock_value}`
        if (s.unlock_type === 'level') return `Lv ${s.unlock_value}`
        return 'Starter'
    }

    return (
        <div className="grid grid-cols-5 gap-6 h-full">
            <div className="col-span-2 space-y-4">
                <label className="text-[10px] font-bold tracking-[0.3em] text-emerald-500 uppercase">Loadout 1–4</label>
                <div className="grid grid-cols-2 gap-3">
                    {([1, 2, 3, 4] as const).map((slot) => {
                        const id = player.skillSlots[slot - 1]
                        const sk = player.skillCatalog.find((s) => s.skill_id === id)
                        return (
                            <button
                                key={slot}
                                onClick={() => setSelectedSlot(slot)}
                                className={`p-4 rounded-xl border text-left transition-all ${selectedSlot === slot ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 bg-black/30'}`}
                            >
                                <div className="text-[9px] font-black text-white/40 tracking-widest">SLOT {slot}</div>
                                <div className="text-sm font-bold text-white mt-1 uppercase italic">{sk?.skill_name || 'Empty'}</div>
                                {sk && <div className="text-[9px] text-cyan-400/70 mt-1">MP {sk.mp_cost} · {sk.skill_type}</div>}
                                {id && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); void setSkillSlot(slot, '') }}
                                        className="mt-2 text-[8px] text-rose-400 uppercase tracking-widest"
                                    >
                                        Clear
                                    </button>
                                )}
                            </button>
                        )
                    })}
                </div>
                {scrolls.length > 0 && (
                    <div className="mt-6 space-y-2">
                        <label className="text-[10px] font-bold tracking-[0.3em] text-violet-400 uppercase">Scrolls</label>
                        {scrolls.map((sc) => (
                            <button
                                key={sc.item_id}
                                onClick={() => void useSkillScroll(sc.item_id)}
                                className="w-full rounded-lg border border-violet-500/30 bg-violet-500/5 px-4 py-3 text-left text-xs text-violet-200 hover:bg-violet-500/15"
                            >
                                Use {sc.name || sc.item_id} ×{sc.quantity}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="col-span-3 space-y-3 overflow-y-auto max-h-[55vh] pr-2">
                <label className="text-[10px] font-bold tracking-[0.3em] text-cyan-500 uppercase">Skill Codex</label>
                {jobSkills.map((s) => {
                    const owned = player.ownedSkillIds.includes(s.skill_id)
                    return (
                        <div key={s.skill_id} className="flex items-center gap-4 rounded-xl border border-white/5 bg-black/30 p-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-black uppercase italic text-white truncate">{s.skill_name}</h4>
                                    <span className="text-[8px] font-bold tracking-widest text-white/30 uppercase">{s.unlock_type}</span>
                                </div>
                                <p className="text-[10px] text-white/40 mt-1">{s.description}</p>
                                <p className="text-[9px] text-emerald-400/60 font-mono mt-1">
                                    {s.skill_type} · MP {s.mp_cost} · CD {s.cooldown_ms}ms · {unlockHint(s)}
                                </p>
                            </div>
                            {owned ? (
                                <button
                                    onClick={() => void setSkillSlot(selectedSlot, s.skill_id)}
                                    className="px-4 py-2 rounded-lg border border-emerald-500/40 text-[9px] font-black tracking-widest text-emerald-300 uppercase hover:bg-emerald-500/10"
                                >
                                    Equip {selectedSlot}
                                </button>
                            ) : s.unlock_type === 'scroll' ? (
                                <span className="text-[9px] text-violet-300/70 uppercase tracking-widest">Need Scroll</span>
                            ) : (
                                <button
                                    onClick={() => void unlockSkill(s.skill_id)}
                                    className="px-4 py-2 rounded-lg border border-amber-500/40 text-[9px] font-black tracking-widest text-amber-300 uppercase hover:bg-amber-500/10"
                                >
                                    Unlock
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

const ArcanumCard = ({ name, description, reverse }: { name: string, description: string, reverse: boolean }) => (
    <div className={`p-8 rounded-3xl border ${reverse ? 'border-rose-500/40 bg-rose-500/5' : 'border-emerald-500/40 bg-zinc-950'} flex flex-col justify-between aspect-[3/4] relative group hover:scale-[1.03] transition-all cursor-pointer overflow-hidden`}>
        <div className={`absolute top-0 right-0 h-32 w-32 ${reverse ? 'bg-rose-500/10' : 'bg-emerald-500/10'} rounded-full blur-2xl -mr-16 -mt-16 group-hover:opacity-100 opacity-50 transition-opacity`} />
        <div>
            <div className="flex items-center justify-between mb-8">
                <div className={`h-12 w-12 rounded-xl border border-white/10 flex items-center justify-center ${reverse ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    <LayoutGrid className="h-6 w-6" />
                </div>
                <span className={`text-[10px] font-black tracking-[0.4em] ${reverse ? 'text-rose-500' : 'text-emerald-500'}`}>{reverse ? 'REVERSAL' : 'ACTIVE'}</span>
            </div>
            <h3 className="text-4xl font-black italic tracking-tighter text-white mb-4 leading-8 uppercase">{name}</h3>
            <p className="text-xs font-medium text-white/40 leading-relaxed uppercase tracking-wider">{description}</p>
        </div>

        <div className="flex flex-col gap-4">
            <div className="h-px w-full bg-white/5" />
            <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                    {[...Array(3)].map((_, i) => <div key={i} className={`h-2 w-2 rounded-full ${reverse ? 'bg-rose-500/60' : 'bg-emerald-500/60'}`} />)}
                </div>
                <span className="text-[9px] font-bold text-white/20 tracking-widest uppercase">Rank_S_Arcana</span>
            </div>
        </div>
    </div>
)

export default Inventory

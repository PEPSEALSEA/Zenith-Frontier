'use client'

import React, { useState } from 'react'
import { useGameStore, Job } from '@/store/gameStore'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Backpack,
    Map,
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

const Inventory = () => {
    const [isOpen, setIsOpen] = useState(false)
    const [activeTab, setActiveTab] = useState('EQUIPMENT')
    const { player, gainExp, takeDamage } = useGameStore()

    const tabs = ['EQUIPMENT', 'JOB SYSTEM', 'INVENTORY', 'WORLD BOOK', 'ARCANUM']

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
                                <NavIcon icon={Scroll} active={activeTab === 'WORLD BOOK'} onClick={() => setActiveTab('WORLD BOOK')} />
                                <NavIcon icon={Zap} active={activeTab === 'ARCANUM'} onClick={() => setActiveTab('ARCANUM')} />
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
                                    {activeTab === 'EQUIPMENT' && <EquipmentGrid />}
                                    {activeTab === 'JOB SYSTEM' && <JobSystemView />}
                                    {activeTab === 'INVENTORY' && (
                                        <div className="grid grid-cols-6 gap-4">
                                            {[...Array(24)].map((_, i) => (
                                                <div key={i} className="aspect-square rounded-lg bg-black/40 border border-white/5 transition-all duration-300 hover:border-emerald-500/40 hover:bg-emerald-500/5 cursor-pointer group flex items-center justify-center p-2 relative overflow-hidden group">
                                                    <div className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    {i === 0 ? <Zap className="h-6 w-6 text-amber-500/60 transition-transform group-hover:scale-110" /> : <Plus className="h-4 w-4 text-white/10 group-hover:text-white/40" />}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {activeTab === 'ARCANUM' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            <ArcanumCard name="THE FOOL" description="Increased luck and unpredictable skill activation." reverse={false} />
                                            <ArcanumCard name="THE EMPRESS" description="Natural mana regeneration increased +500%." reverse={true} />
                                            <ArcanumCard name="DEATH" description="Skills have a chance to inflict 'Oblivion'." reverse={false} />
                                        </div>
                                    )}
                                </div>

                                {/* Footer Controls */}
                                <div className="p-6 border-t border-white/5 bg-black/40 flex items-center justify-end gap-4">
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

const EquipmentGrid = () => (
    <div className="grid grid-cols-4 gap-8">
        {/* Left Slot: Main Weapon */}
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

        {/* Right Side: Stats detail */}
        <div className="col-span-2 bg-black/40 rounded-xl p-8 border border-white/5">
            <h4 className="text-xl font-black italic tracking-tight text-white/80 mb-6 uppercase border-b border-white/5 pb-4">Character Affinity</h4>
            <div className="space-y-4">
                <AffineStat label="STRENGTH" value={45} color="amber" />
                <AffineStat label="DEXTERITY" value={82} color="emerald" />
                <AffineStat label="INTELLIGENCE" value={31} color="blue" />
                <AffineStat label="VORPALITY" value={15} color="cyan" />
            </div>
        </div>
    </div>
)

const AffineStat = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-1">
            <span className="text-[9px] font-bold tracking-widest text-white/40">{label}</span>
            <span className="text-[10px] font-mono font-bold text-white">{value}</span>
        </div>
        <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                className={`h-full rounded-full ${color === 'emerald' ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-500' : color === 'blue' ? 'bg-blue-500' : 'bg-cyan-500'}`}
            />
        </div>
    </div>
)

const JobSystemView = () => {
    const { player } = useGameStore()
    return (
        <div className="grid grid-cols-2 gap-8 h-full">
            <div className="flex flex-col gap-4">
                <label className="text-[10px] font-bold tracking-[0.3em] text-emerald-500 uppercase">Main Occupation</label>
                <div className="p-8 rounded-2xl bg-gradient-to-br from-emerald-600/20 to-zinc-950 border border-emerald-500/30 flex flex-col items-center justify-center gap-4 group hover:scale-[1.02] transition-transform cursor-pointer relative overflow-hidden">
                    <Zap className="h-16 w-16 text-emerald-400 opacity-60 transition-transform group-hover:scale-110 mb-2" />
                    <h3 className="text-2xl font-black tracking-tighter text-white uppercase italic">{player.jobs.main?.name || 'TRAINEE'}</h3>
                    <span className="text-[10px] font-bold tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full uppercase">LVL {player.jobs.main?.level || 0}</span>
                    <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/10 rounded-full blur-3xl -mr-12 -mt-12" />
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <label className="text-[10px] font-bold tracking-[0.3em] text-cyan-500 uppercase">Sub-Profession</label>
                <div className="p-8 rounded-2xl bg-black/40 border border-white/5 flex flex-col items-center justify-center gap-4 group hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden">
                    <Map className="h-12 w-12 text-white/10" />
                    <span className="text-[10px] font-bold tracking-[0.5em] text-white/20 uppercase">No Sub-Job Assigned</span>
                    <div className="h-px w-24 bg-white/5" />
                    <button className="text-[9px] font-black tracking-[0.2em] text-cyan-400 hover:text-cyan-300 uppercase transition-colors">Assign Secondary Path +</button>
                </div>
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

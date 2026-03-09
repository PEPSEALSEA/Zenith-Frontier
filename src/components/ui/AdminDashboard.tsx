'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useGameStore, ADMIN_EMAIL } from '@/store/gameStore'
import {
    Map,
    Skull,
    User,
    ScrollText,
    LogOut,
    Swords,
    ChevronRight,
    Database,
    Activity,
    Zap,
    Globe,
} from 'lucide-react'

type DashboardTool = 'map' | 'monster' | 'npc' | 'quest' | null

interface AdminDashboardProps {
    onSelectTool: (tool: DashboardTool) => void
}

const TOOL_CARDS = [
    {
        id: 'map' as DashboardTool,
        icon: Map,
        label: 'Map Editor',
        sublabel: 'World Forge',
        description: 'Place spawners, NPCs, towns, safezones and monsters across the world map.',
        gradient: 'from-indigo-600/20 to-indigo-900/10',
        border: 'border-indigo-500/30',
        glow: 'shadow-indigo-500/20',
        iconColor: 'text-indigo-400',
        accentBg: 'bg-indigo-500',
    },
    {
        id: 'monster' as DashboardTool,
        icon: Skull,
        label: 'Monster Creator',
        sublabel: 'Entity Database',
        description: 'Define monster templates, stats, skills, loot tables, and AI behaviors.',
        gradient: 'from-rose-600/20 to-rose-900/10',
        border: 'border-rose-500/30',
        glow: 'shadow-rose-500/20',
        iconColor: 'text-rose-400',
        accentBg: 'bg-rose-500',
    },
    {
        id: 'npc' as DashboardTool,
        icon: User,
        label: 'NPC Creator',
        sublabel: 'Dialog & Commerce',
        description: 'Build NPC templates with dialog trees, merchant inventories, and quest logic.',
        gradient: 'from-amber-600/20 to-amber-900/10',
        border: 'border-amber-500/30',
        glow: 'shadow-amber-500/20',
        iconColor: 'text-amber-400',
        accentBg: 'bg-amber-500',
    },
    {
        id: 'quest' as DashboardTool,
        icon: ScrollText,
        label: 'Quest Editor',
        sublabel: 'Story & Progression',
        description: 'Author kill / collect / talk quests with reward chains and hidden objective logic.',
        gradient: 'from-emerald-600/20 to-emerald-900/10',
        border: 'border-emerald-500/30',
        glow: 'shadow-emerald-500/20',
        iconColor: 'text-emerald-400',
        accentBg: 'bg-emerald-500',
    },
]

export default function AdminDashboard({ onSelectTool }: AdminDashboardProps) {
    const { auth, logout, enterForgeMode, world } = useGameStore()
    const [hoveredCard, setHoveredCard] = useState<DashboardTool>(null)

    const stats = [
        { icon: Skull, label: 'Monsters', value: world.monsterTemplates.length },
        { icon: User, label: 'NPCs', value: world.npcTemplates.length },
        { icon: Zap, label: 'Spawners', value: world.spawners.length },
        { icon: ScrollText, label: 'Quests', value: world.quests.length },
        { icon: Globe, label: 'World Objects', value: world.objects.length },
        { icon: Database, label: 'Loot Tables', value: world.lootTables.length },
    ]

    const handleCardClick = (id: DashboardTool) => {
        if (id === 'map') {
            enterForgeMode()
        } else {
            onSelectTool(id)
        }
    }

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col overflow-auto">
            {/* Ambient BG */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/5 blur-[120px]" />
                <div className="absolute top-1/3 right-0 w-80 h-80 rounded-full bg-rose-500/5 blur-[100px]" />
                <div className="absolute bottom-0 left-1/3 w-96 h-96 rounded-full bg-emerald-500/5 blur-[120px]" />
            </div>

            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-white/5"
            >
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                        <Swords className="h-5 w-5 text-black" />
                    </div>
                    <div>
                        <h1 className="font-black italic uppercase tracking-tighter text-xl text-white">Zenith Frontier</h1>
                        <p className="text-[10px] font-bold tracking-[0.3em] text-amber-500 uppercase">Admin Control Center</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                        <img src={auth.user?.picture} className="h-7 w-7 rounded-full border border-emerald-500/50" alt="avatar" />
                        <div>
                            <p className="text-xs font-bold text-white">{auth.user?.name}</p>
                            <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Administrator</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </motion.header>

            {/* Main content */}
            <div className="relative z-10 flex-1 px-8 py-10 max-w-7xl mx-auto w-full">

                {/* Stats bar */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-10"
                >
                    {stats.map((s, i) => (
                        <div key={s.label} className="flex flex-col gap-1 p-4 rounded-2xl bg-white/3 border border-white/5 backdrop-blur-sm" style={{ animationDelay: `${i * 0.05}s` }}>
                            <s.icon className="h-4 w-4 text-white/30 mb-1" />
                            <span className="text-2xl font-black text-white tabular-nums">{s.value}</span>
                            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{s.label}</span>
                        </div>
                    ))}
                </motion.div>

                {/* Section title */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-6"
                >
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Select a Tool</h2>
                    <p className="text-sm text-white/30 mt-1">Choose what you want to create or modify</p>
                </motion.div>

                {/* Tool cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {TOOL_CARDS.map((card, i) => (
                        <motion.button
                            key={card.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * i + 0.2, duration: 0.4 }}
                            onClick={() => handleCardClick(card.id)}
                            onMouseEnter={() => setHoveredCard(card.id)}
                            onMouseLeave={() => setHoveredCard(null)}
                            className={`relative overflow-hidden group text-left p-6 rounded-2xl border bg-gradient-to-br ${card.gradient} ${card.border} shadow-xl ${card.glow} transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl active:scale-[0.99]`}
                        >
                            {/* Hover shimmer */}
                            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/3 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700`} />

                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-3 rounded-xl bg-white/5 border border-white/10 group-hover:border-white/20 transition-all`}>
                                    <card.icon className={`h-7 w-7 ${card.iconColor}`} />
                                </div>
                                <ChevronRight className={`h-5 w-5 text-white/20 group-hover:text-white/60 group-hover:translate-x-1 transition-all`} />
                            </div>

                            <h3 className="text-lg font-black uppercase italic tracking-tight text-white mb-0.5">{card.label}</h3>
                            <p className={`text-[9px] font-black tracking-[0.3em] uppercase mb-3 ${card.iconColor}`}>{card.sublabel}</p>
                            <p className="text-xs text-white/40 leading-relaxed">{card.description}</p>

                            {/* Bottom accent */}
                            <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${card.accentBg} opacity-0 group-hover:opacity-30 transition-opacity`} />
                        </motion.button>
                    ))}
                </div>

                {/* Enter as Player */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex justify-center"
                >
                    <button
                        onClick={() => onSelectTool(null)}
                        className="flex items-center gap-3 px-8 py-3 rounded-full border border-white/10 bg-white/3 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all text-xs font-bold uppercase tracking-widest"
                    >
                        <Activity className="h-4 w-4" />
                        Enter as Player
                        <ChevronRight className="h-3 w-3" />
                    </button>
                </motion.div>
            </div>
        </div>
    )
}

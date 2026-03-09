'use client'

import React, { useState } from 'react'
import { useGameStore, WorldObjectType, WorldObject, ADMIN_EMAIL } from '@/store/gameStore'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Map as MapIcon,
    Plus,
    Trash2,
    Save,
    Skull,
    Home,
    User,
    ShoppingBag,
    Zap,
    Maximize2,
    Settings,
    Edit3,
    CloudUpload,
    ChevronDown,
    ChevronUp
} from 'lucide-react'

const OBJECT_TYPES: { type: WorldObjectType, icon: any, color: string }[] = [
    { type: 'monster', icon: Skull, color: '#ef4444' },
    { type: 'boss', icon: Skull, color: '#9333ea' },
    { type: 'spawner', icon: Zap, color: '#64748b' },
    { type: 'town', icon: Home, color: '#22c55e' },
    { type: 'safezone', icon: Maximize2, color: '#3b82f6' },
    { type: 'npc', icon: User, color: '#f59e0b' },
    { type: 'market', icon: ShoppingBag, color: '#10b981' },
]

export default function MapEditor() {
    const { auth, world, player, isEditorMode, isForgeMode, setEditorMode, addWorldObject, removeWorldObject, updateWorldObject, saveWorldToGAS, forgeSelection, setForgeSelection } = useGameStore()
    const [isOpen, setIsOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

    if (auth.user?.email !== ADMIN_EMAIL) return null

    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const dropAtPlayer = () => {
        if (!forgeSelection) return
        addWorldObject({
            id: `obj_${Date.now()}`,
            type: forgeSelection.type,
            x: player.position.x,
            y: player.position.y,
            name: forgeSelection.name || `New ${forgeSelection.type}`,
            radius: (forgeSelection.type === 'town' || forgeSelection.type === 'safezone') ? 200 : 30,
            params: forgeSelection.id ? { entity_id: forgeSelection.id } : {}
        })
    }

    const handleSave = async () => {
        setIsSaving(true)
        await saveWorldToGAS()
        setTimeout(() => setIsSaving(false), 2000)
    }

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3 pointer-events-auto">
            {/* Editor Toggle */}
            <button
                onClick={() => setEditorMode(!isEditorMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 font-black text-[10px] tracking-widest transition-all shadow-xl ${isEditorMode ? 'bg-amber-500 border-amber-400 text-black' : 'bg-black/60 border-white/20 text-white hover:bg-white/10'}`}
            >
                <Settings className={`h-3.5 w-3.5 ${isEditorMode ? 'animate-spin' : ''}`} />
                {isEditorMode ? 'EXIT EDITOR' : 'ENTER EDITOR'}
            </button>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all border-2 ${isOpen ? 'bg-rose-500 border-rose-400 rotate-90' : 'bg-indigo-600 border-indigo-400'}`}
            >
                {isOpen ? <Plus className="h-8 w-8 text-white rotate-45" /> : <MapIcon className="h-7 w-7 text-white" />}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, x: 20 }}
                        className="bg-zinc-950/95 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.6)] w-80 ring-1 ring-white/5"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-white font-black italic uppercase tracking-tighter text-lg">World Forge</h3>
                                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                    <Edit3 className="h-2.5 w-2.5" /> Admin Mode Active
                                </p>
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className={`p-3 rounded-xl border transition-all ${isSaving ? 'bg-emerald-500 text-black animate-pulse' : 'bg-white/5 border-white/10 text-white hover:bg-emerald-500 hover:text-black hover:border-emerald-400'}`}
                            >
                                <CloudUpload className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-4 gap-2 mb-4">
                            {OBJECT_TYPES.map(item => (
                                <button
                                    key={item.type}
                                    onClick={() => setForgeSelection({ type: item.type })}
                                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${forgeSelection?.type === item.type ? 'bg-white/10 border-white/40 scale-105' : 'bg-white/5 border-transparent opacity-40 hover:opacity-100'}`}
                                >
                                    <item.icon className="h-5 w-5" style={{ color: item.color }} />
                                    <span className="text-[7px] font-black uppercase tracking-tighter text-white">{item.type}</span>
                                </button>
                            ))}
                        </div>

                        {/* Specific Selection Sub-menu */}
                        {(forgeSelection?.type === 'monster' || forgeSelection?.type === 'spawner') && world.monsterTemplates.length > 0 && (
                            <div className="mb-6 space-y-2">
                                <h4 className="text-[8px] font-black text-white/30 uppercase tracking-widest pl-1">Select {forgeSelection.type === 'spawner' ? 'Monster to Spawn' : 'Monster Template'}</h4>
                                <div className="flex flex-wrap gap-2">
                                    {world.monsterTemplates.map(m => (
                                        <button
                                            key={m.monster_id}
                                            onClick={() => setForgeSelection({ type: forgeSelection.type, id: m.monster_id, name: m.name })}
                                            className={`px-3 py-1.5 rounded-lg border text-[9px] font-bold uppercase transition-all ${forgeSelection.id === m.monster_id ? (forgeSelection.type === 'spawner' ? 'bg-cyan-500 border-cyan-400' : 'bg-red-500 border-red-400') + ' text-white' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                                        >
                                            {m.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {forgeSelection?.type === 'npc' && world.npcTemplates.length > 0 && (
                            <div className="mb-6 space-y-2">
                                <h4 className="text-[8px] font-black text-white/30 uppercase tracking-widest pl-1">Select NPC Template</h4>
                                <div className="flex flex-wrap gap-2">
                                    {world.npcTemplates.map(n => (
                                        <button
                                            key={n.npc_id}
                                            onClick={() => setForgeSelection({ type: 'npc', id: n.npc_id, name: n.name })}
                                            className={`px-3 py-1.5 rounded-lg border text-[9px] font-bold uppercase transition-all ${forgeSelection.id === n.npc_id ? 'bg-amber-500 border-amber-400 text-black' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                                        >
                                            {n.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {isForgeMode && forgeSelection && (
                            <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest animate-pulse">
                                    CLICK ON MAP TO PLACE {forgeSelection.name || forgeSelection.type}
                                </p>
                            </div>
                        )}

                        <div className="space-y-3">
                            <button
                                onClick={dropAtPlayer}
                                disabled={!forgeSelection}
                                className="w-full h-12 bg-indigo-600 border border-indigo-400 text-white rounded-xl font-black text-xs tracking-[0.2em] uppercase disabled:opacity-20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-lg"
                            >
                                <Plus className="h-4 w-4" /> Place at Player
                            </button>

                            <div className="h-px bg-white/10 my-4" />

                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Sector Objects ({world.objects.length})</h4>
                            </div>

                            <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {world.objects.map(obj => {
                                    const isExpanded = !!expandedIds[obj.id]
                                    return (
                                        <div key={obj.id} className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/5 border border-white/5 group transition-all hover:bg-white/10">
                                            <div className="flex items-center justify-between cursor-pointer" onClick={(e) => toggleExpand(obj.id, e)}>
                                                <div className="flex items-center gap-2 flex-1">
                                                    <button className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                                                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                    </button>
                                                    <div className="h-2 w-2 rounded-full shadow-[0_0_8px] shadow-current flex-shrink-0" style={{ color: OBJECT_TYPES.find(t => t.type === obj.type)?.color, backgroundColor: 'currentColor' }} />
                                                    <input
                                                        className="bg-transparent text-[10px] font-black text-white/80 uppercase focus:outline-none focus:text-cyan-400 flex-1 min-w-0"
                                                        value={obj.name}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => updateWorldObject(obj.id, { name: e.target.value })}
                                                    />
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); removeWorldObject(obj.id) }} className="p-1.5 text-rose-500 hover:bg-rose-500/20 rounded-lg transition-all ml-2 flex-shrink-0">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>

                                            {isExpanded && (
                                                <div className="pt-2 mt-2 border-t border-white/5 space-y-3">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[8px] font-black text-white/30 tracking-widest w-4">X:</span>
                                                            <input type="number" value={Math.round(obj.x)} onChange={(e) => updateWorldObject(obj.id, { x: Number(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] text-white font-mono" />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[8px] font-black text-white/30 tracking-widest w-4">Y:</span>
                                                            <input type="number" value={Math.round(obj.y)} onChange={(e) => updateWorldObject(obj.id, { y: Number(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] text-white font-mono" />
                                                        </div>
                                                    </div>

                                                    {(obj.type === 'town' || obj.type === 'safezone' || obj.type === 'spawner') && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[8px] font-black text-white/30 tracking-widest w-12">RADIUS:</span>
                                                            <input
                                                                type="range" min="10" max="500" step="10"
                                                                value={obj.radius}
                                                                onChange={(e) => updateWorldObject(obj.id, { radius: parseInt(e.target.value) })}
                                                                className="flex-1 accent-indigo-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                                                            />
                                                            <span className="text-[8px] font-mono text-indigo-400 w-6">{obj.radius}</span>
                                                        </div>
                                                    )}

                                                    <div className="space-y-1">
                                                        <span className="text-[8px] font-black text-white/30 tracking-widest block">PARAMS (JSON):</span>
                                                        <textarea
                                                            defaultValue={JSON.stringify(obj.params || {}, null, 2)}
                                                            onBlur={(e) => {
                                                                try {
                                                                    const parsed = JSON.parse(e.target.value);
                                                                    updateWorldObject(obj.id, { params: parsed });
                                                                } catch (err) { }
                                                            }}
                                                            className="w-full h-16 bg-black/40 border border-white/10 rounded p-1.5 text-[8px] text-white/70 font-mono custom-scrollbar focus:outline-none focus:border-amber-500/50"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            `}</style>
        </div>
    )
}

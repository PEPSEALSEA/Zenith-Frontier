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
    CloudUpload
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
    const { auth, world, player, isEditorMode, setEditorMode, addWorldObject, removeWorldObject, updateWorldObject, saveWorldToGAS } = useGameStore()
    const [selectedType, setSelectedType] = useState<WorldObjectType | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    if (auth.user?.email !== ADMIN_EMAIL) return null

    const dropAtPlayer = () => {
        if (!selectedType) return
        const obj: WorldObject = {
            id: `obj_${Date.now()}`,
            type: selectedType,
            x: player.position.x,
            y: player.position.y,
            name: `New ${selectedType}`,
            radius: (selectedType === 'town' || selectedType === 'safezone') ? 200 : 30,
        }
        addWorldObject(obj)
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

                        <div className="grid grid-cols-4 gap-2 mb-6">
                            {OBJECT_TYPES.map(item => (
                                <button
                                    key={item.type}
                                    onClick={() => setSelectedType(item.type)}
                                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${selectedType === item.type ? 'bg-white/10 border-white/40 scale-105' : 'bg-white/5 border-transparent opacity-40 hover:opacity-100'}`}
                                >
                                    <item.icon className="h-5 w-5" style={{ color: item.color }} />
                                    <span className="text-[7px] font-black uppercase tracking-tighter text-white">{item.type}</span>
                                </button>
                            ))}
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={dropAtPlayer}
                                disabled={!selectedType}
                                className="w-full h-12 bg-indigo-600 border border-indigo-400 text-white rounded-xl font-black text-xs tracking-[0.2em] uppercase disabled:opacity-20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-lg"
                            >
                                <Plus className="h-4 w-4" /> Place at Player
                            </button>

                            <div className="h-px bg-white/10 my-4" />

                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Sector Objects ({world.objects.length})</h4>
                            </div>

                            <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {world.objects.map(obj => (
                                    <div key={obj.id} className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/5 border border-white/5 group transition-all hover:bg-white/10">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full shadow-[0_0_8px] shadow-current" style={{ color: OBJECT_TYPES.find(t => t.type === obj.type)?.color, backgroundColor: 'currentColor' }} />
                                                <input
                                                    className="bg-transparent text-[10px] font-black text-white/80 uppercase focus:outline-none focus:text-cyan-400 w-32"
                                                    value={obj.name}
                                                    onChange={(e) => updateWorldObject(obj.id, { name: e.target.value })}
                                                />
                                            </div>
                                            <button onClick={() => removeWorldObject(obj.id)} className="p-1.5 text-rose-500 hover:bg-rose-500/20 rounded-lg transition-all">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>

                                        {(obj.type === 'town' || obj.type === 'safezone') && (
                                            <div className="flex items-center gap-3 px-1 mt-1">
                                                <span className="text-[8px] font-black text-white/20 tracking-widest">UNIT_SIZE</span>
                                                <input
                                                    type="range" min="50" max="500" step="10"
                                                    value={obj.radius}
                                                    onChange={(e) => updateWorldObject(obj.id, { radius: parseInt(e.target.value) })}
                                                    className="flex-1 accent-indigo-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                                                />
                                                <span className="text-[8px] font-mono text-indigo-400 w-6">{obj.radius}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
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

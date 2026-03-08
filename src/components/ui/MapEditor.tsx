'use client'

import React, { useState, useEffect } from 'react'
import { useGameStore, WorldObjectType, WorldObject, ADMIN_EMAIL } from '@/store/gameStore'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Map as MapIcon,
    Plus,
    Trash2,
    Save,
    MousePointer2,
    Skull,
    Home,
    User,
    ShoppingBag,
    Zap,
    Maximize2
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
    const { auth, world, addWorldObject, removeWorldObject, updateWorldObject } = useGameStore()
    const [selectedType, setSelectedType] = useState<WorldObjectType | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [isPlacing, setIsPlacing] = useState(false)

    if (auth.user?.email !== ADMIN_EMAIL) return null

    const handleCanvasClick = (e: MouseEvent) => {
        if (!selectedType || !isPlacing) return

        const obj: WorldObject = {
            id: `obj_${Date.now()}`,
            type: selectedType,
            x: world.lastAttack.time, // We need actual mouse coordinates here, but since this is UI overlay, we'll handle it via event listener on window or similar
            y: 0,
            name: `New ${selectedType}`,
            radius: (selectedType === 'town' || selectedType === 'safezone') ? 150 : 20,
        }

        // To get actual world coordinates, we'd need to subtract camera offset. 
        // For now, let's simplify and use player position as "drop point" or similar, 
        // or better: use window coordinates and calculate.
    }

    const dropAtPlayer = () => {
        if (!selectedType) return
        const { player } = useGameStore.getState()
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

    return (
        <div className="fixed bottom-6 left-6 z-[100] flex flex-col gap-4 pointer-events-auto">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all border-2 ${isOpen ? 'bg-rose-500 border-rose-400 rotate-90' : 'bg-indigo-600 border-indigo-400'}`}
            >
                {isOpen ? <Plus className="h-8 w-8 text-white rotate-45" /> : <MapIcon className="h-7 w-7 text-white" />}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-zinc-950/90 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.5)] w-80"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-white font-black italic uppercase tracking-tighter">Map Engine</h3>
                                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Admin Authorization: Active</p>
                            </div>
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>

                        <div className="grid grid-cols-4 gap-2 mb-6">
                            {OBJECT_TYPES.map(item => (
                                <button
                                    key={item.type}
                                    onClick={() => setSelectedType(item.type)}
                                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${selectedType === item.type ? 'bg-white/10 border-white/40' : 'bg-white/5 border-transparent opacity-40 hover:opacity-100'}`}
                                >
                                    <item.icon className="h-5 w-5" style={{ color: item.color }} />
                                    <span className="text-[7px] font-black uppercase tracking-tighter text-white">{item.type}</span>
                                </button>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <button
                                onClick={dropAtPlayer}
                                disabled={!selectedType}
                                className="w-full h-12 bg-white text-black rounded-xl font-black text-xs tracking-[0.2em] uppercase disabled:opacity-20 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="h-4 w-4" /> Drop at Player
                            </button>

                            <div className="h-px bg-white/5 my-4" />

                            <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">Active Objects ({world.objects.length})</h4>
                            <div className="max-h-48 overflow-y-auto space-y-1 pr-2">
                                {world.objects.map(obj => (
                                    <div key={obj.id} className="flex flex-col gap-1 p-2 rounded-lg bg-white/5 group mb-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: OBJECT_TYPES.find(t => t.type === obj.type)?.color }} />
                                                <input
                                                    className="bg-transparent text-[10px] font-bold text-white/80 uppercase focus:outline-none focus:text-white"
                                                    value={obj.name}
                                                    onChange={(e) => updateWorldObject(obj.id, { name: e.target.value })}
                                                />
                                            </div>
                                            <button onClick={() => removeWorldObject(obj.id)} className="opacity-0 group-hover:opacity-100 p-1 text-rose-500 hover:bg-rose-500/10 rounded transition-all">
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                        {(obj.type === 'town' || obj.type === 'safezone') && (
                                            <div className="flex items-center gap-2 px-4">
                                                <span className="text-[7px] text-white/20">RADIUS</span>
                                                <input
                                                    type="range" min="50" max="500" step="10"
                                                    value={obj.radius}
                                                    onChange={(e) => updateWorldObject(obj.id, { radius: parseInt(e.target.value) })}
                                                    className="flex-1 accent-indigo-500 h-1 bg-white/5 rounded-full"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

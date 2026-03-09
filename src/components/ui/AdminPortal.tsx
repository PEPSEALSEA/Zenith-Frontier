'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Database,
    UserPlus,
    Skull,
    Target,
    MapPin,
    Save,
    Plus,
    Trash2,
    ChevronRight,
    Hexagon,
    Settings,
    MessageSquare,
    ShoppingBag,
    ArrowLeftRight,
    RefreshCw
} from 'lucide-react'
import { gasService } from '@/services/gasService'
import { useGameStore, Job, PlayerAppearance, FACES_MAP, FaceKey, MonsterTemplate, Spawner, Quest } from '@/store/gameStore'

type AdminTab = 'MONSTERS' | 'NPCS' | 'QUESTS' | 'SPAWNERS'

const AdminPortal = () => {
    const [activeTab, setActiveTab] = useState<AdminTab>('MONSTERS')
    const { world, setMonsterTemplates, setQuests, setSpawners } = useGameStore()
    const [isLoading, setIsLoading] = useState(false)

    // Form States
    const [monsterForm, setMonsterForm] = useState<Partial<MonsterTemplate>>({
        monster_id: '', name: '', appearance: { color: '#ef4444', face: 'skull' }
    })

    const [npcForm, setNpcForm] = useState<any>({
        npc_id: '', name: '', appearance: { color: '#3b82f6', face: 'ghost' },
        initial_dialogue_id: '', quest_id: '', is_merchant: false, is_trader: false, trade_items: []
    })

    const [questForm, setQuestForm] = useState<Partial<Quest>>({
        quest_id: '', name: '', description: '', type: 'kill', target_id: '', target_count: 5, rewards: {}, is_hidden: false
    })

    const [spawnerForm, setSpawnerForm] = useState<Partial<Spawner>>({
        spawner_id: '', monster_id: '', x: 0, y: 0, z: 0,
        range: 10, spawn_rate: 5, max_monsters: 3
    })

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setIsLoading(true)
        try {
            const [m, q, s] = await Promise.all([
                gasService.getAllMonsters(),
                gasService.getAllQuests(),
                gasService.getAllSpawners()
            ])
            setMonsterTemplates(m)
            setQuests(q)
            setSpawners(s)
        } catch (e) {
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }

    const saveMonster = async () => {
        if (!monsterForm.monster_id) return
        setIsLoading(true)
        await gasService.upsertMonster(monsterForm)
        await loadData()
    }

    const saveSpawner = async () => {
        if (!spawnerForm.spawner_id) return
        setIsLoading(true)
        await gasService.upsertSpawner(spawnerForm)
        await loadData()
    }

    return (
        <div className="flex flex-col h-full bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* Admin Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-zinc-950/40">
                <div className="flex items-center gap-3">
                    <Database className="h-6 w-6 text-amber-500" />
                    <div>
                        <h1 className="text-xl font-black italic tracking-tighter text-white uppercase">Admin Console</h1>
                        <p className="text-[10px] font-bold text-amber-500/60 uppercase tracking-[0.3em]">Master System Control</p>
                    </div>
                </div>
                <button
                    onClick={loadData}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors group"
                >
                    <RefreshCw className={`h-5 w-5 text-white/40 group-hover:text-white transition-all ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Side Nav */}
                <div className="w-20 border-r border-white/5 bg-black/20 flex flex-col items-center py-6 gap-6">
                    <NavTab icon={Skull} active={activeTab === 'MONSTERS'} onClick={() => setActiveTab('MONSTERS')} />
                    <NavTab icon={UserPlus} active={activeTab === 'NPCS'} onClick={() => setActiveTab('NPCS')} />
                    <NavTab icon={Target} active={activeTab === 'QUESTS'} onClick={() => setActiveTab('QUESTS')} />
                    <NavTab icon={MapPin} active={activeTab === 'SPAWNERS'} onClick={() => setActiveTab('SPAWNERS')} />
                </div>

                {/* Content */}
                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                    {activeTab === 'MONSTERS' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Monster List */}
                            <div className="space-y-4">
                                <SectionHeader title="Existing Monsters" />
                                <div className="grid grid-cols-1 gap-2">
                                    {world.monsterTemplates.map(m => (
                                        <div
                                            key={m.monster_id}
                                            onClick={() => setMonsterForm(m)}
                                            className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${monsterForm.monster_id === m.monster_id ? 'border-amber-500 bg-amber-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div style={{ backgroundColor: m.appearance.color }} className="h-8 w-8 rounded-lg flex items-center justify-center">
                                                    {React.createElement(FACES_MAP[m.appearance.face as FaceKey] || Skull, { className: "h-5 w-5 text-white" })}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white uppercase">{m.name}</p>
                                                    <p className="text-[10px] text-white/40 font-mono">{m.monster_id}</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-white/20" />
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setMonsterForm({ monster_id: 'MOB_' + Date.now(), name: 'New Monster', appearance: { color: '#ef4444', face: 'skull' }, stats: { hp: 100, maxHp: 100, mp: 50, maxMp: 50, level: 1, exp: 0, maxExp: 100, atk: 10, def: 5, spd: 12, luck: 8, money: 100 } })}
                                        className="p-4 rounded-xl border border-dashed border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-white/40 flex items-center justify-center gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        <span className="text-xs font-bold uppercase tracking-widest">Create New Mob</span>
                                    </button>
                                </div>
                            </div>

                            {/* Monster Form */}
                            <div className="bg-white/5 rounded-2xl p-8 border border-white/10 space-y-6">
                                <SectionHeader title="Monster Definition" />
                                <div className="space-y-4">
                                    <InputBlock label="Monster ID" value={monsterForm.monster_id} onChange={v => setMonsterForm({ ...monsterForm, monster_id: v })} />
                                    <InputBlock label="Name" value={monsterForm.name} onChange={v => setMonsterForm({ ...monsterForm, name: v })} />

                                    <div className="grid grid-cols-2 gap-4">
                                        <InputBlock label="HP" type="number" value={monsterForm.stats?.hp || 100} onChange={v => setMonsterForm({ ...monsterForm, stats: { ...monsterForm.stats!, hp: Number(v), maxHp: Number(v) } })} />
                                        <InputBlock label="ATK" type="number" value={monsterForm.stats?.atk || 10} onChange={v => setMonsterForm({ ...monsterForm, stats: { ...monsterForm.stats!, atk: Number(v) } })} />
                                        <InputBlock label="DEF" type="number" value={monsterForm.stats?.def || 5} onChange={v => setMonsterForm({ ...monsterForm, stats: { ...monsterForm.stats!, def: Number(v) } })} />
                                        <InputBlock label="SPD" type="number" value={monsterForm.stats?.spd || 12} onChange={v => setMonsterForm({ ...monsterForm, stats: { ...monsterForm.stats!, spd: Number(v) } })} />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Visual Identity</label>
                                        <div className="flex gap-4 items-center p-4 bg-black/40 rounded-xl border border-white/5">
                                            <input
                                                type="color"
                                                value={monsterForm.appearance?.color}
                                                onChange={e => setMonsterForm({ ...monsterForm, appearance: { ...monsterForm.appearance!, color: e.target.value } })}
                                                className="h-10 w-10 bg-transparent border-0 cursor-pointer"
                                            />
                                            <div className="flex flex-wrap gap-1">
                                                {Object.keys(FACES_MAP).map(f => (
                                                    <button
                                                        key={f}
                                                        onClick={() => setMonsterForm({ ...monsterForm, appearance: { ...monsterForm.appearance!, face: f } })}
                                                        className={`h-8 w-8 rounded flex items-center justify-center transition-all ${monsterForm.appearance?.face === f ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                                                    >
                                                        {React.createElement(FACES_MAP[f as FaceKey], { className: "h-4 w-4" })}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* GAS & Loot Table */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">GAS Abilities (Comma separated)</label>
                                            <input
                                                type="text"
                                                value={(monsterForm.abilities || []).join(', ')}
                                                onChange={e => setMonsterForm({ ...monsterForm, abilities: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                                placeholder="e.g. ABI_FIREBALL, ABI_SLASH"
                                                className="w-full h-12 bg-black/40 border border-white/10 rounded-xl px-4 text-white font-mono text-sm focus:outline-none focus:border-amber-500/50"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">GAS Tags (Comma separated)</label>
                                            <input
                                                type="text"
                                                value={(monsterForm.tags || []).join(', ')}
                                                onChange={e => setMonsterForm({ ...monsterForm, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                                placeholder="e.g. MONSTER.TYPE.UNDEAD"
                                                className="w-full h-12 bg-black/40 border border-white/10 rounded-xl px-4 text-white font-mono text-sm focus:outline-none focus:border-amber-500/50"
                                            />
                                        </div>
                                    </div>
                                    <InputBlock label="Loot Table ID" value={monsterForm.loot_table_id || ''} onChange={v => setMonsterForm({ ...monsterForm, loot_table_id: v })} placeholder="e.g. LOOT_GOBLIN" />

                                    <button
                                        onClick={saveMonster}
                                        className="w-full py-4 bg-amber-500 text-black font-black uppercase tracking-[0.2em] rounded-xl hover:bg-amber-400 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Save className="h-5 w-5" />
                                        Commit Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'NPCS' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <SectionHeader title="Existing NPCs" />
                                <div className="grid grid-cols-1 gap-2">
                                    {world.objects.filter(o => o.type === 'npc').map(npc => (
                                        <div
                                            key={npc.id}
                                            onClick={() => setNpcForm(npc)}
                                            className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${npcForm.npc_id === npc.id ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div style={{ backgroundColor: npc.params?.appearance?.color || '#3b82f6' }} className="h-8 w-8 rounded-lg flex items-center justify-center">
                                                    {React.createElement(FACES_MAP[npc.params?.appearance?.face as FaceKey] || FACES_MAP['ghost'], { className: "h-5 w-5 text-white" })}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white uppercase">{npc.name}</p>
                                                    <p className="text-[10px] text-white/40 font-mono">{npc.id}</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-white/20" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white/5 rounded-2xl p-8 border border-white/10 space-y-6">
                                <SectionHeader title="NPC Definition" />
                                <div className="space-y-4">
                                    <InputBlock label="NPC ID" value={npcForm.npc_id} onChange={v => setNpcForm({ ...npcForm, npc_id: v })} />
                                    <InputBlock label="Name" value={npcForm.name} onChange={v => setNpcForm({ ...npcForm, name: v })} />

                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2 text-xs text-white/60">
                                            <input type="checkbox" checked={npcForm.is_merchant} onChange={e => setNpcForm({ ...npcForm, is_merchant: e.target.checked })} />
                                            Merchant
                                        </label>
                                        <label className="flex items-center gap-2 text-xs text-white/60">
                                            <input type="checkbox" checked={npcForm.is_trader} onChange={e => setNpcForm({ ...npcForm, is_trader: e.target.checked })} />
                                            Trader
                                        </label>
                                    </div>

                                    {/* GAS & Dialog */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Dialogue Tree ID</label>
                                            <input
                                                type="text"
                                                value={npcForm.dialog_tree?.[0]?.id || ''}
                                                onChange={e => setNpcForm({ ...npcForm, dialog_tree: [{ id: e.target.value, text: 'Placeholder text', speaker: npcForm.name, conditions: [], next_nodes: [] }] })}
                                                placeholder="e.g. DIL_VILLAGER_01"
                                                className="w-full h-12 bg-black/40 border border-white/10 rounded-xl px-4 text-white font-mono text-sm focus:outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">GAS Tags (Comma separated)</label>
                                            <input
                                                type="text"
                                                value={(npcForm.tags || []).join(', ')}
                                                onChange={e => setNpcForm({ ...npcForm, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                                placeholder="e.g. NPC.STATE.QUEST_GIVER"
                                                className="w-full h-12 bg-black/40 border border-white/10 rounded-xl px-4 text-white font-mono text-sm focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={async () => {
                                            setIsLoading(true)
                                            await gasService.upsertNPC(npcForm)
                                            await loadData()
                                        }}
                                        className="w-full py-4 bg-blue-600 text-white font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-500 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Save className="h-5 w-5" />
                                        Save NPC
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'QUESTS' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <SectionHeader title="Quest Log" />
                                <div className="grid grid-cols-1 gap-2">
                                    {world.quests.map(q => (
                                        <div
                                            key={q.quest_id}
                                            onClick={() => setQuestForm(q)}
                                            className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${questForm.quest_id === q.quest_id ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
                                        >
                                            <div>
                                                <p className="text-sm font-bold text-white uppercase">{q.name}</p>
                                                <p className="text-[10px] text-emerald-500/60 font-mono uppercase">{q.type} {q.target_count}x {q.target_id}</p>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-white/20" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white/5 rounded-2xl p-8 border border-white/10 space-y-6">
                                <SectionHeader title="Quest Editor" />
                                <div className="space-y-4">
                                    <InputBlock label="Quest ID" value={questForm.quest_id} onChange={v => setQuestForm({ ...questForm, quest_id: v })} />
                                    <InputBlock label="Title" value={questForm.name} onChange={v => setQuestForm({ ...questForm, name: v })} />
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Description</label>
                                        <textarea
                                            value={questForm.description}
                                            onChange={e => setQuestForm({ ...questForm, description: e.target.value })}
                                            className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-4 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Type</label>
                                            <select
                                                value={questForm.type}
                                                onChange={e => setQuestForm({ ...questForm, type: e.target.value as any })}
                                                className="w-full h-12 bg-black/40 border border-white/10 rounded-xl px-4 text-white font-mono text-sm focus:outline-none"
                                            >
                                                <option value="kill">Kill</option>
                                                <option value="collect">Collect</option>
                                                <option value="talk">Talk</option>
                                            </select>
                                        </div>
                                        <InputBlock label="Goal Count" type="number" value={questForm.target_count} onChange={v => setQuestForm({ ...questForm, target_count: Number(v) })} />
                                    </div>
                                    <InputBlock label="Target ID" value={questForm.target_id} onChange={v => setQuestForm({ ...questForm, target_id: v })} />

                                    <button
                                        onClick={async () => {
                                            setIsLoading(true)
                                            await gasService.upsertQuest(questForm)
                                            await loadData()
                                        }}
                                        className="w-full py-4 bg-emerald-600 text-white font-black uppercase tracking-[0.2em] rounded-xl hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Save className="h-5 w-5" />
                                        Authorize Quest
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'SPAWNERS' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <SectionHeader title="Active Spawners" />
                                <div className="grid grid-cols-1 gap-2">
                                    {world.spawners.map(s => (
                                        <div
                                            key={s.spawner_id}
                                            onClick={() => setSpawnerForm(s)}
                                            className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${spawnerForm.spawner_id === s.spawner_id ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
                                        >
                                            <div>
                                                <p className="text-sm font-bold text-white uppercase">{s.spawner_id}</p>
                                                <p className="text-[10px] text-cyan-500/60 font-mono uppercase">Target: {s.monster_id}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-white/40 font-mono">X:{s.x} Y:{s.y} Z:{s.z}</p>
                                                <p className="text-[10px] text-white/40 font-mono">Range: {s.range}m</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white/5 rounded-2xl p-8 border border-white/10 space-y-6">
                                <SectionHeader title="Spawner Config" />
                                <div className="space-y-4">
                                    <InputBlock label="Spawner ID" value={spawnerForm.spawner_id} onChange={v => setSpawnerForm({ ...spawnerForm, spawner_id: v })} />

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Target Monster</label>
                                        <select
                                            value={spawnerForm.monster_id}
                                            onChange={e => setSpawnerForm({ ...spawnerForm, monster_id: e.target.value })}
                                            className="w-full h-12 bg-black/40 border border-white/10 rounded-xl px-4 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                                        >
                                            <option value="">Select Monster Type</option>
                                            {world.monsterTemplates.map(m => (
                                                <option key={m.monster_id} value={m.monster_id}>{m.name} ({m.monster_id})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <InputBlock label="Pos X" type="number" value={spawnerForm.x} onChange={v => setSpawnerForm({ ...spawnerForm, x: Number(v) })} />
                                        <InputBlock label="Pos Y" type="number" value={spawnerForm.y} onChange={v => setSpawnerForm({ ...spawnerForm, y: Number(v) })} />
                                        <InputBlock label="Pos Z" type="number" value={spawnerForm.z} onChange={v => setSpawnerForm({ ...spawnerForm, z: Number(v) })} />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <InputBlock label="Range" type="number" value={spawnerForm.range} onChange={v => setSpawnerForm({ ...spawnerForm, range: Number(v) })} />
                                        <InputBlock label="Rate (s)" type="number" value={spawnerForm.spawn_rate} onChange={v => setSpawnerForm({ ...spawnerForm, spawn_rate: Number(v) })} />
                                        <InputBlock label="Max Count" type="number" value={spawnerForm.max_monsters} onChange={v => setSpawnerForm({ ...spawnerForm, max_monsters: Number(v) })} />
                                    </div>

                                    <button
                                        onClick={saveSpawner}
                                        className="w-full py-4 bg-cyan-600 text-white font-black uppercase tracking-[0.2em] rounded-xl hover:bg-cyan-500 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Save className="h-5 w-5" />
                                        Deploy Spawner
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

const NavTab = ({ icon: Icon, active, onClick }: { icon: any, active: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`h-12 w-12 rounded-xl border transition-all flex items-center justify-center group relative ${active ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-white/5 text-white/20 hover:text-white/60 hover:bg-white/5'}`}
    >
        <Icon className="h-6 w-6" />
        {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-500 rounded-r-full shadow-[0_0_10px_#f59e0b]" />}
    </button>
)

const SectionHeader = ({ title }: { title: string }) => (
    <div className="flex items-center gap-2 mb-4">
        <div className="h-1 w-8 bg-amber-500/40 rounded-full" />
        <h3 className="text-xs font-black tracking-[0.3em] text-white/40 uppercase">{title}</h3>
    </div>
)

const InputBlock = ({ label, value, onChange, type = 'text', placeholder = '' }: { label: string, value: any, onChange: (v: string) => void, type?: string, placeholder?: string }) => (
    <div className="space-y-2">
        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{label}</label>
        <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-12 bg-black/40 border border-white/10 rounded-xl px-4 text-white font-mono text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
        />
    </div>
)

export default AdminPortal

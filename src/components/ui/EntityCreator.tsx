'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    useGameStore,
    MonsterTemplate,
    NPCTemplate,
    LootEntry,
    LootTable,
    CharacterStats,
    FACES_MAP,
    FaceKey,
} from '@/store/gameStore'
import {
    Skull,
    User,
    Palette,
    Smile,
    BarChart2,
    PackageOpen,
    Zap,
    Tag,
    Plus,
    Trash2,
    Save,
    ChevronLeft,
    AlertTriangle,
    CheckCircle2,
    Hash,
    Ghost,
} from 'lucide-react'

// ─── Constants ───────────────────────────────────────────────────────────────

const PRESET_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#10b981', '#3b82f6', '#8b5cf6', '#ec4899',
    '#ffffff', '#94a3b8', '#1e293b', '#000000',
]

const FACES: FaceKey[] = ['ghost', 'skull', 'fire', 'bolt', 'star', 'crown', 'swords', 'target', 'shield', 'heart']

const DEFAULT_STATS: CharacterStats = {
    hp: 100, maxHp: 100, mp: 0, maxMp: 0,
    level: 1, exp: 0, maxExp: 0,
    atk: 10, def: 5, spd: 8, luck: 5, money: 0,
}

const DEFAULT_LOOT_ENTRY = (): LootEntry => ({
    item_id: '',
    chance: 0.25,
    min_amount: 1,
    max_amount: 1,
})

type CreatorType = 'monster' | 'npc'
type NPCLogicType = 'dialog' | 'merchant' | 'trader'

// ─── Sub-components ──────────────────────────────────────────────────────────

const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
        <Icon className="h-3.5 w-3.5 text-white/30" />
        <h3 className="text-[9px] font-black tracking-[0.3em] text-white/30 uppercase">{title}</h3>
    </div>
)

const StatInput = ({
    label, value, onChange, min = 0, max = 9999,
}: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) => (
    <div className="flex flex-col gap-1">
        <label className="text-[8px] font-black text-white/30 uppercase tracking-widest">{label}</label>
        <input
            type="number" min={min} max={max}
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500/60 transition-colors"
        />
    </div>
)

// ─── Main Component ───────────────────────────────────────────────────────────

interface EntityCreatorProps {
    initialType: 'monster' | 'npc'
    onBack: () => void
}

export default function EntityCreator({ initialType, onBack }: EntityCreatorProps) {
    const { world, setMonsterTemplates, setNPCTemplates, setLootTables } = useGameStore()

    // Mode
    const [creatorType, setCreatorType] = useState<CreatorType>(initialType)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Common fields
    const [entityId, setEntityId] = useState('')
    const [name, setName] = useState('')
    const [color, setColor] = useState('#ef4444')
    const [face, setFace] = useState<FaceKey>('skull')
    const [tags, setTags] = useState('')

    // Monster-specific
    const [stats, setStats] = useState<CharacterStats>({ ...DEFAULT_STATS })
    const [lootEntries, setLootEntries] = useState<LootEntry[]>([DEFAULT_LOOT_ENTRY()])
    const [abilities, setAbilities] = useState('')

    // NPC-specific
    const [npcLogic, setNpcLogic] = useState<NPCLogicType>('dialog')

    // UI state
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
    const [activeSection, setActiveSection] = useState<'form' | 'list'>('form')

    // ── Helpers ──
    const resetForm = () => {
        setEntityId('')
        setName('')
        setColor('#ef4444')
        setFace('skull')
        setTags('')
        setStats({ ...DEFAULT_STATS })
        setLootEntries([DEFAULT_LOOT_ENTRY()])
        setAbilities('')
        setEditingId(null)
        setSaveStatus('idle')
    }

    const updateStat = (key: keyof CharacterStats, val: number) =>
        setStats(prev => ({ ...prev, [key]: val }))

    const addLootRow = () => setLootEntries(prev => [...prev, DEFAULT_LOOT_ENTRY()])

    const removeLootRow = (i: number) =>
        setLootEntries(prev => prev.filter((_, idx) => idx !== i))

    const updateLootRow = (i: number, field: keyof LootEntry, val: string | number) =>
        setLootEntries(prev =>
            prev.map((entry, idx) => idx === i ? { ...entry, [field]: val } : entry)
        )

    const handleSave = () => {
        if (!entityId || !name) { setSaveStatus('error'); return }

        if (creatorType === 'monster') {
            const tableId = `lt_${entityId}`
            const newTable: LootTable = {
                table_id: tableId,
                name: `${name} Loot`,
                entries: lootEntries.filter(e => e.item_id.trim() !== ''),
            }
            const newTables = [
                ...world.lootTables.filter(t => t.table_id !== tableId),
                newTable,
            ]
            setLootTables(newTables)

            const newMonster: MonsterTemplate = {
                monster_id: entityId,
                name,
                stats,
                abilities: abilities.split(',').map(s => s.trim()).filter(Boolean),
                tags: tags.split(',').map(s => s.trim()).filter(Boolean),
                loot_table_id: tableId,
                appearance: { color, face },
            }
            const existing = world.monsterTemplates.filter(m => m.monster_id !== entityId)
            setMonsterTemplates([...existing, newMonster])
        } else {
            const newNPC: NPCTemplate = {
                npc_id: entityId,
                name,
                appearance: { color, face },
                dialog_tree: [],
                tags: tags.split(',').map(s => s.trim()).filter(Boolean),
            }
            const existing = world.npcTemplates.filter(n => n.npc_id !== entityId)
            setNPCTemplates([...existing, newNPC])
        }

        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
        resetForm()
    }

    const loadForEdit = useCallback((id: string) => {
        if (creatorType === 'monster') {
            const m = world.monsterTemplates.find(m => m.monster_id === id)
            if (!m) return
            setEntityId(m.monster_id)
            setName(m.name)
            setColor(m.appearance.color)
            setFace(m.appearance.face as FaceKey)
            setStats({ ...DEFAULT_STATS, ...m.stats })
            setTags(m.tags.join(', '))
            setAbilities(m.abilities.join(', '))
            const table = world.lootTables.find(t => t.table_id === m.loot_table_id)
            setLootEntries(table?.entries.length ? table.entries : [DEFAULT_LOOT_ENTRY()])
            setEditingId(id)
            setActiveSection('form')
        } else {
            const n = world.npcTemplates.find(n => n.npc_id === id)
            if (!n) return
            setEntityId(n.npc_id)
            setName(n.name)
            setColor(n.appearance.color)
            setFace(n.appearance.face as FaceKey)
            setTags(n.tags.join(', '))
            setEditingId(id)
            setActiveSection('form')
        }
    }, [creatorType, world])

    const handleDelete = (id: string) => {
        if (creatorType === 'monster') {
            setMonsterTemplates(world.monsterTemplates.filter(m => m.monster_id !== id))
            setLootTables(world.lootTables.filter(t => t.table_id !== `lt_${id}`))
        } else {
            setNPCTemplates(world.npcTemplates.filter(n => n.npc_id !== id))
        }
    }

    const FaceIcon = FACES_MAP[face] || Ghost
    const templates = creatorType === 'monster' ? world.monsterTemplates : world.npcTemplates
    const templateIds = creatorType === 'monster'
        ? world.monsterTemplates.map(m => m.monster_id)
        : world.npcTemplates.map(n => n.npc_id)

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col">
            {/* Ambient */}
            <div className="pointer-events-none fixed inset-0">
                <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-rose-500/5 blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-indigo-500/5 blur-[120px]" />
            </div>

            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 flex items-center gap-4 px-8 py-5 border-b border-white/5"
            >
                <button
                    onClick={onBack}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-3">
                    {creatorType === 'monster' ? <Skull className="h-5 w-5 text-rose-400" /> : <User className="h-5 w-5 text-amber-400" />}
                    <div>
                        <h1 className="font-black italic uppercase tracking-tight text-lg text-white">
                            {creatorType === 'monster' ? 'Monster Creator' : 'NPC Creator'}
                        </h1>
                        <p className="text-[9px] font-bold tracking-[0.3em] text-white/30 uppercase">Entity Database</p>
                    </div>
                </div>

                {/* Type toggle */}
                <div className="ml-auto flex items-center bg-white/5 border border-white/10 p-1 rounded-xl gap-1">
                    {(['monster', 'npc'] as CreatorType[]).map(t => (
                        <button
                            key={t}
                            onClick={() => { setCreatorType(t); resetForm() }}
                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                                ${creatorType === t ? (t === 'monster' ? 'bg-rose-500 text-white shadow-lg' : 'bg-amber-500 text-black shadow-lg') : 'text-white/30 hover:text-white'}`}
                        >
                            {t === 'monster' ? <Skull className="h-3 w-3" /> : <User className="h-3 w-3" />}
                            {t}
                        </button>
                    ))}
                </div>

                {/* Section tabs */}
                <div className="flex gap-1 bg-white/5 border border-white/10 p-1 rounded-xl">
                    {(['form', 'list'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setActiveSection(s)}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                                ${activeSection === s ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white'}`}
                        >
                            {s === 'form' ? 'Create / Edit' : `Library (${templates.length})`}
                        </button>
                    ))}
                </div>
            </motion.header>

            {/* Content */}
            <div className="relative z-10 flex-1 overflow-auto">
                <AnimatePresence mode="wait">
                    {activeSection === 'form' ? (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="max-w-6xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8"
                        >
                            {/* ── LEFT: Preview ── */}
                            <div className="flex flex-col items-center gap-6">
                                {/* Preview Avatar */}
                                <div className="w-full flex flex-col items-center gap-4 p-8 rounded-2xl bg-white/3 border border-white/5">
                                    <motion.div
                                        key={color + face}
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        style={{ backgroundColor: color }}
                                        className="h-32 w-32 rounded-full flex items-center justify-center shadow-2xl relative"
                                    >
                                        <FaceIcon className="h-16 w-16 text-white drop-shadow-xl" strokeWidth={2.5} />
                                        <div className="absolute inset-0 rounded-full border-[6px] border-white/10" />
                                    </motion.div>
                                    <div className="text-center">
                                        <p className="font-black italic uppercase tracking-tight text-white text-lg">{name || '—'}</p>
                                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-0.5">{entityId || 'no id set'}</p>
                                    </div>
                                </div>

                                {/* Quick Identity */}
                                <div className="w-full space-y-3 p-5 rounded-2xl bg-white/3 border border-white/5">
                                    <SectionHeader icon={Hash} title="Identity" />

                                    <div>
                                        <label className="text-[8px] font-black text-white/30 uppercase tracking-widest block mb-1">Entity ID</label>
                                        <input
                                            value={entityId}
                                            onChange={e => setEntityId(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                                            placeholder="mob_100"
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-black text-white/30 uppercase tracking-widest block mb-1">Display Name</label>
                                        <input
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            placeholder="Forest Goblin"
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-colors"
                                        />
                                    </div>

                                    {/* Save/Cancel */}
                                    <div className="pt-2 space-y-2">
                                        <button
                                            onClick={handleSave}
                                            className={`w-full h-11 rounded-xl font-black text-[11px] tracking-[0.2em] uppercase flex items-center justify-center gap-2 transition-all
                                                ${saveStatus === 'saved' ? 'bg-emerald-500 text-white' : saveStatus === 'error' ? 'bg-rose-500 text-white' : 'bg-white text-black hover:bg-emerald-500 hover:text-white'}`}
                                        >
                                            {saveStatus === 'saved' ? <CheckCircle2 className="h-4 w-4" /> : saveStatus === 'error' ? <AlertTriangle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                                            {saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Fill ID & Name' : editingId ? 'Update Entity' : 'Save Entity'}
                                        </button>
                                        {editingId && (
                                            <button onClick={resetForm} className="w-full h-9 rounded-xl border border-white/10 text-white/30 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all">
                                                New Entity
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── MIDDLE: Appearance + Stats ── */}
                            <div className="space-y-6">
                                {/* Color Picker */}
                                <div className="p-5 rounded-2xl bg-white/3 border border-white/5 space-y-4">
                                    <SectionHeader icon={Palette} title="Color Spectrum" />

                                    {/* Full color wheel + hex */}
                                    <div className="flex items-center gap-3">
                                        <label className="relative cursor-pointer flex-shrink-0">
                                            <input
                                                type="color"
                                                value={color}
                                                onChange={e => setColor(e.target.value)}
                                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                            />
                                            <div
                                                className="h-14 w-14 rounded-xl border-4 border-white/10 shadow-lg transition-all hover:scale-105"
                                                style={{ backgroundColor: color }}
                                            />
                                        </label>
                                        <div className="flex-1">
                                            <label className="text-[8px] font-black text-white/30 uppercase tracking-widest block mb-1">Hex Code</label>
                                            <input
                                                value={color}
                                                onChange={e => {
                                                    const v = e.target.value
                                                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setColor(v)
                                                }}
                                                placeholder="#ef4444"
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-indigo-500/50 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {/* Preset swatches */}
                                    <div className="grid grid-cols-6 gap-2">
                                        {PRESET_COLORS.map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setColor(c)}
                                                style={{ backgroundColor: c }}
                                                className={`h-8 rounded-lg border-2 transition-all ${color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100 hover:scale-105'}`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Face Selector */}
                                <div className="p-5 rounded-2xl bg-white/3 border border-white/5 space-y-3">
                                    <SectionHeader icon={Smile} title="Face Identity" />
                                    <div className="grid grid-cols-5 gap-2">
                                        {FACES.map(f => {
                                            const Icon = FACES_MAP[f]
                                            return (
                                                <button
                                                    key={f}
                                                    onClick={() => setFace(f)}
                                                    className={`h-11 w-full rounded-xl flex items-center justify-center border-2 transition-all
                                                        ${face === f ? 'border-white/60 bg-white/10 scale-105' : 'border-transparent bg-white/3 hover:bg-white/8 opacity-50 hover:opacity-100'}`}
                                                >
                                                    <Icon className={`h-5 w-5 ${face === f ? 'text-white' : 'text-white/40'}`} />
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Stats (monster only) */}
                                {creatorType === 'monster' && (
                                    <div className="p-5 rounded-2xl bg-white/3 border border-white/5 space-y-3">
                                        <SectionHeader icon={BarChart2} title="Base Stats" />
                                        <div className="grid grid-cols-2 gap-3">
                                            <StatInput label="HP" value={stats.hp} onChange={v => { updateStat('hp', v); updateStat('maxHp', v) }} />
                                            <StatInput label="MP" value={stats.mp} onChange={v => { updateStat('mp', v); updateStat('maxMp', v) }} />
                                            <StatInput label="ATK" value={stats.atk} onChange={v => updateStat('atk', v)} />
                                            <StatInput label="DEF" value={stats.def} onChange={v => updateStat('def', v)} />
                                            <StatInput label="SPD" value={stats.spd} onChange={v => updateStat('spd', v)} />
                                            <StatInput label="LUCK" value={stats.luck} onChange={v => updateStat('luck', v)} />
                                            <StatInput label="Level" value={stats.level} onChange={v => updateStat('level', v)} />
                                        </div>
                                    </div>
                                )}

                                {/* NPC Logic Type */}
                                {creatorType === 'npc' && (
                                    <div className="p-5 rounded-2xl bg-white/3 border border-white/5 space-y-3">
                                        <SectionHeader icon={User} title="NPC Logic Type" />
                                        <div className="grid grid-cols-3 gap-2">
                                            {(['dialog', 'merchant', 'trader'] as NPCLogicType[]).map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => setNpcLogic(t)}
                                                    className={`py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all
                                                        ${npcLogic === t ? 'bg-amber-500 border-amber-400 text-black' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white'}`}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ── RIGHT: Loot Table + Skills ── */}
                            <div className="space-y-6">
                                {/* Loot Table (monster only) */}
                                {creatorType === 'monster' && (
                                    <div className="p-5 rounded-2xl bg-white/3 border border-white/5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <SectionHeader icon={PackageOpen} title="Loot Table" />
                                            <button
                                                onClick={addLootRow}
                                                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-black transition-all"
                                            >
                                                <Plus className="h-3 w-3" /> Add Row
                                            </button>
                                        </div>

                                        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                                            {lootEntries.map((entry, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, y: -4 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-2.5 relative group"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[8px] font-black text-white/20 w-4 text-right">{i + 1}</span>
                                                        <input
                                                            value={entry.item_id}
                                                            onChange={e => updateLootRow(i, 'item_id', e.target.value)}
                                                            placeholder="item_id (e.g. potion_01)"
                                                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white font-mono placeholder-white/20 focus:outline-none focus:border-indigo-500/50"
                                                        />
                                                        <button
                                                            onClick={() => removeLootRow(i)}
                                                            className="p-1 rounded text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </div>

                                                    {/* Chance slider */}
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[7px] font-black text-white/20 uppercase tracking-widest">Drop Chance</label>
                                                            <span className={`text-[8px] font-black font-mono ${entry.chance >= 0.8 ? 'text-emerald-400' : entry.chance >= 0.4 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                                {(entry.chance * 100).toFixed(0)}%
                                                            </span>
                                                        </div>
                                                        <input
                                                            type="range" min={0} max={1} step={0.01}
                                                            value={entry.chance}
                                                            onChange={e => updateLootRow(i, 'chance', Number(e.target.value))}
                                                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                                            style={{
                                                                background: `linear-gradient(to right, rgb(99 102 241) ${entry.chance * 100}%, rgba(255,255,255,0.07) ${entry.chance * 100}%)`
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Amount */}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-[7px] font-black text-white/20 uppercase tracking-widest block mb-1">Min Qty</label>
                                                            <input
                                                                type="number" min={1} max={999}
                                                                value={entry.min_amount}
                                                                onChange={e => updateLootRow(i, 'min_amount', Number(e.target.value))}
                                                                className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] text-white font-mono focus:outline-none focus:border-indigo-500/50"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[7px] font-black text-white/20 uppercase tracking-widest block mb-1">Max Qty</label>
                                                            <input
                                                                type="number" min={1} max={999}
                                                                value={entry.max_amount}
                                                                onChange={e => updateLootRow(i, 'max_amount', Number(e.target.value))}
                                                                className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] text-white font-mono focus:outline-none focus:border-indigo-500/50"
                                                            />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Skills / Tags */}
                                <div className="p-5 rounded-2xl bg-white/3 border border-white/5 space-y-3">
                                    {creatorType === 'monster' && (
                                        <>
                                            <SectionHeader icon={Zap} title="Skills (Ability IDs)" />
                                            <input
                                                value={abilities}
                                                onChange={e => setAbilities(e.target.value)}
                                                placeholder="slash_01, fireball_02, heal_01"
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 font-mono focus:outline-none focus:border-indigo-500/50 transition-colors"
                                            />
                                        </>
                                    )}
                                    <SectionHeader icon={Tag} title="Gameplay Tags" />
                                    <input
                                        value={tags}
                                        onChange={e => setTags(e.target.value)}
                                        placeholder="undead, boss, fire_immune"
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 font-mono focus:outline-none focus:border-indigo-500/50 transition-colors"
                                    />
                                    {tags && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                                                <span key={t} className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-bold uppercase">
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        /* ── LIST VIEW ── */
                        <motion.div
                            key="list"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="max-w-4xl mx-auto px-8 py-8"
                        >
                            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white mb-6">
                                {creatorType === 'monster' ? 'Monster' : 'NPC'} Library
                            </h2>

                            {templates.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 text-white/20">
                                    <Skull className="h-12 w-12 mb-4 opacity-30" />
                                    <p className="text-sm font-bold uppercase tracking-widest">No templates yet</p>
                                    <p className="text-xs mt-1">Create one using the form</p>
                                    <button onClick={() => setActiveSection('form')} className="mt-6 px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-all">
                                        Open Form
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {(creatorType === 'monster' ? world.monsterTemplates : world.npcTemplates).map((entity: any) => {
                                        const id = creatorType === 'monster' ? entity.monster_id : entity.npc_id
                                        const FIcon = FACES_MAP[entity.appearance.face as FaceKey] || Ghost
                                        const lootTable = creatorType === 'monster' ? world.lootTables.find(t => t.table_id === `lt_${id}`) : null

                                        return (
                                            <motion.div
                                                key={id}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="p-4 rounded-2xl bg-white/3 border border-white/5 hover:bg-white/5 transition-all group"
                                            >
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: entity.appearance.color }}>
                                                        <FIcon className="h-6 w-6 text-white" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black italic uppercase tracking-tight text-white text-sm truncate">{entity.name}</p>
                                                        <p className="text-[8px] font-mono text-white/30 truncate">{id}</p>
                                                    </div>
                                                </div>

                                                {entity.tags?.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mb-3">
                                                        {entity.tags.slice(0, 3).map((t: string) => (
                                                            <span key={t} className="px-1.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[7px] font-bold uppercase">{t}</span>
                                                        ))}
                                                    </div>
                                                )}

                                                {lootTable && (
                                                    <p className="text-[8px] text-white/20 mb-3">{lootTable.entries.length} loot entr{lootTable.entries.length === 1 ? 'y' : 'ies'}</p>
                                                )}

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => loadForEdit(id)}
                                                        className="flex-1 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(id)}
                                                        className="p-1.5 rounded-lg text-white/20 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
            `}</style>
        </div>
    )
}

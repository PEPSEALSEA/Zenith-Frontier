'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    useGameStore,
    Quest,
    QuestReward,
    QuestHook,
} from '@/store/gameStore'
import {
    ScrollText,
    ChevronLeft,
    Plus,
    Trash2,
    Save,
    CheckCircle2,
    AlertTriangle,
    Eye,
    EyeOff,
    Sword,
    Package,
    MessageCircle,
    Coins,
    Star,
    Link,
    Zap,
    ChevronDown,
    ChevronRight,
    GripVertical,
    ArrowRight,
} from 'lucide-react'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mkHook = (): QuestHook => ({ type: 'give_item', value: '' })
const mkItemReward = () => ({ item_id: '', amount: 1 })

const QUEST_TYPES: { id: Quest['type']; icon: any; label: string; color: string }[] = [
    { id: 'kill', icon: Sword, label: 'Kill', color: 'text-rose-400' },
    { id: 'collect', icon: Package, label: 'Collect', color: 'text-amber-400' },
    { id: 'talk', icon: MessageCircle, label: 'Talk', color: 'text-indigo-400' },
]

const HOOK_TYPES: QuestHook['type'][] = ['give_item', 'set_flag', 'unlock_quest', 'teleport']

const DEFAULT_QUEST = (): Quest => ({
    quest_id: '',
    name: '',
    description: '',
    type: 'kill',
    target_id: '',
    target_count: 1,
    rewards: { money: 0, exp: 0, items: [], unlock_quest_id: '' },
    is_hidden: false,
    prerequisite_quest_id: '',
    next_quest_id: '',
    on_start: [],
    on_complete: [],
})

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
        <Icon className="h-3.5 w-3.5 text-white/30" />
        <h3 className="text-[9px] font-black tracking-[0.3em] text-white/30 uppercase">{title}</h3>
    </div>
)

const FieldBox = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1">
        <label className="text-[8px] font-black text-white/30 uppercase tracking-widest block">{label}</label>
        {children}
    </div>
)

const inputCls = "w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-colors"
const textareaCls = `${inputCls} resize-none`

// Hook row
const HookRow = ({
    hook, onChange, onRemove,
}: { hook: QuestHook; onChange: (h: QuestHook) => void; onRemove: () => void }) => (
    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/30 border border-white/5">
        <GripVertical className="h-3.5 w-3.5 text-white/10 flex-shrink-0" />
        <select
            value={hook.type}
            onChange={e => onChange({ ...hook, type: e.target.value as QuestHook['type'] })}
            className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white font-mono focus:outline-none focus:border-indigo-500/50 flex-shrink-0"
        >
            {HOOK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
            value={String(hook.value ?? '')}
            onChange={e => onChange({ ...hook, value: e.target.value })}
            placeholder={hook.type === 'give_item' ? 'item_id' : hook.type === 'set_flag' ? 'flag_name' : hook.type === 'unlock_quest' ? 'quest_id' : 'x,y'}
            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white font-mono placeholder-white/20 focus:outline-none focus:border-indigo-500/50"
        />
        <button onClick={onRemove} className="p-1 rounded text-white/20 hover:text-rose-400 transition-colors flex-shrink-0">
            <Trash2 className="h-3 w-3" />
        </button>
    </div>
)

// ─── Quest chain mini-map ─────────────────────────────────────────────────────

const QuestChainPreview = ({ quests, highlightId }: { quests: Quest[]; highlightId: string }) => {
    // Build a simple chain starting from quests with no prerequisite
    const roots = quests.filter(q => !q.prerequisite_quest_id)
    const getNext = (id: string) => quests.find(q => q.quest_id === id)

    const renderChain = (q: Quest, depth = 0): React.ReactNode => {
        if (depth > 8) return null
        const next = q.next_quest_id ? getNext(q.next_quest_id) : null
        return (
            <div key={q.quest_id} className="flex items-center gap-2">
                <div className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase transition-all
                    ${q.quest_id === highlightId
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : 'bg-white/3 border-white/10 text-white/40'}`}>
                    {q.name || q.quest_id}
                </div>
                {next && (
                    <>
                        <ArrowRight className="h-3 w-3 text-white/20 flex-shrink-0" />
                        {renderChain(next, depth + 1)}
                    </>
                )}
            </div>
        )
    }

    if (roots.length === 0) return null

    return (
        <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-2 overflow-x-auto custom-scrollbar-x">
            <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2">Quest Chain Preview</p>
            {roots.map(r => (
                <div key={r.quest_id} className="flex items-center gap-2 flex-wrap">
                    {renderChain(r)}
                </div>
            ))}
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface QuestEditorProps {
    onBack: () => void
}

export default function QuestEditor({ onBack }: QuestEditorProps) {
    const { world, setQuests } = useGameStore()

    const [quest, setQuest] = useState<Quest>(DEFAULT_QUEST())
    const [editingId, setEditingId] = useState<string | null>(null)
    const [activeSection, setActiveSection] = useState<'form' | 'list'>('form')
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
    const [expandedSection, setExpandedSection] = useState<string | null>('core')

    // ── Field helpers ──
    const set = <K extends keyof Quest>(key: K, value: Quest[K]) =>
        setQuest(prev => ({ ...prev, [key]: value }))

    const setReward = <K extends keyof QuestReward>(key: K, value: QuestReward[K]) =>
        setQuest(prev => ({ ...prev, rewards: { ...prev.rewards, [key]: value } }))

    const addItemReward = () => setQuest(prev => ({
        ...prev,
        rewards: { ...prev.rewards, items: [...(prev.rewards.items || []), mkItemReward()] }
    }))
    const removeItemReward = (i: number) => setQuest(prev => ({
        ...prev,
        rewards: { ...prev.rewards, items: prev.rewards.items?.filter((_, idx) => idx !== i) }
    }))
    const updateItemReward = (i: number, field: 'item_id' | 'amount', val: string | number) =>
        setQuest(prev => ({
            ...prev,
            rewards: {
                ...prev.rewards,
                items: prev.rewards.items?.map((it, idx) => idx === i ? { ...it, [field]: val } : it)
            }
        }))

    const addHook = (phase: 'on_start' | 'on_complete') =>
        setQuest(prev => ({ ...prev, [phase]: [...prev[phase], mkHook()] }))
    const updateHook = (phase: 'on_start' | 'on_complete', i: number, h: QuestHook) =>
        setQuest(prev => ({ ...prev, [phase]: prev[phase].map((x, idx) => idx === i ? h : x) }))
    const removeHook = (phase: 'on_start' | 'on_complete', i: number) =>
        setQuest(prev => ({ ...prev, [phase]: prev[phase].filter((_, idx) => idx !== i) }))

    // ── Save ──
    const handleSave = () => {
        if (!quest.quest_id || !quest.name) { setSaveStatus('error'); return }
        const updated = [
            ...world.quests.filter(q => q.quest_id !== quest.quest_id),
            quest
        ]
        setQuests(updated)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
        resetForm()
    }

    const resetForm = () => {
        setQuest(DEFAULT_QUEST())
        setEditingId(null)
        setSaveStatus('idle')
    }

    const loadForEdit = useCallback((id: string) => {
        const q = world.quests.find(q => q.quest_id === id)
        if (!q) return
        // Backfill missing fields for old quests
        setQuest({
            ...DEFAULT_QUEST(),
            ...q,
            on_start: q.on_start || [],
            on_complete: q.on_complete || [],
            rewards: {
                money: 0, exp: 0, items: [], unlock_quest_id: '',
                ...(typeof q.rewards === 'object' ? q.rewards : {})
            }
        })
        setEditingId(id)
        setActiveSection('form')
    }, [world.quests])

    const handleDelete = (id: string) => {
        setQuests(world.quests.filter(q => q.quest_id !== id))
        if (editingId === id) resetForm()
    }

    const toggleSection = (id: string) =>
        setExpandedSection(prev => prev === id ? null : id)

    const AccordionSection = ({ id, icon: Icon, title, count, children }: {
        id: string; icon: any; title: string; count?: number; children: React.ReactNode
    }) => (
        <div className="rounded-2xl bg-white/3 border border-white/5 overflow-hidden">
            <button
                onClick={() => toggleSection(id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-white/30" />
                    <span className="text-xs font-black uppercase tracking-widest text-white/60">{title}</span>
                    {count !== undefined && count > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[8px] font-black">{count}</span>
                    )}
                </div>
                {expandedSection === id
                    ? <ChevronDown className="h-3.5 w-3.5 text-white/30" />
                    : <ChevronRight className="h-3.5 w-3.5 text-white/30" />}
            </button>
            <AnimatePresence>
                {expandedSection === id && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 space-y-3 border-t border-white/5 pt-4">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col">
            {/* Ambient */}
            <div className="pointer-events-none fixed inset-0">
                <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-emerald-500/5 blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-indigo-500/5 blur-[100px]" />
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
                    <ScrollText className="h-5 w-5 text-emerald-400" />
                    <div>
                        <h1 className="font-black italic uppercase tracking-tight text-lg text-white">Quest Editor</h1>
                        <p className="text-[9px] font-bold tracking-[0.3em] text-white/30 uppercase">Story & Progression</p>
                    </div>
                </div>

                <div className="ml-auto flex gap-1 bg-white/5 border border-white/10 p-1 rounded-xl">
                    {(['form', 'list'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setActiveSection(s)}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                                ${activeSection === s ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white'}`}
                        >
                            {s === 'form' ? 'Create / Edit' : `Library (${world.quests.length})`}
                        </button>
                    ))}
                </div>
            </motion.header>

            {/* Body */}
            <div className="relative z-10 flex-1 overflow-auto">
                <AnimatePresence mode="wait">
                    {activeSection === 'form' ? (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="max-w-6xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8"
                        >
                            {/* ── LEFT: Identity + Save ── */}
                            <div className="space-y-4">
                                {/* Preview badge */}
                                <div className="p-5 rounded-2xl bg-white/3 border border-white/5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-black italic uppercase tracking-tight text-white text-lg">{quest.name || '—'}</p>
                                            <p className="text-[9px] font-mono text-white/30 mt-0.5">{quest.quest_id || 'no id set'}</p>
                                        </div>
                                        <div className={`px-3 py-1.5 rounded-full border text-[9px] font-black uppercase
                                            ${quest.type === 'kill' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                                : quest.type === 'collect' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                                    : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'}`}>
                                            {quest.type}
                                        </div>
                                    </div>

                                    {quest.is_hidden && (
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                            <EyeOff className="h-3 w-3 text-purple-400" />
                                            <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Hidden Quest</span>
                                        </div>
                                    )}

                                    {quest.description && (
                                        <p className="text-xs text-white/40 leading-relaxed">{quest.description}</p>
                                    )}
                                </div>

                                {/* Core identity */}
                                <div className="p-5 rounded-2xl bg-white/3 border border-white/5 space-y-3">
                                    <SectionHeader icon={ScrollText} title="Identity" />

                                    <FieldBox label="Quest ID">
                                        <input value={quest.quest_id}
                                            onChange={e => set('quest_id', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                                            placeholder="quest_kill_goblins_01"
                                            className={inputCls} />
                                    </FieldBox>
                                    <FieldBox label="Display Name">
                                        <input value={quest.name}
                                            onChange={e => set('name', e.target.value)}
                                            placeholder="Goblin Exterminator"
                                            className={inputCls} />
                                    </FieldBox>
                                    <FieldBox label="Description">
                                        <textarea value={quest.description}
                                            onChange={e => set('description', e.target.value)}
                                            placeholder="Defeat 10 goblins terrorizing the forest."
                                            rows={3}
                                            className={textareaCls} />
                                    </FieldBox>

                                    {/* Hidden toggle */}
                                    <button
                                        onClick={() => set('is_hidden', !quest.is_hidden)}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all
                                            ${quest.is_hidden ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/3 border-white/10 hover:bg-white/5'}`}
                                    >
                                        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/60">
                                            {quest.is_hidden ? <EyeOff className="h-3.5 w-3.5 text-purple-400" /> : <Eye className="h-3.5 w-3.5" />}
                                            Hidden Quest
                                        </span>
                                        <div className={`w-8 h-4 rounded-full transition-colors ${quest.is_hidden ? 'bg-purple-500' : 'bg-white/10'}`}>
                                            <div className={`w-3 h-3 rounded-full bg-white mt-0.5 transition-transform ${quest.is_hidden ? 'translate-x-4.5' : 'translate-x-0.5'} mx-0.5`} />
                                        </div>
                                    </button>
                                </div>

                                {/* Save */}
                                <div className="space-y-2">
                                    <button
                                        onClick={handleSave}
                                        className={`w-full h-12 rounded-xl font-black text-[11px] tracking-[0.2em] uppercase flex items-center justify-center gap-2 transition-all
                                            ${saveStatus === 'saved' ? 'bg-emerald-500 text-white' : saveStatus === 'error' ? 'bg-rose-500 text-white' : 'bg-white text-black hover:bg-emerald-500 hover:text-white'}`}
                                    >
                                        {saveStatus === 'saved' ? <CheckCircle2 className="h-4 w-4" /> : saveStatus === 'error' ? <AlertTriangle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                                        {saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Fill ID & Name' : editingId ? 'Update Quest' : 'Save Quest'}
                                    </button>
                                    {editingId && (
                                        <button onClick={resetForm} className="w-full h-9 rounded-xl border border-white/10 text-white/30 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all">
                                            New Quest
                                        </button>
                                    )}
                                </div>

                                {/* Chain preview */}
                                {world.quests.length > 0 && (
                                    <QuestChainPreview quests={world.quests} highlightId={quest.quest_id} />
                                )}
                            </div>

                            {/* ── RIGHT: Accordion panels ── */}
                            <div className="space-y-3">

                                {/* Objective */}
                                <AccordionSection id="core" icon={Sword} title="Objective">
                                    <div className="grid grid-cols-3 gap-2">
                                        {QUEST_TYPES.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => set('type', t.id)}
                                                className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all
                                                    ${quest.type === t.id ? 'border-white/40 bg-white/10 scale-[1.03]' : 'border-transparent bg-white/3 opacity-50 hover:opacity-100'}`}
                                            >
                                                <t.icon className={`h-6 w-6 ${quest.type === t.id ? t.color : 'text-white/30'}`} />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-white/60">{t.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mt-2">
                                        <FieldBox label={quest.type === 'kill' ? 'Monster ID' : quest.type === 'collect' ? 'Item ID' : 'NPC ID'}>
                                            <input value={quest.target_id}
                                                onChange={e => set('target_id', e.target.value)}
                                                placeholder={quest.type === 'kill' ? 'mob_goblin_01' : quest.type === 'collect' ? 'herb_red' : 'npc_elder'}
                                                className={inputCls} />
                                        </FieldBox>
                                        <FieldBox label={quest.type === 'talk' ? 'Talk Count' : 'Required Count'}>
                                            <input type="number" min={1}
                                                value={quest.target_count}
                                                onChange={e => set('target_count', Number(e.target.value))}
                                                className={inputCls} />
                                        </FieldBox>
                                    </div>
                                </AccordionSection>

                                {/* Rewards */}
                                <AccordionSection id="rewards" icon={Coins} title="Rewards" count={(quest.rewards.items?.length || 0) + (quest.rewards.money ? 1 : 0) + (quest.rewards.exp ? 1 : 0)}>
                                    <div className="grid grid-cols-2 gap-3">
                                        <FieldBox label="💰 Money">
                                            <input type="number" min={0}
                                                value={quest.rewards.money ?? 0}
                                                onChange={e => setReward('money', Number(e.target.value))}
                                                className={inputCls} />
                                        </FieldBox>
                                        <FieldBox label="⭐ EXP">
                                            <input type="number" min={0}
                                                value={quest.rewards.exp ?? 0}
                                                onChange={e => setReward('exp', Number(e.target.value))}
                                                className={inputCls} />
                                        </FieldBox>
                                    </div>

                                    <FieldBox label="🔓 Unlock Quest ID (on completion)">
                                        <div className="relative">
                                            <input
                                                value={quest.rewards.unlock_quest_id ?? ''}
                                                onChange={e => setReward('unlock_quest_id', e.target.value)}
                                                placeholder="quest_002 — leave blank if none"
                                                className={inputCls}
                                                list="quest-ids-datalist"
                                            />
                                            <datalist id="quest-ids-datalist">
                                                {world.quests.map(q => <option key={q.quest_id} value={q.quest_id}>{q.name}</option>)}
                                            </datalist>
                                        </div>
                                    </FieldBox>

                                    {/* Item rewards */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Item Rewards</span>
                                            <button
                                                onClick={addItemReward}
                                                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase hover:bg-emerald-500 hover:text-black transition-all"
                                            >
                                                <Plus className="h-3 w-3" /> Add Item
                                            </button>
                                        </div>
                                        {(quest.rewards.items || []).map((it, i) => (
                                            <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-black/30 border border-white/5">
                                                <Package className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                                                <input
                                                    value={it.item_id}
                                                    onChange={e => updateItemReward(i, 'item_id', e.target.value)}
                                                    placeholder="item_id"
                                                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white font-mono placeholder-white/20 focus:outline-none focus:border-indigo-500/50"
                                                />
                                                <span className="text-[8px] text-white/20 flex-shrink-0">×</span>
                                                <input
                                                    type="number" min={1}
                                                    value={it.amount}
                                                    onChange={e => updateItemReward(i, 'amount', Number(e.target.value))}
                                                    className="w-16 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white font-mono text-center focus:outline-none focus:border-indigo-500/50"
                                                />
                                                <button onClick={() => removeItemReward(i)} className="p-1 rounded text-white/20 hover:text-rose-400 transition-colors">
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                        {(quest.rewards.items || []).length === 0 && (
                                            <p className="text-[9px] text-white/20 text-center py-2">No item rewards</p>
                                        )}
                                    </div>
                                </AccordionSection>

                                {/* Chaining */}
                                <AccordionSection id="chain" icon={Link} title="Quest Chain & Prerequisites">
                                    <FieldBox label="Prerequisite Quest ID (must be completed first)">
                                        <input
                                            value={quest.prerequisite_quest_id ?? ''}
                                            onChange={e => set('prerequisite_quest_id', e.target.value)}
                                            placeholder="quest_001 — leave blank for freely available"
                                            className={inputCls}
                                            list="quest-ids-datalist"
                                        />
                                    </FieldBox>
                                    <FieldBox label="Next Quest ID (displayed as chain)">
                                        <input
                                            value={quest.next_quest_id ?? ''}
                                            onChange={e => set('next_quest_id', e.target.value)}
                                            placeholder="quest_002"
                                            className={inputCls}
                                            list="quest-ids-datalist"
                                        />
                                    </FieldBox>
                                    <p className="text-[8px] text-white/20 leading-relaxed">
                                        💡 Use <strong className="text-white/40">Prerequisite</strong> to gate this quest behind another. Use <strong className="text-white/40">Rewards → Unlock Quest</strong> to give the next quest upon completion.
                                    </p>
                                </AccordionSection>

                                {/* on_start hooks */}
                                <AccordionSection id="onstart" icon={Zap} title="On Start — Lifecycle Hooks" count={quest.on_start.length}>
                                    <p className="text-[8px] text-white/20 leading-relaxed mb-2">
                                        These actions fire the moment the player accepts this quest (e.g. give a starting item, unlock a flag, teleport them).
                                    </p>
                                    <div className="space-y-2">
                                        {quest.on_start.map((h, i) => (
                                            <HookRow key={i} hook={h}
                                                onChange={h => updateHook('on_start', i, h)}
                                                onRemove={() => removeHook('on_start', i)}
                                            />
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => addHook('on_start')}
                                        className="w-full mt-2 py-2 rounded-xl border border-dashed border-white/10 text-white/30 hover:text-white hover:border-white/30 text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1"
                                    >
                                        <Plus className="h-3 w-3" /> Add On-Start Hook
                                    </button>
                                </AccordionSection>

                                {/* on_complete hooks */}
                                <AccordionSection id="oncomplete" icon={CheckCircle2} title="On Complete — Lifecycle Hooks" count={quest.on_complete.length}>
                                    <p className="text-[8px] text-white/20 leading-relaxed mb-2">
                                        These actions fire when the player completes the quest objective (before rewards are given).
                                    </p>
                                    <div className="space-y-2">
                                        {quest.on_complete.map((h, i) => (
                                            <HookRow key={i} hook={h}
                                                onChange={h => updateHook('on_complete', i, h)}
                                                onRemove={() => removeHook('on_complete', i)}
                                            />
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => addHook('on_complete')}
                                        className="w-full mt-2 py-2 rounded-xl border border-dashed border-white/10 text-white/30 hover:text-white hover:border-white/30 text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1"
                                    >
                                        <Plus className="h-3 w-3" /> Add On-Complete Hook
                                    </button>
                                </AccordionSection>
                            </div>
                        </motion.div>
                    ) : (
                        /* ── LIST VIEW ── */
                        <motion.div
                            key="list"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="max-w-5xl mx-auto px-8 py-8"
                        >
                            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white mb-6">
                                Quest Library
                            </h2>

                            {world.quests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 text-white/20">
                                    <ScrollText className="h-12 w-12 mb-4 opacity-30" />
                                    <p className="text-sm font-bold uppercase tracking-widest">No quests yet</p>
                                    <p className="text-xs mt-1">Author one using the form</p>
                                    <button onClick={() => setActiveSection('form')} className="mt-6 px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-all">
                                        Open Form
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {world.quests.map(q => {
                                        const typeInfo = QUEST_TYPES.find(t => t.id === q.type)!
                                        return (
                                            <motion.div
                                                key={q.quest_id}
                                                initial={{ opacity: 0, y: 4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-5 rounded-2xl bg-white/3 border border-white/5 hover:bg-white/5 transition-all group"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                                        <div className={`p-2 rounded-xl bg-white/5 flex-shrink-0`}>
                                                            <typeInfo.icon className={`h-4 w-4 ${typeInfo.color}`} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <p className="font-black italic uppercase tracking-tight text-white">{q.name}</p>
                                                                {q.is_hidden && (
                                                                    <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[7px] font-black uppercase">Hidden</span>
                                                                )}
                                                            </div>
                                                            <p className="text-[9px] font-mono text-white/30 mt-0.5">{q.quest_id}</p>
                                                            {q.description && (
                                                                <p className="text-xs text-white/30 mt-2 line-clamp-2">{q.description}</p>
                                                            )}
                                                            <div className="flex flex-wrap gap-2 mt-3">
                                                                {q.rewards.money ? (
                                                                    <span className="text-[8px] font-bold text-amber-400">💰 {q.rewards.money}G</span>
                                                                ) : null}
                                                                {q.rewards.exp ? (
                                                                    <span className="text-[8px] font-bold text-yellow-400">⭐ {q.rewards.exp} EXP</span>
                                                                ) : null}
                                                                {(q.rewards.items || []).map((it, i) => (
                                                                    <span key={i} className="text-[8px] font-bold text-emerald-400">📦 {it.item_id} ×{it.amount}</span>
                                                                ))}
                                                                {q.rewards.unlock_quest_id && (
                                                                    <span className="text-[8px] font-bold text-indigo-400">🔓 {q.rewards.unlock_quest_id}</span>
                                                                )}
                                                                {q.on_start.length > 0 && (
                                                                    <span className="text-[8px] text-white/20">{q.on_start.length} start hook{q.on_start.length > 1 ? 's' : ''}</span>
                                                                )}
                                                                {q.on_complete.length > 0 && (
                                                                    <span className="text-[8px] text-white/20">{q.on_complete.length} complete hook{q.on_complete.length > 1 ? 's' : ''}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 flex-shrink-0">
                                                        <button
                                                            onClick={() => loadForEdit(q.quest_id)}
                                                            className="px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(q.quest_id)}
                                                            className="p-2 rounded-lg text-white/20 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
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
                .custom-scrollbar-x::-webkit-scrollbar { height: 4px; }
                .custom-scrollbar-x::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar-x::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
            `}</style>
        </div>
    )
}

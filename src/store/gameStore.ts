import { create } from 'zustand'
import { API_URL } from '@/lib/config'
import {
    type EquipmentDef,
    isConsumableType,
    isQuickSlotItem,
    isSkillScrollType,
    loadItemSlots,
    mapEquipmentRows,
    parseConsumableEffects,
    saveItemSlots,
} from '@/lib/items'

export interface InventoryItem {
    item_id: string
    quantity: number
    name?: string
}

export interface CharacterStats {
    hp: number
    maxHp: number
    mp: number
    maxMp: number
    level: number
    exp: number
    maxExp: number
    atk: number
    def: number
    spd: number
    luck: number
    money: number
}

export interface Job {
    id: string
    name: string
    level: number
    type: 'main' | 'sub' | 'hidden'
    skills: string[]
    stat_bonus?: string
    potential?: string
    attack_profile?: string
    tier?: string
    parent_job_id?: string
    description?: string
    is_hidden?: boolean
    unlock_condition?: string
    branch?: string
}

export interface SkillInfo {
    skill_id: string
    skill_name: string
    job_id: string
    tier: number
    parent_skill_id: string
    description: string
    unlock_type: string
    unlock_value: string
    skill_type: string
    mp_cost: number
    cooldown_ms: number
    power: number
    range: number
    effect: string
    owned?: boolean
}

export interface AllocatedStats {
    str: number
    dex: number
    int: number
    vit: number
    luk: number
}

export type GameToastKind = 'level' | 'gold' | 'item' | 'exp' | 'info'

export interface GameToast {
    id: string
    kind: GameToastKind
    title: string
    detail?: string
    createdAt: number
    count: number
    stackKey: string
}

export interface PlayerAppearance {
    color: string
    face: string
}

import { Ghost, Skull, Flame, Zap as BoltIcon, Star, Crown, Swords, Target as TargetIcon, Shield, Activity } from 'lucide-react'

export const FACES_MAP = {
    'ghost': Ghost,
    'skull': Skull,
    'fire': Flame,
    'bolt': BoltIcon,
    'star': Star,
    'crown': Crown,
    'swords': Swords,
    'target': TargetIcon,
    'shield': Shield,
    'heart': Activity,
}

export type FaceKey = keyof typeof FACES_MAP

export interface AuthState {
    user: {
        email: string
        name: string
        picture: string
    } | null
    isAuthenticated: boolean
}

export type WorldObjectType =
    | 'monster'
    | 'boss'
    | 'spawner'
    | 'town'
    | 'safezone'
    | 'npc'
    | 'market'
    | 'hotel'
    | 'landmark'
    | 'forest'

export interface WorldObject {
    id: string
    type: WorldObjectType
    x: number
    y: number
    z?: number
    name: string
    radius: number
    params?: any
}

// --- Quest Reward ---
export interface QuestReward {
    money?: number
    exp?: number
    items?: { item_id: string; amount: number }[]
    unlock_quest_id?: string  // chained quest to give the player on completion
}

// --- Quest Lifecycle Hooks ---
export interface QuestHook {
    type: 'give_item' | 'set_flag' | 'unlock_quest' | 'teleport'
    value?: string | number
}

export interface Quest {
    quest_id: string
    name: string
    description: string
    type: 'kill' | 'collect' | 'talk'
    target_id: string
    target_count: number
    rewards: QuestReward
    is_hidden: boolean
    prerequisite_quest_id?: string // must be completed before this is offered
    next_quest_id?: string          // chained quest (used for display/logic)
    on_start: QuestHook[]           // hooks fired when quest activates
    on_complete: QuestHook[]        // hooks fired when quest completes
}

export interface PlayerQuest {
    quest_id: string
    status: 'active' | 'completed' | 'failed'
    progress: number
}

// --- Gameplay Ability System (GAS) ---
export interface GameplayTag {
    id: string
    description?: string
}

export interface GameplayAttribute {
    id: string
    value: number
    baseValue: number
}

export interface GameplayAbility {
    ability_id: string
    name: string
    description: string
    cooldown: number
    cost: { type: 'mp' | 'hp' | 'sp', amount: number }
    effects: any[] // visual or buff effects
}

// --- Dialog & Quests ---
export interface DialogCondition {
    type: 'item' | 'tag' | 'quest' | 'level'
    target_id: string
    value?: number // e.g., required amount or level
}

export interface DialogAction {
    type: 'shop' | 'quest' | 'trade' | 'trigger_event'
    target_id?: string
}

export interface DialogNode {
    id: string
    text: string
    speaker: string
    conditions: DialogCondition[]
    action?: DialogAction
    next_nodes: string[] // IDs of next dialog options
}

// --- Loot System ---
export interface LootEntry {
    item_id: string
    chance: number // float 0.0 - 1.0
    min_amount: number
    max_amount: number
}

export interface LootTable {
    table_id: string
    name: string
    entries: LootEntry[]
}

// --- Templates (Data Definitions) ---

export interface NPCTemplate {
    npc_id: string
    name: string
    appearance: PlayerAppearance
    dialog_tree: DialogNode[] // Conditional dialogs
    tags: string[] // Active Gameplay Tags
}

export interface MonsterTemplate {
    monster_id: string
    name: string
    stats: CharacterStats
    abilities: string[] // List of GameplayAbility IDs
    tags: string[] // List of GameplayTag IDs
    loot_table_id: string
    appearance: PlayerAppearance
}

export interface Spawner {
    spawner_id: string
    monster_id: string
    x: number
    y: number
    z: number
    range: number
    spawn_rate: number
    max_monsters: number
}

export interface GameState {
    auth: AuthState
    isInitialized: boolean
    authBootComplete: boolean
    isHydratingSession: boolean
    isEditorMode: boolean
    isForgeMode: boolean
    isAdminDashboard: boolean
    player: {
        name: string
        appearance: PlayerAppearance
        stats: CharacterStats
        alloc: AllocatedStats
        statPoints: number
        skillSlots: [string, string, string, string]
        itemSlots: [string, string]
        ownedSkillIds: string[]
        skillCatalog: SkillInfo[]
        equipmentCatalog: EquipmentDef[]
        jobMastery: number
        jobMasteryExp: number
        skillCooldowns: Record<string, number>
        itemCooldowns: Record<string, number>
        pendingLevelUps: number
        jobs: {
            main: Job | null
            sub: Job | null
        }
        equipment: {
            weapon: string | null
            armor: string | null
            accessory: string | null
        }
        inventory: InventoryItem[]
        titles: string[]
        hiddenParams: {
            vorpalSoul: number
            karma: number
        }
        position: { x: number, y: number }
    }
    world: {
        manaCycle: number
        moonPhase: number
        activeScenario: string | null
        bossesDefeated: string[]
        lastAttack: { type: 'light' | 'hard' | null, time: number }
        lastSkillCast: { skillId: string; time: number } | null

        // Instances
        objects: WorldObject[]
        spawners: Spawner[]
        playerQuests: PlayerQuest[]

        // Data Definitions (Templates)
        npcTemplates: NPCTemplate[]
        monsterTemplates: MonsterTemplate[]
        quests: Quest[]
        lootTables: LootTable[]
        abilities: GameplayAbility[]
        tags: GameplayTag[]
    }
    forgeSelection: { type: WorldObjectType, id?: string, name?: string } | null
    toasts: GameToast[]

    // Actions
    login: (userData: any) => void
    logout: () => void
    deleteAllProgress: () => Promise<boolean>
    setAuthBootComplete: (v: boolean) => void
    setHydratingSession: (v: boolean) => void
    setEditorMode: (enabled: boolean) => void
    initializeCharacter: (name: string, appearance: PlayerAppearance, job: Job, statsOverride?: Partial<CharacterStats>, inventory?: InventoryItem[]) => void
    hydrateFromServer: (email: string) => Promise<boolean>
    enterForgeMode: () => void
    exitForgeMode: () => void
    enterAdminDashboard: () => void
    exitAdminDashboard: () => void
    gainExp: (amount: number) => void
    takeDamage: (amount: number) => void
    healFull: () => void
    spendMoney: (amount: number) => boolean
    buyItem: (opts: { itemId: string; price: number; name?: string }) => Promise<boolean>
    setMainJob: (job: Job) => void
    setSubJob: (job: Job) => void
    equipSubJob: (jobId: string) => Promise<boolean>
    updatePosition: (x: number, y: number) => void
    addInventoryItem: (item: InventoryItem | string) => void
    setInventory: (items: InventoryItem[]) => void
    updateWorldCycle: (delta: number) => void
    attack: (type: 'light' | 'hard') => void
    castSkillSlot: (slot: 1 | 2 | 3 | 4) => boolean
    allocateStat: (stat: keyof AllocatedStats) => Promise<boolean>
    setSkillSlot: (slot: 1 | 2 | 3 | 4, skillId: string) => Promise<boolean>
    setItemSlot: (slot: 1 | 2, itemId: string) => boolean
    useItem: (itemId: string) => Promise<boolean>
    useItemSlot: (slot: 1 | 2) => Promise<boolean>
    unlockSkill: (skillId: string) => Promise<boolean>
    useSkillScroll: (itemId: string) => Promise<boolean>
    promoteJob: (jobId: string) => Promise<boolean>
    clearPendingLevelUps: () => void
    refreshSkills: () => Promise<void>
    refreshEquipmentCatalog: () => Promise<void>
    pushToast: (toast: Omit<GameToast, 'id' | 'createdAt' | 'count' | 'stackKey'> & { id?: string }) => void
    dismissToast: (id: string) => void
    addMoney: (amount: number) => void
    applyKillRewards: (opts: { exp: number; money: number; items?: string[] }) => Promise<void>
    syncHpToServer: () => Promise<void>
    addWorldObject: (obj: WorldObject) => void
    removeWorldObject: (id: string) => void
    updateWorldObject: (id: string, updates: Partial<WorldObject>) => void
    setWorldObjects: (objects: WorldObject[]) => void

    // Persistence
    saveWorldToGAS: () => Promise<void>
    loadWorldFromGAS: () => Promise<void>

    // New Actions
    setMonsterTemplates: (monsters: MonsterTemplate[]) => void
    setNPCTemplates: (npcs: NPCTemplate[]) => void
    setQuests: (quests: Quest[]) => void
    setSpawners: (spawners: Spawner[]) => void
    setLootTables: (tables: LootTable[]) => void
    setAbilities: (abilities: GameplayAbility[]) => void
    setPlayerQuests: (pQuests: PlayerQuest[]) => void
    updateQuestProgress: (questId: string, progress: number) => void
    setForgeSelection: (selection: { type: WorldObjectType, id?: string, name?: string } | null) => void

    // Logic Utilities
    rollLootTable: (tableId: string) => { item_id: string, count: number }[]
    evaluateDialogCondition: (condition: DialogCondition) => boolean
}

import { combatFromAlloc, parseSkillRow, STAT_POINTS_PER_LEVEL } from '@/lib/classSystem'

export const ADMIN_EMAIL = 'sealseapep@gmail.com'
const GAS_URL = API_URL

function applyJobStatBonus(base: CharacterStats, job: Job, statBonus?: string): CharacterStats {
    const next = { ...base }
    const raw = statBonus || ''
    if (raw) {
        for (const part of raw.split(',')) {
            const m = part.trim().match(/^(atk|def|spd|hp|mp|luck)([+-]\d+)$/i)
            if (!m) continue
            const key = m[1].toLowerCase()
            const delta = parseInt(m[2], 10)
            if (key === 'atk') next.atk += delta
            else if (key === 'def') next.def += delta
            else if (key === 'spd') next.spd += delta
            else if (key === 'luck') next.luck += delta
            else if (key === 'hp') {
                next.maxHp += delta
                next.hp += delta
            } else if (key === 'mp') {
                next.maxMp += delta
                next.mp += delta
            }
        }
        return next
    }
    if (job.id === 'JOB_001') next.atk += 5
    if (job.id === 'JOB_005') {
        next.mp += 20
        next.maxMp += 20
    }
    return next
}

function mapSkillRows(rows: Record<string, string>[], ownedIds: Set<string>): SkillInfo[] {
    return rows.map((r) => {
        const s = parseSkillRow(r)
        return { ...s, owned: ownedIds.has(s.skill_id) }
    })
}

const STACKABLE_TOAST_KINDS = new Set<GameToastKind>(['gold', 'item', 'exp'])

function toastStackKey(kind: GameToastKind, title: string, detail?: string): string {
    if (kind === 'gold') return 'gold'
    if (kind === 'exp') return 'exp'
    if (kind === 'item') return `item:${title}`
    return `${kind}:${title}:${detail || ''}`
}

function sumToastAmount(prevTitle: string, nextTitle: string, unit: string): string {
    const a = Number((prevTitle.match(/[\d,]+/) || ['0'])[0].replace(/,/g, '')) || 0
    const b = Number((nextTitle.match(/[\d,]+/) || ['0'])[0].replace(/,/g, '')) || 0
    return `+${(a + b).toLocaleString()} ${unit}`
}

function mergeStackedTitle(kind: GameToastKind, prevTitle: string, nextTitle: string): string {
    if (kind === 'gold') return sumToastAmount(prevTitle, nextTitle, 'Silver')
    if (kind === 'exp') return sumToastAmount(prevTitle, nextTitle, 'EXP')
    return nextTitle || prevTitle
}

export const useGameStore = create<GameState>((set, get) => ({
    auth: {
        user: null,
        isAuthenticated: false,
    },
    isInitialized: false,
    authBootComplete: false,
    isHydratingSession: false,
    isEditorMode: false,
    isForgeMode: false,
    isAdminDashboard: false,
    player: {
        name: 'Adventurer',
        appearance: {
            color: '#10b981',
            face: 'ghost'
        },
        stats: {
            hp: 100, maxHp: 100, mp: 50, maxMp: 50,
            level: 1, exp: 0, maxExp: 100,
            atk: 10, def: 5, spd: 12, luck: 8, money: 100
        },
        alloc: { str: 5, dex: 5, int: 5, vit: 5, luk: 5 },
        statPoints: 0,
        skillSlots: ['', '', '', ''],
        itemSlots: ['', ''],
        ownedSkillIds: [],
        skillCatalog: [],
        equipmentCatalog: [],
        jobMastery: 1,
        jobMasteryExp: 0,
        skillCooldowns: {},
        itemCooldowns: {},
        pendingLevelUps: 0,
        jobs: { main: null, sub: null },
        equipment: { weapon: null, armor: null, accessory: null },
        inventory: [],
        titles: [],
        hiddenParams: { vorpalSoul: 0, karma: 0 },
        position: { x: 400, y: 300 }
    },
    world: {
        manaCycle: 0.5,
        moonPhase: 0,
        activeScenario: null,
        bossesDefeated: [],
        lastAttack: { type: null, time: 0 },
        lastSkillCast: null,
        objects: [],
        spawners: [],
        playerQuests: [],
        npcTemplates: [],
        monsterTemplates: [],
        quests: [],
        lootTables: [],
        abilities: [],
        tags: []
    },
    forgeSelection: null,
    toasts: [],

    login: (userData) => {
        set((state) => ({
            auth: { user: userData, isAuthenticated: true },
            player: {
                ...state.player,
                name: userData.name || state.player.name,
                itemSlots: loadItemSlots(userData.email),
            },
        }))
        get().loadWorldFromGAS()
        void get().refreshEquipmentCatalog()
    },

    logout: () => set({
        auth: { user: null, isAuthenticated: false },
        isInitialized: false,
        isEditorMode: false,
        isAdminDashboard: false,
        isHydratingSession: false,
        authBootComplete: true,
    }),

    deleteAllProgress: async () => {
        const { auth, pushToast } = get()
        const email = auth.user?.email
        if (!email) return false
        const { gasService, formatGasError } = await import('@/services/gasService')
        const res = await gasService.deletePlayer(email)
        if (!res.startsWith('OK|')) {
            pushToast({
                kind: 'info',
                title: 'Delete failed',
                detail: formatGasError(res, 'Could not wipe save'),
            })
            return false
        }
        try {
            localStorage.removeItem(`zf_item_slots_${email}`)
        } catch { /* ignore */ }
        set((state) => ({
            isInitialized: false,
            isEditorMode: false,
            isForgeMode: false,
            isAdminDashboard: false,
            isHydratingSession: false,
            authBootComplete: true,
            player: {
                ...state.player,
                name: auth.user?.name || 'Adventurer',
                appearance: { color: '#10b981', face: 'ghost' },
                stats: {
                    hp: 100, maxHp: 100, mp: 50, maxMp: 50,
                    level: 1, exp: 0, maxExp: 100,
                    atk: 10, def: 5, spd: 12, luck: 8, money: 100,
                },
                alloc: { str: 5, dex: 5, int: 5, vit: 5, luk: 5 },
                statPoints: 0,
                skillSlots: ['', '', '', ''],
                itemSlots: ['', ''],
                ownedSkillIds: [],
                skillCatalog: [],
                jobMastery: 1,
                jobMasteryExp: 0,
                skillCooldowns: {},
                itemCooldowns: {},
                pendingLevelUps: 0,
                jobs: { main: null, sub: null },
                equipment: { weapon: null, armor: null, accessory: null },
                inventory: [],
                titles: [],
                hiddenParams: { vorpalSoul: 0, karma: 0 },
                position: { x: 400, y: 300 },
            },
            toasts: [],
        }))
        pushToast({
            kind: 'info',
            title: 'Progress wiped',
            detail: 'Create a new character to continue',
        })
        return true
    },

    setAuthBootComplete: (v) => set({ authBootComplete: v }),
    setHydratingSession: (v) => set({ isHydratingSession: v }),

    setEditorMode: (enabled) => set({ isEditorMode: enabled }),

    enterAdminDashboard: () => set({ isAdminDashboard: true }),
    exitAdminDashboard: () => set({ isAdminDashboard: false }),

    initializeCharacter: (name, appearance, job, statsOverride, inventory) => {
        set((state) => {
            const alloc = { str: 5, dex: 5, int: 5, vit: 5, luk: 5 }
            const combat = combatFromAlloc(alloc, (job as any).stat_bonus || job.stat_bonus)
            const base = statsOverride ? { ...state.player.stats, ...statsOverride } : {
                ...state.player.stats,
                atk: combat.atk,
                def: combat.def,
                spd: combat.spd,
                luck: combat.luck,
                maxHp: combat.maxHp,
                hp: combat.maxHp,
                maxMp: combat.maxMp,
                mp: combat.maxMp,
            }
            return {
                isInitialized: true,
                player: {
                    ...state.player,
                    name,
                    appearance,
                    jobs: { ...state.player.jobs, main: job },
                    stats: base,
                    alloc,
                    inventory: inventory || state.player.inventory,
                    itemSlots: loadItemSlots(state.auth.user?.email),
                },
            }
        })
        void get().refreshEquipmentCatalog()
    },

    hydrateFromServer: async (email) => {
        const { gasService } = await import('@/services/gasService')
        const hydrated = await gasService.loadHydratedPlayer(email)
        if (!hydrated) return false
        const jobs = await gasService.getAllJobs()
        const jobRow = jobs.find((j) => j.id === hydrated.main_job_id)
        const job: Job = jobRow || {
            id: hydrated.main_job_id || 'JOB_001',
            name: 'Adventurer',
            level: 1,
            type: 'main',
            skills: [],
        }
        const subRow = hydrated.sub_job_id
            ? jobs.find((j) => j.id === hydrated.sub_job_id) || null
            : null
        const subJob: Job | null = subRow
            ? { ...subRow, type: 'sub' }
            : null
        const ownedRows = await gasService.getPlayerSkills(email)
        let ownedIds = ownedRows.map((r) => String(r.skill_id)).filter(Boolean)
        let skillSlots = hydrated.skill_slots
        if (ownedIds.length === 0 && hydrated.main_job_id) {
            await gasService.setMainJob(email, hydrated.main_job_id)
            const granted = await gasService.getPlayerSkills(email)
            ownedIds = granted.map((r) => String(r.skill_id)).filter(Boolean)
            const refreshed = await gasService.getPlayer(email)
            if (refreshed) {
                skillSlots = [
                    String(refreshed.skill_slot_1 || ''),
                    String(refreshed.skill_slot_2 || ''),
                    String(refreshed.skill_slot_3 || ''),
                    String(refreshed.skill_slot_4 || ''),
                ]
            }
        }
        const catalog = mapSkillRows(await gasService.getAllSkills(), new Set(ownedIds))
        const equipmentRows = await gasService.getAllEquipment()
        const equipmentCatalog = mapEquipmentRows(equipmentRows as Record<string, string>[])
        const combat = combatFromAlloc(
            { str: hydrated.str, dex: hydrated.dex, int: hydrated.int, vit: hydrated.vit, luk: hydrated.luk },
            job.stat_bonus,
        )
        set((state) => ({
            isInitialized: true,
            player: {
                ...state.player,
                name: hydrated.name,
                appearance: hydrated.appearance,
                jobs: { ...state.player.jobs, main: job, sub: subJob },
                stats: {
                    ...hydrated.stats,
                    maxHp: Math.max(hydrated.stats.hp, combat.maxHp),
                    maxMp: Math.max(hydrated.stats.mp, combat.maxMp),
                    atk: hydrated.stats.atk || combat.atk,
                    def: hydrated.stats.def || combat.def,
                    spd: hydrated.stats.spd || combat.spd,
                    luck: hydrated.stats.luck || combat.luck,
                },
                inventory: hydrated.inventory,
                alloc: {
                    str: hydrated.str,
                    dex: hydrated.dex,
                    int: hydrated.int,
                    vit: hydrated.vit,
                    luk: hydrated.luk,
                },
                statPoints: hydrated.stat_points,
                skillSlots: skillSlots,
                itemSlots: loadItemSlots(email),
                ownedSkillIds: ownedIds,
                skillCatalog: catalog,
                equipmentCatalog,
                jobMastery: hydrated.job_mastery,
                jobMasteryExp: hydrated.job_mastery_exp,
            },
        }))
        return true
    },

    enterForgeMode: () => set({
        isInitialized: true,
        isEditorMode: true,
        isForgeMode: true,
        isAdminDashboard: false,
    }),

    exitForgeMode: () => set({
        isInitialized: false,
        isEditorMode: false,
        isForgeMode: false,
        isAdminDashboard: true,
    }),

    gainExp: (amount) => {
        const before = get().player.stats.level
        set((state) => {
            let { exp, level, maxExp } = state.player.stats
            let statPoints = state.player.statPoints
            let pending = state.player.pendingLevelUps
            exp += amount
            while (exp >= maxExp && level < 99) {
                exp -= maxExp
                level++
                maxExp = Math.floor(maxExp * 1.5)
                statPoints += STAT_POINTS_PER_LEVEL
                pending += 1
            }
            return {
                player: {
                    ...state.player,
                    statPoints,
                    pendingLevelUps: pending,
                    stats: { ...state.player.stats, exp, level, maxExp },
                },
            }
        })
        const after = get().player.stats.level
        if (after > before) {
            get().pushToast({
                kind: 'level',
                title: `LEVEL UP  ${after}`,
                detail: `+${(after - before) * STAT_POINTS_PER_LEVEL} potential · open Job System`,
            })
            get().clearPendingLevelUps()
        }
    },

    clearPendingLevelUps: () => set((state) => ({
        player: { ...state.player, pendingLevelUps: 0 },
    })),

    pushToast: (toast) => {
        const stackKey = toastStackKey(toast.kind, toast.title, toast.detail)
        const now = Date.now()
        set((state) => {
            if (STACKABLE_TOAST_KINDS.has(toast.kind)) {
                const idx = state.toasts.findIndex((t) => t.stackKey === stackKey)
                if (idx !== -1) {
                    const existing = state.toasts[idx]
                    const merged: GameToast = {
                        ...existing,
                        title: mergeStackedTitle(toast.kind, existing.title, toast.title),
                        detail: toast.detail ?? existing.detail,
                        count: existing.count + 1,
                        createdAt: now,
                    }
                    const next = [...state.toasts]
                    next.splice(idx, 1)
                    next.push(merged)
                    return { toasts: next.slice(-6) }
                }
            }
            const id = toast.id || `toast_${now}_${Math.random().toString(36).slice(2, 7)}`
            return {
                toasts: [
                    ...state.toasts.slice(-5),
                    {
                        id,
                        kind: toast.kind,
                        title: toast.title,
                        detail: toast.detail,
                        createdAt: now,
                        count: 1,
                        stackKey,
                    },
                ],
            }
        })
    },

    dismissToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
    })),

    takeDamage: (amount) => set((state) => ({
        player: { ...state.player, stats: { ...state.player.stats, hp: Math.max(0, state.player.stats.hp - amount) } }
    })),

    healFull: () => set((state) => ({
        player: {
            ...state.player,
            stats: {
                ...state.player.stats,
                hp: state.player.stats.maxHp,
                mp: state.player.stats.maxMp,
            },
        },
    })),

    spendMoney: (amount) => {
        const money = get().player.stats.money
        if (amount > money) return false
        set((state) => ({
            player: {
                ...state.player,
                stats: { ...state.player.stats, money: state.player.stats.money - amount },
            },
        }))
        return true
    },

    buyItem: async ({ itemId, price, name }) => {
        const { auth, spendMoney, addInventoryItem, pushToast, player, setItemSlot } = get()
        if (!spendMoney(price)) return false
        const catalogName = player.equipmentCatalog.find((e) => e.item_id === itemId)?.item_name
        const label = name || catalogName || itemId
        addInventoryItem({ item_id: itemId, quantity: 1, name: label })
        pushToast({
            kind: 'item',
            title: label,
            detail: price > 0 ? `Purchased · −${price} G` : 'Obtained',
        })
        const def = player.equipmentCatalog.find((e) => e.item_id === itemId)
        if (isConsumableType(def?.item_type || (itemId === 'EQ_004' ? 'consumable' : ''))) {
            if (!player.itemSlots[0]) setItemSlot(1, itemId)
            else if (!player.itemSlots[1] && player.itemSlots[0] !== itemId) setItemSlot(2, itemId)
        }
        const email = auth.user?.email
        if (email) {
            const { gasService } = await import('@/services/gasService')
            if (price) {
                const moneyRes = await gasService.addMoney(email, -price)
                if (moneyRes.startsWith('OK|MONEY_UPDATED|')) {
                    const m = Number(moneyRes.split('|')[2])
                    if (!Number.isNaN(m)) {
                        set((state) => ({
                            player: { ...state.player, stats: { ...state.player.stats, money: m } },
                        }))
                    }
                }
            }
            await gasService.addItem(email, itemId, 1)
        }
        return true
    },

    setMainJob: (job) => set((state) => ({ player: { ...state.player, jobs: { ...state.player.jobs, main: job } } })),
    setSubJob: (job) => set((state) => ({ player: { ...state.player, jobs: { ...state.player.jobs, sub: job } } })),
    equipSubJob: async (jobId) => {
        const { auth, pushToast } = get()
        const email = auth.user?.email
        if (!email) return false
        const { gasService } = await import('@/services/gasService')
        const res = await gasService.setSubJob(email, jobId)
        if (!res.startsWith('OK|')) {
            pushToast({ kind: 'info', title: 'Sub job', detail: res.replace(/^ERROR\|/, '') || 'Failed' })
            return false
        }
        const jobs = await gasService.getAllJobs()
        const job = jobs.find((j) => j.id === jobId)
        if (job) {
            set((state) => ({
                player: {
                    ...state.player,
                    jobs: { ...state.player.jobs, sub: { ...job, type: 'sub' } },
                },
            }))
            pushToast({ kind: 'info', title: job.name, detail: 'Equipped as sub job' })
        }
        await get().refreshSkills()
        return true
    },
    updatePosition: (x, y) => set((state) => ({ player: { ...state.player, position: { x, y } } })),
    addInventoryItem: (item) => set((state) => {
        const entry: InventoryItem = typeof item === 'string' ? { item_id: item, quantity: 1 } : item
        const existing = state.player.inventory.find((i) => i.item_id === entry.item_id)
        if (existing) {
            return {
                player: {
                    ...state.player,
                    inventory: state.player.inventory.map((i) =>
                        i.item_id === entry.item_id
                            ? { ...i, quantity: i.quantity + (entry.quantity || 1) }
                            : i,
                    ),
                },
            }
        }
        return {
            player: {
                ...state.player,
                inventory: [...state.player.inventory, { ...entry, quantity: entry.quantity || 1 }],
            },
        }
    }),
    setInventory: (items) => set((state) => ({
        player: { ...state.player, inventory: items },
    })),

    updateWorldCycle: (delta) => set((state) => ({
        world: { ...state.world, manaCycle: (state.world.manaCycle + delta) % 1 }
    })),

    attack: (type) => set((state) => ({
        world: { ...state.world, lastAttack: { type, time: Date.now() } }
    })),

    castSkillSlot: (slot) => {
        const state = get()
        const { pushToast } = state
        const skillId = state.player.skillSlots[slot - 1]
        if (!skillId) {
            pushToast({ kind: 'info', title: `Skill ${slot}`, detail: 'Empty — equip in Skills' })
            return false
        }
        const skill = state.player.skillCatalog.find((s) => s.skill_id === skillId)
        if (!skill) {
            pushToast({ kind: 'info', title: `Skill ${slot}`, detail: 'Skill data missing — reopen Skills' })
            return false
        }
        const now = Date.now()
        const cdUntil = state.player.skillCooldowns[skillId] || 0
        if (now < cdUntil) {
            const left = ((cdUntil - now) / 1000).toFixed(1)
            pushToast({ kind: 'info', title: skill.skill_name, detail: `Cooldown ${left}s` })
            return false
        }
        if (state.player.stats.mp < skill.mp_cost) {
            pushToast({ kind: 'info', title: skill.skill_name, detail: `Need ${skill.mp_cost} MP` })
            return false
        }
        set((s) => ({
            player: {
                ...s.player,
                stats: { ...s.player.stats, mp: s.player.stats.mp - skill.mp_cost },
                skillCooldowns: {
                    ...s.player.skillCooldowns,
                    [skillId]: now + skill.cooldown_ms,
                },
            },
            world: {
                ...s.world,
                lastSkillCast: { skillId, time: now },
            },
        }))
        return true
    },

    allocateStat: async (stat) => {
        const { auth, player } = get()
        if (player.statPoints < 1) return false
        const email = auth.user?.email
        if (email) {
            const { gasService } = await import('@/services/gasService')
            const res = await gasService.allocateStat(email, stat)
            if (!res.startsWith('OK|')) return false
        }
        set((state) => {
            const alloc = { ...state.player.alloc, [stat]: state.player.alloc[stat] + 1 }
            const combat = combatFromAlloc(alloc, state.player.jobs.main?.stat_bonus)
            return {
                player: {
                    ...state.player,
                    alloc,
                    statPoints: state.player.statPoints - 1,
                    stats: {
                        ...state.player.stats,
                        atk: combat.atk,
                        def: combat.def,
                        spd: combat.spd,
                        luck: combat.luck,
                        maxHp: combat.maxHp,
                        maxMp: combat.maxMp,
                        hp: Math.min(state.player.stats.hp, combat.maxHp),
                        mp: Math.min(state.player.stats.mp, combat.maxMp),
                    },
                },
            }
        })
        return true
    },

    setSkillSlot: async (slot, skillId) => {
        const { auth, player, pushToast } = get()
        if (skillId && !player.ownedSkillIds.includes(skillId)) {
            pushToast({ kind: 'info', title: 'Cannot equip', detail: 'Unlock this skill first' })
            return false
        }
        const email = auth.user?.email
        if (email) {
            const { gasService, formatGasError } = await import('@/services/gasService')
            const res = await gasService.setSkillLoadout(email, slot, skillId)
            if (!res.startsWith('OK|')) {
                pushToast({ kind: 'info', title: 'Equip failed', detail: formatGasError(res) })
                return false
            }
        }
        set((state) => {
            const slots = [...state.player.skillSlots] as [string, string, string, string]
            for (let i = 0; i < 4; i++) {
                if (i !== slot - 1 && slots[i] === skillId) slots[i] = ''
            }
            slots[slot - 1] = skillId
            return { player: { ...state.player, skillSlots: slots } }
        })
        if (skillId) {
            const sk = get().player.skillCatalog.find((s) => s.skill_id === skillId)
            pushToast({
                kind: 'info',
                title: sk?.skill_name || skillId,
                detail: `Equipped to slot ${slot}`,
            })
        }
        return true
    },

    setItemSlot: (slot, itemId) => {
        const { auth, player, pushToast } = get()
        if (itemId) {
            const inv = player.inventory.find((i) => i.item_id === itemId)
            if (!inv || inv.quantity < 1) {
                pushToast({ kind: 'info', title: 'No item', detail: 'Not in bag' })
                return false
            }
            const def = player.equipmentCatalog.find((e) => e.item_id === itemId)
            const allowed = def
                ? isQuickSlotItem(def)
                : itemId === 'EQ_004' || String(inv.name || '').toLowerCase().includes('potion')
            if (!allowed) {
                pushToast({ kind: 'info', title: 'Cannot assign', detail: 'Only consumables on Z / X' })
                return false
            }
        }
        set((state) => {
            const slots = [...state.player.itemSlots] as [string, string]
            slots[slot - 1] = itemId
            saveItemSlots(slots, auth.user?.email)
            return { player: { ...state.player, itemSlots: slots } }
        })
        if (itemId) {
            const name = get().player.equipmentCatalog.find((e) => e.item_id === itemId)?.item_name
                || get().player.inventory.find((i) => i.item_id === itemId)?.name
                || itemId
            pushToast({ kind: 'info', title: `Slot ${slot === 1 ? 'Z' : 'X'}`, detail: name })
        }
        return true
    },

    useItem: async (itemId) => {
        const state = get()
        const { auth, pushToast, syncHpToServer } = state
        const inv = state.player.inventory.find((i) => i.item_id === itemId)
        if (!inv || inv.quantity < 1) {
            pushToast({ kind: 'info', title: 'Empty', detail: 'No more of this item' })
            return false
        }

        const now = Date.now()
        const cdUntil = state.player.itemCooldowns[itemId] || 0
        if (now < cdUntil) return false

        const def = state.player.equipmentCatalog.find((e) => e.item_id === itemId)
        const itemType = def?.item_type || (itemId.startsWith('EQ_SCR_') ? 'skill_scroll' : itemId === 'EQ_004' ? 'consumable' : '')
        const name = def?.item_name || inv.name || itemId

        if (isSkillScrollType(itemType)) {
            return get().useSkillScroll(itemId)
        }

        if (!isConsumableType(itemType)) {
            pushToast({ kind: 'info', title: name, detail: 'This item cannot be used' })
            return false
        }

        const effects = parseConsumableEffects(def?.base_stats || (itemId === 'EQ_004' ? 'heal+50' : ''))
        if (effects.heal <= 0 && effects.mp <= 0) {
            pushToast({ kind: 'info', title: name, detail: 'No usable effect' })
            return false
        }

        const { hp, maxHp, mp, maxMp } = state.player.stats
        if (effects.heal > 0 && hp >= maxHp && effects.mp <= 0) {
            pushToast({ kind: 'info', title: name, detail: 'HP already full' })
            return false
        }
        if (effects.mp > 0 && mp >= maxMp && effects.heal <= 0) {
            pushToast({ kind: 'info', title: name, detail: 'MP already full' })
            return false
        }

        const healed = Math.min(effects.heal, Math.max(0, maxHp - hp))
        const restored = Math.min(effects.mp, Math.max(0, maxMp - mp))

        set((s) => ({
            player: {
                ...s.player,
                inventory: s.player.inventory
                    .map((i) => (i.item_id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
                    .filter((i) => i.quantity > 0),
                stats: {
                    ...s.player.stats,
                    hp: Math.min(maxHp, s.player.stats.hp + effects.heal),
                    mp: Math.min(maxMp, s.player.stats.mp + effects.mp),
                },
                itemCooldowns: {
                    ...s.player.itemCooldowns,
                    [itemId]: now + 700,
                },
            },
        }))

        const parts: string[] = []
        if (healed > 0) parts.push(`+${healed} HP`)
        if (restored > 0) parts.push(`+${restored} MP`)
        pushToast({ kind: 'item', title: name, detail: parts.join(' · ') || 'Used' })

        const email = auth.user?.email
        if (email) {
            const { gasService } = await import('@/services/gasService')
            await gasService.removeItem(email, itemId, 1)
            await syncHpToServer()
        }
        return true
    },

    useItemSlot: async (slot) => {
        const itemId = get().player.itemSlots[slot - 1]
        if (!itemId) {
            get().pushToast({ kind: 'info', title: `Slot ${slot === 1 ? 'Z' : 'X'}`, detail: 'Empty — assign in Bag' })
            return false
        }
        return get().useItem(itemId)
    },

    unlockSkill: async (skillId) => {
        const { auth, pushToast } = get()
        const email = auth.user?.email
        if (!email) {
            pushToast({ kind: 'info', title: 'Unlock failed', detail: 'Not signed in' })
            return false
        }
        const { gasService, formatGasError } = await import('@/services/gasService')
        const res = await gasService.unlockSkill(email, skillId)
        if (!res.startsWith('OK|')) {
            pushToast({ kind: 'info', title: 'Unlock failed', detail: formatGasError(res) })
            return false
        }
        await get().refreshSkills()
        const sk = get().player.skillCatalog.find((s) => s.skill_id === skillId)
        pushToast({
            kind: 'info',
            title: sk?.skill_name || skillId,
            detail: sk?.unlock_type === 'gold' ? 'Purchased' : 'Skill unlocked',
        })
        const player = await gasService.getPlayer(email)
        if (player?.money !== undefined) {
            set((state) => ({
                player: {
                    ...state.player,
                    stats: { ...state.player.stats, money: Number(player.money) || state.player.stats.money },
                },
            }))
        }
        return true
    },

    useSkillScroll: async (itemId) => {
        const { auth, pushToast } = get()
        const email = auth.user?.email
        if (!email) {
            pushToast({ kind: 'info', title: 'Scroll failed', detail: 'Not signed in' })
            return false
        }
        const { gasService, formatGasError } = await import('@/services/gasService')
        const res = await gasService.useSkillScroll(email, itemId)
        if (!res.startsWith('OK|')) {
            pushToast({ kind: 'info', title: 'Scroll failed', detail: formatGasError(res) })
            return false
        }
        const skillId = res.split('|')[2] || ''
        set((state) => ({
            player: {
                ...state.player,
                inventory: state.player.inventory
                    .map((i) => i.item_id === itemId ? { ...i, quantity: i.quantity - 1 } : i)
                    .filter((i) => i.quantity > 0),
            },
        }))
        await get().refreshSkills()
        const sk = get().player.skillCatalog.find((s) => s.skill_id === skillId)
        pushToast({
            kind: 'info',
            title: sk?.skill_name || skillId || 'Scroll',
            detail: 'Learned from scroll',
        })
        return true
    },

    promoteJob: async (jobId) => {
        const { auth, pushToast } = get()
        const email = auth.user?.email
        if (!email) return false
        const { gasService } = await import('@/services/gasService')
        const res = await gasService.promoteJob(email, jobId)
        if (!res.startsWith('OK|')) return false
        const jobs = await gasService.getAllJobs()
        const job = jobs.find((j) => j.id === jobId)
        if (job) {
            set((state) => ({
                player: {
                    ...state.player,
                    jobs: { ...state.player.jobs, main: job },
                    jobMastery: 1,
                    jobMasteryExp: 0,
                },
            }))
            pushToast({
                kind: 'level',
                title: job.name,
                detail: 'Job promotion complete',
            })
        }
        await get().refreshSkills()
        return true
    },

    refreshSkills: async () => {
        const { auth } = get()
        const email = auth.user?.email
        if (!email) return
        const { gasService } = await import('@/services/gasService')
        let ownedRows = await gasService.getPlayerSkills(email)
        let ownedIds = ownedRows.map((r) => String(r.skill_id)).filter(Boolean)
        const jobId = get().player.jobs.main?.id
        if (ownedIds.length === 0 && jobId) {
            await gasService.setMainJob(email, jobId)
            ownedRows = await gasService.getPlayerSkills(email)
            ownedIds = ownedRows.map((r) => String(r.skill_id)).filter(Boolean)
        }
        const catalog = mapSkillRows(await gasService.getAllSkills(), new Set(ownedIds))
        const player = await gasService.getPlayer(email)
        set((state) => ({
            player: {
                ...state.player,
                ownedSkillIds: ownedIds,
                skillCatalog: catalog,
                skillSlots: player ? [
                    String(player.skill_slot_1 || ''),
                    String(player.skill_slot_2 || ''),
                    String(player.skill_slot_3 || ''),
                    String(player.skill_slot_4 || ''),
                ] : state.player.skillSlots,
            },
        }))
    },

    refreshEquipmentCatalog: async () => {
        try {
            const { gasService } = await import('@/services/gasService')
            const rows = await gasService.getAllEquipment()
            const equipmentCatalog = mapEquipmentRows(rows as Record<string, string>[])
            set((state) => ({
                player: {
                    ...state.player,
                    equipmentCatalog,
                    inventory: state.player.inventory.map((i) => ({
                        ...i,
                        name: equipmentCatalog.find((e) => e.item_id === i.item_id)?.item_name || i.name || i.item_id,
                    })),
                },
            }))
        } catch {
            /* catalog optional offline */
        }
    },

    addMoney: (amount) => {
        set((state) => ({
            player: { ...state.player, stats: { ...state.player.stats, money: state.player.stats.money + amount } },
        }))
        if (amount > 0) {
            get().pushToast({
                kind: 'gold',
                title: `+${amount.toLocaleString()} Silver`,
                detail: 'Currency obtained',
            })
        }
    },

    applyKillRewards: async ({ exp, money, items }) => {
        const { auth, addMoney, addInventoryItem, pushToast } = get()
        const email = auth.user?.email

        if (!email) {
            get().gainExp(exp)
            if (money) addMoney(money)
            for (const id of items || []) {
                addInventoryItem({ item_id: id, quantity: 1 })
                const named = get().player.inventory.find((i) => i.item_id === id)
                pushToast({
                    kind: 'item',
                    title: named?.name || id,
                    detail: 'Item acquired',
                })
            }
            return
        }

        if (money) addMoney(money)
        for (const id of items || []) {
            addInventoryItem({ item_id: id, quantity: 1 })
            const named = get().player.inventory.find((i) => i.item_id === id)
            pushToast({
                kind: 'item',
                title: named?.name || id,
                detail: 'Item acquired',
            })
        }

        const { gasService } = await import('@/services/gasService')
        const expRes = await gasService.addExp(email, exp, 12)
        if (expRes.startsWith('OK|EXP_ADDED|')) {
            const parts = expRes.split('|')
            const level = Number(parts[2])
            const serverExp = Number(parts[3])
            const leveled = Number(parts[4]) || 0
            const statPoints = Number(parts[5])
            const mastery = Number(parts[6])
            const masteryExp = Number(parts[7])
            if (!Number.isNaN(level)) {
                set((state) => ({
                    player: {
                        ...state.player,
                        statPoints: Number.isNaN(statPoints) ? state.player.statPoints : statPoints,
                        jobMastery: Number.isNaN(mastery) ? state.player.jobMastery : mastery,
                        jobMasteryExp: Number.isNaN(masteryExp) ? state.player.jobMasteryExp : masteryExp,
                        pendingLevelUps: 0,
                        stats: {
                            ...state.player.stats,
                            level,
                            exp: serverExp,
                            maxExp: (() => {
                                let need = 100
                                for (let i = 1; i < level; i++) need = Math.floor(need * 1.5)
                                return need
                            })(),
                        },
                    },
                }))
            }
            if (leveled > 0) {
                const { sfx } = await import('@/lib/sfx')
                sfx.levelUp()
                pushToast({
                    kind: 'level',
                    title: `LEVEL UP  ${level}`,
                    detail: `+${leveled * STAT_POINTS_PER_LEVEL} potential · allocate in Job System`,
                })
            }
        }
        if (money) {
            const moneyRes = await gasService.addMoney(email, money)
            if (moneyRes.startsWith('OK|MONEY_UPDATED|')) {
                const m = Number(moneyRes.split('|')[2])
                if (!Number.isNaN(m)) {
                    set((state) => ({
                        player: { ...state.player, stats: { ...state.player.stats, money: m } },
                    }))
                }
            }
            const { sfx } = await import('@/lib/sfx')
            sfx.coin()
        }
        for (const id of items || []) {
            await gasService.addItem(email, id, 1)
        }
    },

    syncHpToServer: async () => {
        const { auth, player } = get()
        const email = auth.user?.email
        if (!email) return
        const { gasService } = await import('@/services/gasService')
        await gasService.updateStats(email, { hp: player.stats.hp, mp: player.stats.mp })
    },

    addWorldObject: (obj) => set((state) => ({
        world: { ...state.world, objects: [...state.world.objects, obj] }
    })),

    removeWorldObject: (id) => set((state) => ({
        world: { ...state.world, objects: state.world.objects.filter(o => o.id !== id) }
    })),

    updateWorldObject: (id, updates) => set((state) => ({
        world: { ...state.world, objects: state.world.objects.map(o => o.id === id ? { ...o, ...updates } : o) }
    })),

    setWorldObjects: (objects) => set((state) => ({ world: { ...state.world, objects } })),

    saveWorldToGAS: async () => {
        const { world, auth } = get()
        if (auth.user?.email !== ADMIN_EMAIL) return

        try {
            const formData = new URLSearchParams()
            formData.append('action', 'save_world_map')
            // Store world objects as plain text rows "id|type|x|y|z|name|radius|params"
            const lines: string[] = []
            for (const obj of world.objects) {
                const id = String(obj.id || '')
                const type = String(obj.type || '')
                const x = String(obj.x ?? 0)
                const y = String(obj.y ?? 0)
                const z = String(obj.z ?? 0)
                const name = String(obj.name || '')
                const radius = String(obj.radius ?? 0)
                const params = Object.entries(obj.params || {})
                    .map(([k, v]) => `${k}=${String(v)}`)
                    .join(';')
                lines.push([id, type, x, y, z, name, radius, params].join('|'))
            }
            formData.append('objects_text', lines.join('\n'))

            await fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            })
            console.log("World saved to GAS as text")
        } catch (e) {
            console.error("Failed to save world:", e)
        }
    },

    loadWorldFromGAS: async () => {
        try {
            const res = await fetch(`${GAS_URL}?action=get_world_map`)
            const text = await res.text()
            if (text.startsWith("ERROR") || text === "EMPTY") return

            const lines = text.split("\n")
            const headers = lines[0].split("|").slice(1)
            const objects: WorldObject[] = []

            for (let i = 1; i < lines.length; i++) {
                const vals = lines[i].split("|").slice(1)
                const obj: any = {}
                headers.forEach((h, idx) => {
                    let val: any = vals[idx]
                    if (h === 'x' || h === 'y' || h === 'z' || h === 'radius') val = Number(val)
                    if (h === 'params' && val) {
                        const params: any = {}
                        String(val).split(';').forEach(pair => {
                            if (!pair) return
                            const [k, v] = pair.split('=')
                            if (k) params[k] = v
                        })
                        val = params
                    }
                    obj[h] = val
                })
                objects.push(obj as WorldObject)
            }
            const { ensureStarTownObjects } = await import('@/lib/starTown')
            set((state) => ({ world: { ...state.world, objects: ensureStarTownObjects(objects) } }))
        } catch (e) {
            console.error("Failed to load world:", e)
            const { ensureStarTownObjects, STAR_TOWN_FALLBACK } = await import('@/lib/starTown')
            set((state) => ({
                world: {
                    ...state.world,
                    objects: ensureStarTownObjects(
                        state.world.objects.length ? state.world.objects : STAR_TOWN_FALLBACK,
                    ),
                },
            }))
        }
    },

    setMonsterTemplates: (monsterTemplates) => set((state) => ({ world: { ...state.world, monsterTemplates } })),
    setNPCTemplates: (npcTemplates) => set((state) => ({ world: { ...state.world, npcTemplates } })),
    setLootTables: (lootTables) => set((state) => ({ world: { ...state.world, lootTables } })),
    setAbilities: (abilities) => set((state) => ({ world: { ...state.world, abilities } })),
    setQuests: (quests) => set((state) => ({ world: { ...state.world, quests } })),
    setSpawners: (spawners) => set((state) => ({ world: { ...state.world, spawners } })),
    setPlayerQuests: (playerQuests) => set((state) => ({ world: { ...state.world, playerQuests } })),
    updateQuestProgress: (questId, progress) => set((state) => ({
        world: {
            ...state.world,
            playerQuests: state.world.playerQuests.map(pq =>
                pq.quest_id === questId ? { ...pq, progress } : pq
            )
        }
    })),

    setForgeSelection: (selection) => set({ forgeSelection: selection }),

    // Logic Utilities
    rollLootTable: (tableId) => {
        const { world } = get()
        const table = world.lootTables.find(t => t.table_id === tableId)
        if (!table) return []

        const results: { item_id: string, count: number }[] = []
        for (const entry of table.entries) {
            if (Math.random() <= entry.chance) {
                const count = Math.floor(Math.random() * (entry.max_amount - entry.min_amount + 1)) + entry.min_amount
                if (count > 0) {
                    results.push({ item_id: entry.item_id, count })
                }
            }
        }
        return results
    },

    evaluateDialogCondition: (condition) => {
        const { player } = get()
        switch (condition.type) {
            case 'item': {
                const item = player.inventory.find((i) => i.item_id === condition.target_id)
                return (item?.quantity || 0) >= (condition.value || 1)
            }
            case 'tag':
                // In a complete GAS build, tags would be checked on the player or target.
                return true // Placeholder
            case 'quest':
                // Check if quest is active/complete etc based on value
                return true
            case 'level':
                return player.stats.level >= (condition.value || 0)
            default:
                return true
        }
    }
}))

import { create } from 'zustand'
import { API_URL } from '@/lib/config'

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
    isEditorMode: boolean
    isForgeMode: boolean
    isAdminDashboard: boolean
    player: {
        name: string
        appearance: PlayerAppearance
        stats: CharacterStats
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

    // Actions
    login: (userData: any) => void
    logout: () => void
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
    updatePosition: (x: number, y: number) => void
    addInventoryItem: (item: InventoryItem | string) => void
    setInventory: (items: InventoryItem[]) => void
    updateWorldCycle: (delta: number) => void
    attack: (type: 'light' | 'hard') => void
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

export const useGameStore = create<GameState>((set, get) => ({
    auth: {
        user: null,
        isAuthenticated: false,
    },
    isInitialized: false,
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

    login: (userData) => {
        set((state) => ({
            auth: { user: userData, isAuthenticated: true },
            player: { ...state.player, name: userData.name || state.player.name }
        }))
        get().loadWorldFromGAS()
    },

    logout: () => set({ auth: { user: null, isAuthenticated: false }, isInitialized: false, isEditorMode: false, isAdminDashboard: false }),

    setEditorMode: (enabled) => set({ isEditorMode: enabled }),

    enterAdminDashboard: () => set({ isAdminDashboard: true }),
    exitAdminDashboard: () => set({ isAdminDashboard: false }),

    initializeCharacter: (name, appearance, job, statsOverride, inventory) => set((state) => {
        const base = { ...state.player.stats, ...(statsOverride || {}) }
        const withJob = statsOverride ? base : applyJobStatBonus(base, job, (job as any).stat_bonus)
        return {
            isInitialized: true,
            player: {
                ...state.player,
                name,
                appearance,
                jobs: { ...state.player.jobs, main: job },
                stats: withJob,
                inventory: inventory || state.player.inventory,
            },
        }
    }),

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
        set((state) => ({
            isInitialized: true,
            player: {
                ...state.player,
                name: hydrated.name,
                appearance: hydrated.appearance,
                jobs: { ...state.player.jobs, main: job },
                stats: hydrated.stats,
                inventory: hydrated.inventory,
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

    gainExp: (amount) => set((state) => {
        let { exp, level, maxExp } = state.player.stats
        exp += amount
        while (exp >= maxExp && level < 99) {
            exp -= maxExp
            level++
            maxExp = Math.floor(maxExp * 1.5)
        }
        return { player: { ...state.player, stats: { ...state.player.stats, exp, level, maxExp } } }
    }),

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
        const { auth, spendMoney, addInventoryItem } = get()
        if (!spendMoney(price)) return false
        addInventoryItem({ item_id: itemId, quantity: 1, name })
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

    addMoney: (amount) => set((state) => ({
        player: { ...state.player, stats: { ...state.player.stats, money: state.player.stats.money + amount } }
    })),

    applyKillRewards: async ({ exp, money, items }) => {
        const { auth, gainExp, addMoney, addInventoryItem } = get()
        const email = auth.user?.email
        gainExp(exp)
        if (money) addMoney(money)
        for (const id of items || []) addInventoryItem({ item_id: id, quantity: 1 })
        if (!email) return
        const { gasService } = await import('@/services/gasService')
        const expRes = await gasService.addExp(email, exp)
        if (expRes.startsWith('OK|EXP_ADDED|')) {
            const parts = expRes.split('|')
            const level = Number(parts[2])
            const serverExp = Number(parts[3])
            const leveled = Number(parts[4]) || 0
            if (!Number.isNaN(level)) {
                set((state) => ({
                    player: {
                        ...state.player,
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

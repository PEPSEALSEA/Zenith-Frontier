import { create } from 'zustand'

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

export interface AuthState {
    user: {
        email: string
        name: string
        picture: string
    } | null
    isAuthenticated: boolean
}

export type WorldObjectType = 'monster' | 'boss' | 'spawner' | 'town' | 'safezone' | 'npc' | 'market'

export interface WorldObject {
    id: string
    type: WorldObjectType
    x: number
    y: number
    name: string
    radius: number
    params?: any
}

export interface GameState {
    auth: AuthState
    isInitialized: boolean
    isEditorMode: boolean
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
        inventory: string[]
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
        objects: WorldObject[]
    }

    // Actions
    login: (userData: any) => void
    logout: () => void
    setEditorMode: (enabled: boolean) => void
    initializeCharacter: (name: string, appearance: PlayerAppearance, job: Job) => void
    gainExp: (amount: number) => void
    takeDamage: (amount: number) => void
    setMainJob: (job: Job) => void
    setSubJob: (job: Job) => void
    updatePosition: (x: number, y: number) => void
    addInventoryItem: (item: string) => void
    updateWorldCycle: (delta: number) => void
    attack: (type: 'light' | 'hard') => void
    addMoney: (amount: number) => void
    addWorldObject: (obj: WorldObject) => void
    removeWorldObject: (id: string) => void
    updateWorldObject: (id: string, updates: Partial<WorldObject>) => void
    setWorldObjects: (objects: WorldObject[]) => void

    // Persistence
    saveWorldToGAS: () => Promise<void>
    loadWorldFromGAS: () => Promise<void>
}

export const ADMIN_EMAIL = 'sealseapep@gmail.com'
const GAS_URL = "https://script.google.com/macros/s/AKfycbzL-1iU_07i0C6z08C9H_O-m-0e0j0_0/exec" // Placeholder, user will need to update

export const useGameStore = create<GameState>((set, get) => ({
    auth: {
        user: null,
        isAuthenticated: false,
    },
    isInitialized: false,
    isEditorMode: false,
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
        objects: []
    },

    login: (userData) => {
        set((state) => ({
            auth: { user: userData, isAuthenticated: true },
            player: { ...state.player, name: userData.name || state.player.name }
        }))
        get().loadWorldFromGAS()
    },

    logout: () => set({ auth: { user: null, isAuthenticated: false }, isInitialized: false, isEditorMode: false }),

    setEditorMode: (enabled) => set({ isEditorMode: enabled }),

    initializeCharacter: (name, appearance, job) => set((state) => ({
        isInitialized: true,
        player: {
            ...state.player,
            name, appearance,
            jobs: { ...state.player.jobs, main: job },
            stats: {
                ...state.player.stats,
                atk: state.player.stats.atk + (job.id === 'JOB_001' ? 5 : 0),
                mp: state.player.stats.mp + (job.id === 'JOB_005' ? 20 : 0),
            }
        }
    })),

    gainExp: (amount) => set((state) => {
        let { exp, level, maxExp } = state.player.stats
        exp += amount
        if (exp >= maxExp) {
            exp -= maxExp
            level++
            maxExp = Math.floor(maxExp * 1.5)
        }
        return { player: { ...state.player, stats: { ...state.player.stats, exp, level, maxExp } } }
    }),

    takeDamage: (amount) => set((state) => ({
        player: { ...state.player, stats: { ...state.player.stats, hp: Math.max(0, state.player.stats.hp - amount) } }
    })),

    setMainJob: (job) => set((state) => ({ player: { ...state.player, jobs: { ...state.player.jobs, main: job } } })),
    setSubJob: (job) => set((state) => ({ player: { ...state.player, jobs: { ...state.player.jobs, sub: job } } })),
    updatePosition: (x, y) => set((state) => ({ player: { ...state.player, position: { x, y } } })),
    addInventoryItem: (item) => set((state) => ({ player: { ...state.player, inventory: [...state.player.inventory, item] } })),

    updateWorldCycle: (delta) => set((state) => ({
        world: { ...state.world, manaCycle: (state.world.manaCycle + delta) % 1 }
    })),

    attack: (type) => set((state) => ({
        world: { ...state.world, lastAttack: { type, time: Date.now() } }
    })),

    addMoney: (amount) => set((state) => ({
        player: { ...state.player, stats: { ...state.player.stats, money: state.player.stats.money + amount } }
    })),

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
            formData.append('objects_json', JSON.stringify(world.objects))

            await fetch(GAS_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            })
            console.log("World saved trigger sent to GAS")
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
                    if (h === 'x' || h === 'y' || h === 'radius') val = Number(val)
                    if (h === 'params' && val) try { val = JSON.parse(val) } catch (e) { }
                    obj[h] = val
                })
                objects.push(obj as WorldObject)
            }
            set((state) => ({ world: { ...state.world, objects } }))
        } catch (e) {
            console.error("Failed to load world:", e)
        }
    }
}))

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
}

export interface Job {
  id: string
  name: string
  level: number
  type: 'main' | 'sub' | 'hidden'
  skills: string[]
}

export interface GameState {
  player: {
    name: string
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
  }
  world: {
    manaCycle: number // 0 to 1
    moonPhase: number // 0 to 7
    activeScenario: string | null
    bossesDefeated: string[]
  }
  
  // Actions
  gainExp: (amount: number) => void
  takeDamage: (amount: number) => void
  setMainJob: (job: Job) => void
  setSubJob: (job: Job) => void
  addInventoryItem: (item: string) => void
  updateWorldCycle: (delta: number) => void
}

export const useGameStore = create<GameState>((set) => ({
  player: {
    name: 'Adventurer',
    stats: {
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      level: 1,
      exp: 0,
      maxExp: 100,
      atk: 10,
      def: 5,
      spd: 12,
      luck: 8
    },
    jobs: {
      main: null,
      sub: null
    },
    equipment: {
      weapon: null,
      armor: null,
      accessory: null
    },
    inventory: [],
    titles: [],
    hiddenParams: {
      vorpalSoul: 0,
      karma: 0
    }
  },
  world: {
    manaCycle: 0.5,
    moonPhase: 0,
    activeScenario: null,
    bossesDefeated: []
  },

  gainExp: (amount) => set((state) => {
    let newExp = state.player.stats.exp + amount
    let newLevel = state.player.stats.level
    let newMaxExp = state.player.stats.maxExp
    
    if (newExp >= newMaxExp) {
      newExp -= newMaxExp
      newLevel++
      newMaxExp = Math.floor(newMaxExp * 1.5)
    }
    
    return {
      player: {
        ...state.player,
        stats: {
          ...state.player.stats,
          exp: newExp,
          level: newLevel,
          maxExp: newMaxExp
        }
      }
    }
  }),

  takeDamage: (amount) => set((state) => ({
    player: {
      ...state.player,
      stats: {
        ...state.player.stats,
        hp: Math.max(0, state.player.stats.hp - amount)
      }
    }
  })),

  setMainJob: (job) => set((state) => ({
    player: {
      ...state.player,
      jobs: { ...state.player.jobs, main: job }
    }
  })),

  setSubJob: (job) => set((state) => ({
    player: {
      ...state.player,
      jobs: { ...state.player.jobs, sub: job }
    }
  })),

  addInventoryItem: (item) => set((state) => ({
    player: {
      ...state.player,
      inventory: [...state.player.inventory, item]
    }
  })),

  updateWorldCycle: (delta) => set((state) => ({
    world: {
      ...state.world,
      manaCycle: (state.world.manaCycle + delta) % 1
    }
  }))
}))

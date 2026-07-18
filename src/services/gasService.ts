import { API_URL } from '@/lib/config'
import type { Job, PlayerAppearance, CharacterStats } from '@/store/gameStore'

const GAS_URL = API_URL

const GAS_ERROR_LABELS: Record<string, string> = {
    NOT_ENOUGH_GOLD: 'Not enough gold',
    MASTERY_TOO_LOW: 'Job mastery too low',
    LEVEL_TOO_LOW: 'Level too low',
    PARENT_SKILL_NOT_UNLOCKED: 'Unlock the parent skill first',
    WRONG_JOB: 'Wrong job for this skill',
    SKILL_ALREADY_UNLOCKED: 'Already unlocked',
    SKILL_NOT_FOUND: 'Skill not found',
    SKILL_NOT_UNLOCKED: 'Skill not unlocked yet',
    USE_SCROLL_ITEM: 'Use a skill scroll to learn this',
    NOT_A_SCROLL: 'That item is not a skill scroll',
    SCROLL_HAS_NO_SKILL: 'Scroll has no skill linked',
    ITEM_NOT_FOUND: 'Item not found',
    PLAYER_NOT_FOUND: 'Player not found',
    MISSING_FIELDS: 'Missing data',
    SKILL_TIER_LOCKED_FOR_SUB_JOB: 'Skill tier locked for sub job',
    INVALID_SLOT: 'Invalid skill slot',
}

export function formatGasError(res: string, fallback = 'Request failed'): string {
    if (!res) return fallback
    const code = res.startsWith('ERROR|') ? res.slice(6).split('|')[0] : res.split('|')[0]
    return GAS_ERROR_LABELS[code] || code || fallback
}

/**
 * Custom parser for the "HEADERS|... \n ROW|..." format used by Pi / Worker API.
 */
function parseGASResponse(text: string): Record<string, string>[] {
    if (!text || text === 'EMPTY' || text.startsWith('ERROR')) return []
    const lines = text.split('\n')
    if (lines.length < 2) return []

    const headerLine = lines.find(l => l.startsWith('HEADERS|'))
    if (!headerLine) return []

    const headers = headerLine.replace('HEADERS|', '').split('|')
    const dataRows = lines.filter(l => l.startsWith('ROW|'))

    return dataRows.map(rowLine => {
        const values = rowLine.replace('ROW|', '').split('|')
        const obj: Record<string, string> = {}
        headers.forEach((h, i) => {
            obj[h] = values[i]
        })
        return obj
    })
}

function parseAppearance(raw: unknown, fallbackColor = '#10b981', fallbackFace = 'ghost'): PlayerAppearance {
    if (!raw) return { color: fallbackColor, face: fallbackFace }
    const s = String(raw)
    if (s.trim().startsWith('{')) {
        try {
            const j = JSON.parse(s)
            return { color: j.color || fallbackColor, face: j.face || fallbackFace }
        } catch { /* fall through */ }
    }
    const [color, face] = s.split('|')
    return { color: color || fallbackColor, face: face || fallbackFace }
}

export type HydratedPlayer = {
    player_id: string
    name: string
    appearance: PlayerAppearance
    main_job_id: string
    sub_job_id: string
    stats: CharacterStats
    inventory: { item_id: string; quantity: number; name?: string }[]
    str: number
    dex: number
    int: number
    vit: number
    luk: number
    stat_points: number
    skill_slots: [string, string, string, string]
    job_mastery: number
    job_mastery_exp: number
}

function maxExpForLevel(level: number): number {
    let need = 100
    for (let i = 1; i < level; i++) need = Math.floor(need * 1.5)
    return need
}

export function hydratePlayerFromRow(
    row: Record<string, any>,
    inventory: { item_id: string; quantity: number; name?: string }[] = [],
): HydratedPlayer {
    const level = Number(row.level) || 1
    const str = Number(row.str) || 5
    const dex = Number(row.dex) || 5
    const int = Number(row.int) || 5
    const vit = Number(row.vit) || 5
    const luk = Number(row.luk) || 5
    const hp = Number(row.hp) || 100
    const mp = Number(row.mp) || 50
    return {
        player_id: String(row.player_id || ''),
        name: String(row.name || 'Adventurer'),
        appearance: parseAppearance(row.appearance),
        main_job_id: String(row.main_job_id || ''),
        sub_job_id: String(row.sub_job_id || ''),
        stats: {
            hp,
            maxHp: Math.max(hp, Number(row.max_hp) || 80 + vit * 8),
            mp,
            maxMp: Math.max(mp, Number(row.max_mp) || 40 + int * 6),
            level,
            exp: Number(row.exp) || 0,
            maxExp: maxExpForLevel(level),
            atk: Number(row.atk) || 10,
            def: Number(row.def) || 5,
            spd: Number(row.spd) || 12,
            luck: Number(row.luck) || luk + 5,
            money: Number(row.money) || 100,
        },
        inventory,
        str, dex, int, vit, luk,
        stat_points: Number(row.stat_points) || 0,
        skill_slots: [
            String(row.skill_slot_1 || ''),
            String(row.skill_slot_2 || ''),
            String(row.skill_slot_3 || ''),
            String(row.skill_slot_4 || ''),
        ],
        job_mastery: Number(row.job_mastery) || 1,
        job_mastery_exp: Number(row.job_mastery_exp) || 0,
    }
}

class GASService {
    private async post(action: string, params: Record<string, string>): Promise<string> {
        const body = new URLSearchParams({ action, ...params }).toString()
        try {
            const response = await fetch(GAS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: body,
            })
            return await response.text()
        } catch (error) {
            console.error(`GAS POST Error [${action}]:`, error)
            return `ERROR|${error}`
        }
    }

    private async get(action: string, params: Record<string, string>): Promise<string> {
        const query = new URLSearchParams({ action, ...params }).toString()
        try {
            const response = await fetch(`${GAS_URL}?${query}`)
            return await response.text()
        } catch (error) {
            console.error(`GAS GET Error [${action}]:`, error)
            return `ERROR|${error}`
        }
    }

    async getPlayer(playerId: string) {
        const res = await this.get('get_player', { player_id: playerId })
        const results = parseGASResponse(res)
        if (results.length > 0) {
            const player = results[0] as any
            player.appearance = parseAppearance(player.appearance)
            return player
        }
        return null
    }

    async createPlayer(playerId: string, name: string, appearance: any) {
        const color = appearance?.color || '#10b981'
        const face = appearance?.face || 'ghost'
        return await this.post('create_player', {
            player_id: playerId,
            name,
            appearance: `${color}|${face}`,
            money: '100',
        })
    }

    async updateStats(playerId: string, stats: Record<string, any>) {
        const payload: Record<string, string> = { player_id: playerId }
        for (const [k, v] of Object.entries(stats)) {
            if (v === undefined || v === null) continue
            if (k === 'appearance') {
                const color = v.color || '#10b981'
                const face = v.face || 'ghost'
                payload.appearance = `${color}|${face}`
            } else {
                payload[k] = String(v)
            }
        }
        return await this.post('update_player_stats', payload)
    }

    async addExp(playerId: string, expAmount: number, masteryGain = 0) {
        return await this.post('add_exp', {
            player_id: playerId,
            exp_amount: String(expAmount),
            mastery_gain: String(masteryGain),
        })
    }

    async addMoney(playerId: string, amount: number) {
        return await this.post('add_money', {
            player_id: playerId,
            amount: String(amount),
        })
    }

    async addItem(playerId: string, itemId: string, quantity = 1) {
        return await this.post('add_item', {
            player_id: playerId,
            item_id: itemId,
            quantity: String(quantity),
        })
    }

    async removeItem(playerId: string, itemId: string, quantity = 1) {
        return await this.post('remove_item', {
            player_id: playerId,
            item_id: itemId,
            quantity: String(quantity),
        })
    }

    async getAllJobs(): Promise<(Job & {
        stat_bonus?: string
        description?: string
        tier?: string
        parent_job_id?: string
        potential?: string
        attack_profile?: string
        is_hidden?: boolean
        unlock_condition?: string
        branch?: string
    })[]> {
        const res = await this.get('get_all_jobs', {})
        return parseGASResponse(res).map((j) => {
            const hidden = String(j.is_hidden || '0') === '1'
            return {
                id: String(j.job_id),
                name: String(j.job_name || j.job_id),
                level: 1,
                type: (hidden ? 'hidden' : 'main') as Job['type'],
                skills: [],
                stat_bonus: j.stat_bonus,
                description: j.description,
                tier: j.tier,
                parent_job_id: j.parent_job_id || '',
                potential: j.potential || '',
                attack_profile: j.attack_profile || '',
                is_hidden: hidden,
                unlock_condition: String(j.unlock_condition || ''),
                branch: String(j.branch || ''),
            }
        })
    }

    async getPlayerJobs(playerId: string) {
        const res = await this.get('get_player_jobs', { player_id: playerId })
        return parseGASResponse(res).map((r) => String(r.job_id)).filter(Boolean)
    }

    async getAllSkills() {
        const res = await this.get('get_all_skills', {})
        return parseGASResponse(res)
    }

    async getPlayerSkills(playerId: string) {
        const res = await this.get('get_player_skills', { player_id: playerId })
        return parseGASResponse(res)
    }

    async allocateStat(playerId: string, stat: string) {
        return await this.post('allocate_stat', { player_id: playerId, stat })
    }

    async setSkillLoadout(playerId: string, slot: number, skillId: string) {
        return await this.post('set_skill_loadout', {
            player_id: playerId,
            slot: String(slot),
            skill_id: skillId,
        })
    }

    async unlockSkill(playerId: string, skillId: string) {
        return await this.post('unlock_skill', { player_id: playerId, skill_id: skillId })
    }

    async useSkillScroll(playerId: string, itemId: string) {
        return await this.post('use_skill_scroll', { player_id: playerId, item_id: itemId })
    }

    async promoteJob(playerId: string, jobId: string) {
        return await this.post('promote_job', { player_id: playerId, job_id: jobId })
    }

    async setSubJob(playerId: string, jobId: string) {
        return await this.post('set_sub_job', { player_id: playerId, job_id: jobId })
    }

    async unlockJob(playerId: string, jobId: string, unlockCondition = '') {
        return await this.post('unlock_job', {
            player_id: playerId,
            job_id: jobId,
            unlock_condition: unlockCondition,
        })
    }

    async getPlayerInventory(playerId: string) {
        const res = await this.get('get_player_inventory', { player_id: playerId })
        return parseGASResponse(res).map((r) => ({
            item_id: String(r.item_id),
            quantity: Number(r.quantity) || 1,
            raise_level: Number(r.raise_level) || 0,
            ascension_form: String(r.ascension_form || 'base'),
        }))
    }

    async getAllEquipment() {
        const res = await this.get('get_all_equipment', {})
        return parseGASResponse(res)
    }

    async loadHydratedPlayer(playerId: string): Promise<HydratedPlayer | null> {
        const row = await this.getPlayer(playerId)
        if (!row) return null
        const inv = await this.getPlayerInventory(playerId)
        const equipment = await this.getAllEquipment()
        const nameById = Object.fromEntries(equipment.map((e) => [e.item_id, e.item_name]))
        return hydratePlayerFromRow(
            row,
            inv.map((i) => ({
                ...i,
                name: nameById[i.item_id] || i.item_id,
            })),
        )
    }

    async setMainJob(playerId: string, jobId: string) {
        return await this.post('set_main_job', { player_id: playerId, job_id: jobId })
    }

    async getAllMonsters() {
        const res = await this.get('get_all_monsters', {})
        return parseGASResponse(res).map(m => ({
            ...m,
            monster_id: String(m.monster_id),
            name: String(m.name || m.monster_id),
            hp: Number(m.hp),
            atk: Number(m.atk),
            def: Number(m.def),
            spd: Number(m.spd),
            skills: m.skills ? String(m.skills).split(',').map((s: string) => s.trim()).filter(Boolean) : [],
            drops: (() => {
                if (!m.drops) return [] as string[]
                try {
                    const parsed = JSON.parse(m.drops)
                    if (Array.isArray(parsed)) return parsed.map(String)
                } catch {
                    // fall through
                }
                return String(m.drops).split(',').map((s: string) => s.trim()).filter(Boolean)
            })(),
            appearance: parseAppearance(m.appearance, '#ef4444', 'skull'),
        }))
    }

    async upsertMonster(monster: any) {
        const stats = monster.stats || {}
        const appearance = monster.appearance || { color: '#ef4444', face: 'skull' }

        return await this.post('upsert_monster', {
            monster_id: String(monster.monster_id || ''),
            name: String(monster.name || ''),
            hp: String(stats.hp ?? 100),
            atk: String(stats.atk ?? 10),
            def: String(stats.def ?? 5),
            spd: String(stats.spd ?? 10),
            skills: (monster.abilities || []).join(','),
            drops: String(monster.loot_table_id || monster.drops || ''),
            appearance: `${appearance.color || '#ef4444'}|${appearance.face || 'skull'}`
        })
    }

    async getAllNPCs() {
        const res = await this.get('get_all_npcs', {})
        return parseGASResponse(res).map(n => ({
            ...n,
            is_merchant: String(n.is_merchant) === 'true' || String(n.is_merchant) === '1',
            is_trader: String(n.is_trader) === 'true' || String(n.is_trader) === '1',
            appearance: parseAppearance(n.appearance, '#3b82f6', 'ghost'),
            trade_items: (() => {
                if (!n.trade_items) return [] as string[]
                const raw = String(n.trade_items)
                try {
                    const parsed = JSON.parse(raw)
                    if (Array.isArray(parsed)) return parsed.map(String)
                } catch {
                    // fall through
                }
                return raw.split(',').map((s: string) => s.trim()).filter(Boolean)
            })()
        }))
    }

    async upsertNPC(npc: any) {
        const appearance = npc.appearance || { color: '#3b82f6', face: 'ghost' }

        return await this.post('upsert_npc', {
            npc_id: String(npc.npc_id || ''),
            name: String(npc.name || ''),
            appearance: `${appearance.color || '#3b82f6'}|${appearance.face || 'ghost'}`,
            initial_dialogue_id: String(
                npc.initial_dialogue_id ||
                (npc.dialog_tree && npc.dialog_tree[0] && npc.dialog_tree[0].id) ||
                ''
            ),
            quest_id: String(npc.quest_id || ''),
            is_merchant: (npc.is_merchant ? '1' : '0'),
            is_trader: (npc.is_trader ? '1' : '0'),
            trade_items: (npc.trade_items || []).join(',')
        })
    }

    async getAllQuests() {
        const res = await this.get('get_all_quests', {})
        return parseGASResponse(res).map(q => ({
            ...q,
            target_count: Number(q.target_count),
            is_hidden: String(q.is_hidden) === 'true' || String(q.is_hidden) === '1',
            rewards: q.rewards ? JSON.parse(q.rewards) : {}
        }))
    }

    async upsertQuest(quest: any) {
        return await this.post('upsert_quest', {
            quest_id: String(quest.quest_id || ''),
            name: String(quest.name || ''),
            description: String(quest.description || ''),
            type: String(quest.type || 'kill'),
            target_id: String(quest.target_id || ''),
            target_count: String(quest.target_count ?? 0),
            rewards: JSON.stringify(quest.rewards || {}),
            is_hidden: quest.is_hidden ? '1' : '0',
            next_quest_id: String(quest.next_quest_id || '')
        })
    }

    async getAllSpawners() {
        const res = await this.get('get_all_spawners', {})
        return parseGASResponse(res).map(s => ({
            ...s,
            x: Number(s.x), y: Number(s.y), z: Number(s.z),
            range: Number(s.range), spawn_rate: Number(s.spawn_rate), max_monsters: Number(s.max_monsters)
        }))
    }

    async upsertSpawner(spawner: any) {
        return await this.post('upsert_spawner', spawner)
    }

    async getDialogue(dialogueId: string) {
        const res = await this.get('get_dialogue', { dialogue_id: dialogueId })
        const results = parseGASResponse(res)
        if (results.length > 0) {
            const d = results[0] as any
            d.options = d.options_json ? JSON.parse(d.options_json) : []
            return d
        }
        return null
    }

    async updateQuestProgress(playerId: string, questId: string, progress: number, status: string = 'active') {
        return await this.post('update_quest_progress', {
            player_id: playerId,
            quest_id: questId,
            progress: String(progress),
            status
        })
    }
}

export const gasService = new GASService()

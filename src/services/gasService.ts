const GAS_URL = 'https://script.google.com/macros/s/AKfycbwwkfzr_IDPacSINQFIWHyVERoIS75BHLWarqvrbkkeBEyjfXkc-jBUe2PzP5b4Ib2u/exec'

/**
 * Custom parser for the "HEADERS|... \n ROW|..." format used in the provided GAS script.
 */
function parseGASResponse(text: string): any[] {
    if (!text || text === 'EMPTY' || text.startsWith('ERROR')) return []
    const lines = text.split('\n')
    if (lines.length < 2) return []

    const headerLine = lines.find(l => l.startsWith('HEADERS|'))
    if (!headerLine) return []

    const headers = headerLine.replace('HEADERS|', '').split('|')
    const dataRows = lines.filter(l => l.startsWith('ROW|'))

    return dataRows.map(rowLine => {
        const values = rowLine.replace('ROW|', '').split('|')
        const obj: any = {}
        headers.forEach((h, i) => {
            obj[h] = values[i]
        })
        return obj
    })
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
            const player = results[0]
            if (player.appearance) {
                try {
                    player.appearance = JSON.parse(player.appearance)
                } catch (e) {
                    player.appearance = { color: '#10b981', face: '😎' }
                }
            }
            return player
        }
        return null
    }

    async createPlayer(playerId: string, name: string, appearance: any) {
        return await this.post('create_player', {
            player_id: playerId,
            name,
            appearance: JSON.stringify(appearance)
        })
    }

    async updateStats(playerId: string, stats: any) {
        if (stats.appearance) stats.appearance = JSON.stringify(stats.appearance)
        return await this.post('update_player_stats', { player_id: playerId, ...stats })
    }

    async setMainJob(playerId: string, jobId: string) {
        return await this.post('set_main_job', { player_id: playerId, job_id: jobId })
    }

    // New Entity Methods
    async getAllMonsters() {
        const res = await this.get('get_all_monsters', {})
        return parseGASResponse(res).map(m => ({
            ...m,
            hp: Number(m.hp),
            atk: Number(m.atk),
            def: Number(m.def),
            spd: Number(m.spd),
            skills: m.skills ? String(m.skills).split(',').map((s: string) => s.trim()).filter(Boolean) : [],
            // Support both legacy JSON and plain text for drops
            drops: (() => {
                if (!m.drops) return []
                try {
                    const parsed = JSON.parse(m.drops)
                    if (Array.isArray(parsed)) return parsed
                } catch {
                    // fall through to text parsing
                }
                return String(m.drops).split(',').map((s: string) => s.trim()).filter(Boolean)
            })(),
            // Support both legacy JSON and simple "color|face" text for appearance
            appearance: (() => {
                if (!m.appearance) return { color: '#ef4444', face: 'skull' }
                const raw = String(m.appearance)
                if (raw.trim().startsWith('{')) {
                    try {
                        return JSON.parse(raw)
                    } catch {
                        // fall through to text parsing
                    }
                }
                const [color, face] = raw.split('|')
                return {
                    color: color || '#ef4444',
                    face: face || 'skull'
                }
            })()
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
            // Store abilities and loot table as plain text
            skills: (monster.abilities || []).join(','),
            drops: String(monster.loot_table_id || ''),
            // Encode appearance as simple "color|face" text
            appearance: `${appearance.color || '#ef4444'}|${appearance.face || 'skull'}`
        })
    }

    async getAllNPCs() {
        const res = await this.get('get_all_npcs', {})
        return parseGASResponse(res).map(n => ({
            ...n,
            // Accept both "true"/"false" and "1"/"0"
            is_merchant: String(n.is_merchant) === 'true' || String(n.is_merchant) === '1',
            is_trader: String(n.is_trader) === 'true' || String(n.is_trader) === '1',
            // Support legacy JSON and "color|face" text
            appearance: (() => {
                if (!n.appearance) return { color: '#3b82f6', face: 'ghost' }
                const raw = String(n.appearance)
                if (raw.trim().startsWith('{')) {
                    try {
                        return JSON.parse(raw)
                    } catch {
                        // fall through
                    }
                }
                const [color, face] = raw.split('|')
                return {
                    color: color || '#3b82f6',
                    face: face || 'ghost'
                }
            })(),
            // Support legacy JSON array and simple comma-separated IDs
            trade_items: (() => {
                if (!n.trade_items) return []
                const raw = String(n.trade_items)
                try {
                    const parsed = JSON.parse(raw)
                    if (Array.isArray(parsed)) return parsed
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
            // Accept both "true"/"false" and "1"/"0"
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
            const d = results[0]
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

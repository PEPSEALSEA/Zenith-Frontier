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
            hp: Number(m.hp), atk: Number(m.atk), def: Number(m.def), spd: Number(m.spd),
            skills: m.skills ? m.skills.split(',') : [],
            drops: m.drops ? JSON.parse(m.drops) : [],
            appearance: m.appearance ? JSON.parse(m.appearance) : { color: '#ef4444', face: 'skull' }
        }))
    }

    async upsertMonster(monster: any) {
        return await this.post('upsert_monster', {
            ...monster,
            drops: JSON.stringify(monster.drops),
            appearance: JSON.stringify(monster.appearance)
        })
    }

    async getAllNPCs() {
        const res = await this.get('get_all_npcs', {})
        return parseGASResponse(res).map(n => ({
            ...n,
            is_merchant: n.is_merchant === 'true',
            is_trader: n.is_trader === 'true',
            appearance: n.appearance ? JSON.parse(n.appearance) : { color: '#3b82f6', face: 'ghost' },
            trade_items: n.trade_items ? JSON.parse(n.trade_items) : []
        }))
    }

    async upsertNPC(npc: any) {
        return await this.post('upsert_npc', {
            ...npc,
            appearance: JSON.stringify(npc.appearance),
            trade_items: JSON.stringify(npc.trade_items)
        })
    }

    async getAllQuests() {
        const res = await this.get('get_all_quests', {})
        return parseGASResponse(res).map(q => ({
            ...q,
            target_count: Number(q.target_count),
            is_hidden: q.is_hidden === 'true',
            rewards: q.rewards ? JSON.parse(q.rewards) : {}
        }))
    }

    async upsertQuest(quest: any) {
        return await this.post('upsert_quest', {
            ...quest,
            rewards: JSON.stringify(quest.rewards)
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

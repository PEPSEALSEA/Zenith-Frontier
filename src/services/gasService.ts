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
}

export const gasService = new GASService()

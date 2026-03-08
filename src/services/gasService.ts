const GAS_URL = 'https://script.google.com/macros/s/AKfycbwwkfzr_IDPacSINQFIWHyVERoIS75BHLWarqvrbkkeBEyjfXkc-jBUe2PzP5b4Ib2u/exec'

export interface SaveData {
    playerName: string
    level: number
    exp: number
    hp: number
    mp: number
    jobMain: string | null
    jobSub: string | null
    inventory: string[]
    bossesDefeated: string[]
    timestamp?: number
}

class GASService {
    async saveData(data: SaveData): Promise<boolean> {
        try {
            const response = await fetch(GAS_URL, {
                method: 'POST',
                mode: 'no-cors', // standard for GAS web apps unless CORS is explicitly handled
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'save',
                    data: {
                        ...data,
                        timestamp: Date.now()
                    }
                }),
            })
            // Since no-cors doesn't return response body, we assume success if no error
            return true
        } catch (error) {
            console.error('Failed to save data to GAS:', error)
            return false
        }
    }

    async loadData(playerName: string): Promise<SaveData | null> {
        try {
            const response = await fetch(`${GAS_URL}?action=load&playerName=${encodeURIComponent(playerName)}`)
            if (!response.ok) throw new Error('Load failed')
            return await response.json()
        } catch (error) {
            console.error('Failed to load data from GAS:', error)
            return null
        }
    }

    async reportBossDefeat(bossId: string, playerName: string): Promise<void> {
        await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({
                action: 'reportBoss',
                bossId,
                playerName,
                timestamp: Date.now()
            })
        })
    }
}

export const gasService = new GASService()

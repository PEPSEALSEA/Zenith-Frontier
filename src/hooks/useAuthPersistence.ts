'use client'

import { useEffect } from 'react'
import { useGameStore, ADMIN_EMAIL } from '@/store/gameStore'

const STORAGE_KEY = 'zf_auth_v1'

interface PersistedAuth {
    user: {
        email: string
        name: string
        picture: string
    }
    timestamp: number
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Reads saved Google login from localStorage on first mount.
 * Writes + clears whenever auth state changes.
 * Call this hook ONCE at the top of page.tsx.
 */
export function useAuthPersistence() {
    const { auth, login, enterAdminDashboard, isInitialized } = useGameStore()

    // ── Restore on first mount ──────────────────────────────
    useEffect(() => {
        if (auth.isAuthenticated) return // already logged in (e.g. hot reload)

        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (!raw) return

            const saved: PersistedAuth = JSON.parse(raw)
            const age = Date.now() - (saved.timestamp || 0)

            if (age > SESSION_TTL_MS) {
                localStorage.removeItem(STORAGE_KEY)
                return
            }

            if (!saved.user?.email) return

            // Re-hydrate auth in store without calling GAS again
            login(saved.user)

            // Route admin to dashboard
            if (saved.user.email === ADMIN_EMAIL) {
                enterAdminDashboard()
            }
        } catch {
            localStorage.removeItem(STORAGE_KEY)
        }
        // Only run on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ── Persist whenever user logs in ───────────────────────
    useEffect(() => {
        if (!auth.isAuthenticated || !auth.user) return

        const data: PersistedAuth = {
            user: auth.user,
            timestamp: Date.now(),
        }
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        } catch { /* storage full — ignore */ }
    }, [auth.isAuthenticated, auth.user])

    // ── Clear on logout ──────────────────────────────────────
    useEffect(() => {
        if (auth.isAuthenticated) return
        try {
            localStorage.removeItem(STORAGE_KEY)
        } catch { /* ignore */ }
    }, [auth.isAuthenticated])
}

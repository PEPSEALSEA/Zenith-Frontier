'use client'

import { useEffect, useRef } from 'react'
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

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Restores Google login from localStorage, then hydrates player from Pi.
 */
export function useAuthPersistence() {
    const { auth, login, enterAdminDashboard, hydrateFromServer, isInitialized } = useGameStore()
    const hydrating = useRef(false)

    useEffect(() => {
        if (auth.isAuthenticated) return

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

            login(saved.user)

            if (saved.user.email === ADMIN_EMAIL) {
                enterAdminDashboard()
            }
        } catch {
            localStorage.removeItem(STORAGE_KEY)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (!auth.isAuthenticated || !auth.user?.email) return
        if (auth.user.email === ADMIN_EMAIL) return
        if (isInitialized || hydrating.current) return

        hydrating.current = true
        hydrateFromServer(auth.user.email).finally(() => {
            hydrating.current = false
        })
    }, [auth.isAuthenticated, auth.user?.email, isInitialized, hydrateFromServer])

    useEffect(() => {
        if (!auth.isAuthenticated || !auth.user) return

        const data: PersistedAuth = {
            user: auth.user,
            timestamp: Date.now(),
        }
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        } catch { /* ignore */ }
    }, [auth.isAuthenticated, auth.user])

    useEffect(() => {
        if (auth.isAuthenticated) return
        try {
            localStorage.removeItem(STORAGE_KEY)
        } catch { /* ignore */ }
    }, [auth.isAuthenticated])
}

'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, ADMIN_EMAIL } from '@/store/gameStore'
import {
    LogOut,
    Shield,
    Mail,
    Crown,
    KeyRound,
    Star,
    Coins,
    X,
    Trash2,
} from 'lucide-react'

interface ProfileDropdownProps {
    isOpen: boolean
    onClose: () => void
}

export default function ProfileDropdown({ isOpen, onClose }: ProfileDropdownProps) {
    const { auth, player, logout, deleteAllProgress } = useGameStore()
    const isAdmin = auth.user?.email === ADMIN_EMAIL
    const [wipeStep, setWipeStep] = useState(0)
    const [wiping, setWiping] = useState(false)

    useEffect(() => {
        if (!isOpen) setWipeStep(0)
    }, [isOpen])

    if (!auth.user) return null

    const handleLogout = () => {
        onClose()
        logout()
    }

    const handleWipeClick = async () => {
        if (wiping) return
        if (wipeStep < 3) {
            setWipeStep((s) => s + 1)
            return
        }
        setWiping(true)
        const ok = await deleteAllProgress()
        setWiping(false)
        if (ok) {
            setWipeStep(0)
            onClose()
        } else {
            setWipeStep(0)
        }
    }

    const wipeLabel =
        wipeStep === 0
            ? 'Delete all progress'
            : wipeStep === 1
                ? 'Confirm 1/3 — wipe this save?'
                : wipeStep === 2
                    ? 'Confirm 2/3 — cannot be undone'
                    : wiping
                        ? 'Deleting…'
                        : 'Confirm 3/3 — delete this game ID'

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <div
                        className="pointer-events-auto fixed inset-0 z-[200]"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: -8, x: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: -8, x: -8 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="pointer-events-auto fixed top-28 left-6 z-[201] w-72 rounded-2xl bg-zinc-950/95 backdrop-blur-2xl border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.8)] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="relative p-5 border-b border-white/5">
                            <button
                                type="button"
                                onClick={onClose}
                                className="absolute top-3 right-3 p-1 rounded-lg text-white/20 hover:text-white hover:bg-white/10 transition-all"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>

                            <div className="flex items-center gap-3">
                                <div className="relative flex-shrink-0">
                                    <img
                                        src={auth.user.picture}
                                        alt="avatar"
                                        className="h-12 w-12 rounded-full border-2 border-white/20"
                                    />
                                    {isAdmin && (
                                        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center border-2 border-zinc-950">
                                            <Crown className="h-2.5 w-2.5 text-black" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-white text-sm truncate">{auth.user.name}</p>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <Mail className="h-2.5 w-2.5 text-white/30 flex-shrink-0" />
                                        <p className="text-[9px] text-white/30 font-mono truncate">{auth.user.email}</p>
                                    </div>
                                    {isAdmin && (
                                        <div className="flex items-center gap-1 mt-1">
                                            <Shield className="h-2.5 w-2.5 text-amber-500 flex-shrink-0" />
                                            <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Administrator</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-b border-white/5 space-y-3">
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Character</p>

                            <div className="flex items-center gap-3">
                                <div
                                    className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: player.appearance.color }}
                                >
                                    <span className="text-white text-lg font-black">
                                        {player.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-black italic uppercase tracking-tight text-white">{player.name}</p>
                                    <p className="text-[9px] text-white/40">
                                        {player.jobs.main?.name || 'Vagrant'} · Lv.{player.stats.level}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <StatPill icon={Star} label="Level" value={player.stats.level} color="amber" />
                                <StatPill icon={Coins} label="Gold" value={player.stats.money} color="yellow" />
                                <StatPill icon={KeyRound} label="Titles" value={player.titles.length} color="indigo" />
                            </div>
                        </div>

                        <div className="p-3 space-y-2">
                            <button
                                type="button"
                                onClick={() => void handleWipeClick()}
                                disabled={wiping}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left border transition-all group ${
                                    wipeStep === 0
                                        ? 'border-transparent text-white/40 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400'
                                        : wipeStep < 3
                                            ? 'border-amber-400/35 bg-amber-500/10 text-amber-100'
                                            : 'border-rose-500/60 bg-rose-600/25 text-rose-100'
                                }`}
                            >
                                <Trash2 className="h-4 w-4 shrink-0" />
                                <span className="text-[11px] font-bold uppercase tracking-wider leading-snug">
                                    {wipeLabel}
                                </span>
                            </button>
                            {wipeStep > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => setWipeStep(0)}
                                    className="w-full px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/30 hover:text-white/60"
                                >
                                    Cancel wipe
                                </button>
                            ) : null}
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left border border-transparent hover:bg-rose-500/10 hover:border-rose-500/20 text-white/40 hover:text-rose-400 transition-all group"
                            >
                                <LogOut className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                                <span className="text-xs font-bold uppercase tracking-widest">Sign Out</span>
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

const StatPill = ({ icon: Icon, label, value, color }: {
    icon: any; label: string; value: number; color: string
}) => {
    const colorMap: Record<string, string> = {
        amber: 'text-amber-400',
        yellow: 'text-yellow-400',
        indigo: 'text-indigo-400',
    }
    return (
        <div className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-white/3 border border-white/5">
            <Icon className={`h-3.5 w-3.5 ${colorMap[color] || 'text-white/40'}`} />
            <span className="text-sm font-black text-white">{value}</span>
            <span className="text-[7px] font-bold text-white/20 uppercase tracking-widest">{label}</span>
        </div>
    )
}

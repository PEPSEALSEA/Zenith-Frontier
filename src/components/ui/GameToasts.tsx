'use client'

import React, { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Coins, Package, Sparkles, Star, Info } from 'lucide-react'
import { useGameStore, type GameToast, type GameToastKind } from '@/store/gameStore'

const TTL_MS: Record<GameToastKind, number> = {
  level: 5200,
  gold: 3200,
  item: 3600,
  exp: 2400,
  info: 3400,
}

const ACCENT: Record<GameToastKind, { bar: string; icon: string }> = {
  level: { bar: 'from-amber-300 via-yellow-200 to-amber-400', icon: 'text-amber-300' },
  gold: { bar: 'from-yellow-500 to-amber-300', icon: 'text-amber-400' },
  item: { bar: 'from-emerald-400 to-teal-300', icon: 'text-emerald-300' },
  exp: { bar: 'from-sky-400 to-cyan-300', icon: 'text-sky-300' },
  info: { bar: 'from-slate-300 to-slate-100', icon: 'text-slate-200' },
}

function ToastIcon({ kind }: { kind: GameToastKind }) {
  const cls = `h-4 w-4 ${ACCENT[kind].icon}`
  if (kind === 'level') return <Star className={cls} />
  if (kind === 'gold') return <Coins className={cls} />
  if (kind === 'item') return <Package className={cls} />
  if (kind === 'exp') return <Sparkles className={cls} />
  return <Info className={cls} />
}

function ToastCard({ toast }: { toast: GameToast }) {
  const dismissToast = useGameStore((s) => s.dismissToast)
  const accent = ACCENT[toast.kind]
  const isLevel = toast.kind === 'level'
  const ttl = TTL_MS[toast.kind]

  useEffect(() => {
    const t = window.setTimeout(() => dismissToast(toast.id), ttl)
    return () => window.clearTimeout(t)
  }, [toast.id, toast.createdAt, ttl, dismissToast])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.97, transition: { duration: 0.22, ease: 'easeIn' } }}
      transition={{ type: 'spring', stiffness: 320, damping: 26, mass: 0.75 }}
      className={`pointer-events-auto rpg-panel relative overflow-hidden rounded-xl ${
        isLevel ? 'min-w-[260px] max-w-[320px] rpg-panel-gold' : 'min-w-[220px] max-w-[280px]'
      }`}
    >
      <div className={`absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b ${accent.bar}`} />

      <div className={`flex items-center gap-3 px-3.5 ${isLevel ? 'py-3' : 'py-2'}`}>
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/35">
          <ToastIcon kind={toast.kind} />
          {toast.count > 1 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-md border border-white/20 bg-black/80 px-1 font-mono text-[9px] font-bold tabular-nums text-amber-200 shadow-sm">
              ×{toast.count}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={`truncate font-display tracking-wide text-white ${
              isLevel ? 'text-sm font-bold uppercase' : 'text-[12px] font-semibold'
            }`}
          >
            {toast.title}
          </div>
          {toast.detail && (
            <div className="mt-0.5 truncate font-mono text-[10px] font-medium tabular-nums tracking-wide text-white/45">
              {toast.detail}
            </div>
          )}
        </div>
      </div>

      <motion.div
        key={toast.createdAt}
        className={`absolute bottom-0 left-0 h-[2px] bg-gradient-to-r ${accent.bar}`}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: ttl / 1000, ease: 'linear' }}
      />
    </motion.div>
  )
}

export default function GameToasts() {
  const toasts = useGameStore((s) => s.toasts)

  return (
    <div className="pointer-events-none absolute bottom-24 right-5 z-50 flex flex-col-reverse items-end gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}

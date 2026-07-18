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

const ACCENT: Record<GameToastKind, { bar: string; glow: string; icon: string }> = {
  level: { bar: 'from-amber-300 via-yellow-200 to-amber-400', glow: 'rgba(251,191,36,0.45)', icon: 'text-amber-300' },
  gold: { bar: 'from-yellow-500 to-amber-300', glow: 'rgba(245,158,11,0.35)', icon: 'text-amber-400' },
  item: { bar: 'from-emerald-400 to-teal-300', glow: 'rgba(52,211,153,0.35)', icon: 'text-emerald-300' },
  exp: { bar: 'from-sky-400 to-cyan-300', glow: 'rgba(56,189,248,0.3)', icon: 'text-sky-300' },
  info: { bar: 'from-violet-400 to-fuchsia-300', glow: 'rgba(167,139,250,0.35)', icon: 'text-violet-300' },
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

  useEffect(() => {
    const t = window.setTimeout(() => dismissToast(toast.id), TTL_MS[toast.kind])
    return () => window.clearTimeout(t)
  }, [toast.id, toast.kind, dismissToast])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 64, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 48, scale: 0.94, transition: { duration: 0.28, ease: 'easeIn' } }}
      transition={{ type: 'spring', stiffness: 420, damping: 28, mass: 0.7 }}
      className={`pointer-events-auto relative overflow-hidden rounded-md border border-white/10 backdrop-blur-xl ${
        isLevel ? 'min-w-[280px] max-w-[340px]' : 'min-w-[240px] max-w-[300px]'
      }`}
      style={{
        background: 'linear-gradient(105deg, rgba(8,10,14,0.92) 0%, rgba(18,22,28,0.88) 55%, rgba(8,10,14,0.9) 100%)',
        boxShadow: `0 12px 40px rgba(0,0,0,0.45), 0 0 24px ${accent.glow}`,
      }}
    >
      <div className={`absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b ${accent.bar}`} />
      <motion.div
        className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accent.bar} opacity-70`}
        initial={{ scaleX: 0, originX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      />

      <div className={`flex items-center gap-3 px-4 ${isLevel ? 'py-3.5' : 'py-2.5'}`}>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/40 ${
            isLevel ? 'ring-1 ring-amber-400/40' : ''
          }`}
        >
          <ToastIcon kind={toast.kind} />
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
        className={`absolute bottom-0 left-0 h-[2px] bg-gradient-to-r ${accent.bar}`}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: TTL_MS[toast.kind] / 1000, ease: 'linear' }}
      />
    </motion.div>
  )
}

export default function GameToasts() {
  const toasts = useGameStore((s) => s.toasts)

  return (
    <div className="pointer-events-none absolute bottom-8 right-6 z-50 flex flex-col-reverse items-end gap-2.5">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}

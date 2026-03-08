'use client'

import dynamic from 'next/dynamic'
import { Suspense, useEffect } from 'react'
import HUD from '@/components/ui/HUD'
import Inventory from '@/components/ui/Inventory'
import CharacterCreator from '@/components/ui/CharacterCreator'
import MapEditor from '@/components/ui/MapEditor'
import { useGameStore, ADMIN_EMAIL } from '@/store/gameStore'
import { AnimatePresence, motion } from 'framer-motion'

const GameScene2D = dynamic(() => import('@/components/game/Scene2D'), {
  ssr: false,
})

export default function Home() {
  const { isInitialized, isEditorMode, auth } = useGameStore()

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black font-sans text-white select-none">
      <AnimatePresence mode="wait">
        {!isInitialized ? (
          <motion.div
            key="creator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="z-50"
          >
            <CharacterCreator />
          </motion.div>
        ) : (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full w-full"
          >
            <Suspense fallback={
              <div className="flex h-full w-full items-center justify-center bg-zinc-950 text-emerald-500 font-mono text-xl animate-pulse">
                LOADING FRONTIER...
              </div>
            }>
              <GameScene2D />
            </Suspense>

            {/* Overlays - Hidden in Editor Mode for focus */}
            <AnimatePresence>
              {!isEditorMode && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <HUD />
                  <Inventory />
                </motion.div>
              )}
            </AnimatePresence>

            <MapEditor />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor Grid Overlay (Visual Only) */}
      {isEditorMode && (
        <div className="pointer-events-none absolute inset-0 z-10 border-[20px] border-amber-500/10 opacity-50">
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-6 py-2 rounded-full font-black text-xs tracking-widest shadow-2xl border-2 border-black">
            MAP ENGINE: EDITOR MODE ACTIVE
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 z-40 bg-black/50 opacity-0 transition-opacity duration-1000" id="scene-vignette" />
    </main>
  )
}

'use client'

import dynamic from 'next/dynamic'
import { Suspense, useEffect } from 'react'
import HUD from '@/components/ui/HUD'
import Inventory from '@/components/ui/Inventory'
import CharacterCreator from '@/components/ui/CharacterCreator'
import MapEditor from '@/components/ui/MapEditor'
import { useGameStore } from '@/store/gameStore'
import { AnimatePresence, motion } from 'framer-motion'

const GameScene2D = dynamic(() => import('@/components/game/Scene2D'), {
  ssr: false,
})

export default function Home() {
  const { isInitialized, auth } = useGameStore()

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

            {/* Overlays */}
            <HUD />
            <Inventory />
            <MapEditor />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Filter Effect */}
      <div className="pointer-events-none absolute inset-0 z-40 bg-black/50 opacity-0 transition-opacity duration-1000" id="scene-vignette" />
    </main>
  )
}

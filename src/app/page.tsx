'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import HUD from '@/components/ui/HUD'
import Inventory from '@/components/ui/Inventory'

const GameScene = dynamic(() => import('@/components/game/Scene'), {
  ssr: false,
})

export default function Home() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black font-sans text-white select-none">
      <Suspense fallback={
        <div className="flex h-full w-full items-center justify-center bg-zinc-950 text-emerald-500 font-mono text-xl animate-pulse">
          BOOTING ZENITH FRONTIER...
        </div>
      }>
        <GameScene />
      </Suspense>

      {/* Overlays */}
      <HUD />
      <Inventory />

      {/* Loading Filter */}
      <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center opacity-0 transition-opacity duration-1000 bg-black" id="scene-loader">
        <div className="text-4xl font-bold tracking-[0.5em] text-white underline underline-offset-8 decoration-emerald-500 shadow-emerald-500 shadow-2xl animate-pulse">
          ZENITH FRONTIER
        </div>
      </div>
    </main>
  )
}

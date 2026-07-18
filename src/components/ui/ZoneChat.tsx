'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useGameStore } from '@/store/gameStore'

export default function ZoneChat() {
  const chat = useGameStore((s) => s.zone.chat)
  const connected = useGameStore((s) => s.zone.connected)
  const sendZoneChat = useGameStore((s) => s.sendZoneChat)
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.length])

  if (!connected) return null

  return (
    <div className="pointer-events-auto absolute bottom-28 left-4 z-20 w-[min(22rem,calc(100vw-2rem))]">
      <button
        type="button"
        className="mb-1 rounded-md border border-white/15 bg-black/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-100/90"
        onClick={() => setOpen((v) => !v)}
      >
        Zone chat {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className="rpg-panel overflow-hidden rounded-xl border border-white/10 bg-black/70 backdrop-blur-sm">
          <div className="max-h-36 space-y-1 overflow-y-auto px-3 py-2 text-[11px] leading-snug text-white/85">
            {chat.length === 0 && (
              <div className="text-white/35">Say hi to players in this zone…</div>
            )}
            {chat.map((m, i) => (
              <div key={`${m.at}-${i}`}>
                <span className="font-semibold text-cyan-200/90">{m.name}</span>
                <span className="text-white/40">: </span>
                <span>{m.text}</span>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <form
            className="flex border-t border-white/10"
            onSubmit={(e) => {
              e.preventDefault()
              sendZoneChat(text)
              setText('')
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={120}
              placeholder="Message…"
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[12px] text-white outline-none placeholder:text-white/30"
            />
            <button
              type="submit"
              className="px-3 text-[11px] font-semibold uppercase tracking-wide text-emerald-300/90"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

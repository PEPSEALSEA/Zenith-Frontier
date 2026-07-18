'use client'

import { useEffect, useRef } from 'react'
import { useGameStore } from '@/store/gameStore'
import { zoneSocket } from '@/services/zoneSocket'
import { getZoneAt } from '@/lib/map/mapManifest'
import type { ZoneEntitySeed, ZoneToClient } from '@/lib/zoneProtocol'
import { gasService } from '@/services/gasService'

export type ZoneEntityBinder = {
  getSeeds: () => ZoneEntitySeed[]
  applySnapshot: (entities: {
    id: string
    hp: number
    maxHp: number
    x: number
    y: number
    deadUntil: number
  }[]) => void
  applyDelta: (entities: {
    id: string
    hp?: number
    maxHp?: number
    x?: number
    y?: number
    deadUntil?: number
  }[]) => void
  getPos: () => { x: number; y: number; facing: number }
}

/**
 * Connects to ZoneRoom while playing. Entity HP sync is applied via binder callbacks.
 */
export function useZoneSession(
  enabled: boolean,
  binder: ZoneEntityBinder,
) {
  const binderRef = useRef(binder)
  binderRef.current = binder

  useEffect(() => {
    if (!enabled) {
      zoneSocket.disconnect()
      useGameStore.getState().setZoneConnected(false)
      return
    }

    let cancelled = false
    let lastMapId = ''

    const handleMessage = (msg: ZoneToClient) => {
      const store = useGameStore.getState()
      switch (msg.type) {
        case 'welcome':
          store.setZoneConnected(true, msg.mapId)
          store.setZoneAuthoritative(true)
          break
        case 'roster': {
          const selfId = store.auth.user?.email || store.player.name
          store.setRemotePlayers(
            msg.players
              .filter((p) => p.playerId !== selfId)
              .map((p) => ({
                playerId: p.playerId,
                name: p.name,
                appearance: p.appearance,
                jobMain: p.jobMain,
                x: p.x,
                y: p.y,
                facing: p.facing,
                level: p.level,
              })),
          )
          break
        }
        case 'presence_batch':
          store.patchRemotePresence(msg.players)
          break
        case 'chat':
          store.pushZoneChat({
            playerId: msg.playerId,
            name: msg.name,
            text: msg.text,
            at: msg.at,
          })
          break
        case 'entity_snapshot':
          binderRef.current.applySnapshot(msg.entities)
          break
        case 'entity_delta':
          binderRef.current.applyDelta(msg.entities)
          break
        case 'loot_grant':
          void store.applyLootGrant({
            grantId: msg.grantId,
            exp: msg.exp,
            money: msg.money,
            items: msg.items,
          })
          break
        case 'world_event':
          if (msg.kind === 'boss_killed') {
            store.markBossDefeated(msg.bossId, msg.loreText)
            binderRef.current.applyDelta(
              binderRef.current.getSeeds()
                .filter((e) => e.bossId === msg.bossId)
                .map((e) => ({
                  id: e.id,
                  hp: 0,
                  deadUntil: Number.MAX_SAFE_INTEGER,
                })),
            )
          }
          break
        case 'error':
          if (msg.message === 'zone_full') {
            store.pushToast({
              kind: 'info',
              title: 'Zone full',
              detail: 'This zone already has 8 players',
            })
          }
          break
        default:
          break
      }
    }

    const connectForPos = async () => {
      if (cancelled) return
      const store = useGameStore.getState()
      const pos = binderRef.current.getPos()
      const zone = getZoneAt(pos.x, pos.y)
      const mapId = zone?.id || 'world'
      const playerId = store.auth.user?.email || `guest:${store.player.name}`
      const seeds = binderRef.current.getSeeds()

      if (mapId !== lastMapId) {
        lastMapId = mapId
        zoneSocket.disconnect()
      }

      zoneSocket.connect(
        mapId,
        {
          type: 'join',
          playerId,
          name: store.player.name || 'Traveler',
          appearance: store.player.appearance,
          jobMain: store.player.jobs.main?.id || '',
          statsSnapshot: {
            atk: store.player.stats.atk,
            def: store.player.stats.def,
            spd: store.player.stats.spd,
            acc: store.player.stats.acc ?? 0.15,
            luk: store.player.stats.luck,
            level: store.player.stats.level,
          },
          x: pos.x,
          y: pos.y,
          facing: pos.facing,
          entities: seeds,
        },
        {
          onMessage: handleMessage,
          onClose: () => {
            useGameStore.getState().setZoneConnected(false)
            useGameStore.getState().setZoneAuthoritative(false)
          },
        },
      )
    }

    void (async () => {
      try {
        const bosses = await gasService.getAllBosses()
        if (cancelled) return
        const defeated = bosses
          .filter((b) => String(b.is_alive) === '0')
          .map((b) => String(b.boss_id))
        if (defeated.length) {
          useGameStore.setState((s) => ({
            world: {
              ...s.world,
              bossesDefeated: [...new Set([...s.world.bossesDefeated, ...defeated])],
            },
          }))
        }
      } catch {
        /* offline / sheets down */
      }
      await connectForPos()
    })()

    const mapWatch = window.setInterval(() => {
      const pos = binderRef.current.getPos()
      const zone = getZoneAt(pos.x, pos.y)
      const mapId = zone?.id || 'world'
      zoneSocket.setPresence(pos.x, pos.y, pos.facing)
      if (mapId !== lastMapId && zoneSocket.connected) {
        void connectForPos()
      }
    }, 400)

    return () => {
      cancelled = true
      window.clearInterval(mapWatch)
      zoneSocket.disconnect()
      useGameStore.getState().setZoneConnected(false)
      useGameStore.getState().setZoneAuthoritative(false)
    }
  }, [enabled])
}

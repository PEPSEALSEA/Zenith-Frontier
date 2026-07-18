'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { gasService } from '@/services/gasService'
import { sfx } from '@/lib/sfx'
import { drawStarTownFloor, ensureStarTownObjects, findNearbyGate, findNearbyInteractable, interactKindOf, interactPrompt, isInSafeZone, parseNum, STAR_TOWN_SPAWN, drawBuilding, drawCuteCritter, drawForestDecor, drawGolfGreen, drawLabelBelow } from '@/lib/starTown'
import { getZoneAt } from '@/lib/map/mapManifest'
import { drawTownWalls, drawParkGround, drawGatePath, resolveWalk } from '@/lib/map/worldLayout'
import { preloadSprites, drawSprite } from '@/lib/sprites'
import { parseAttackProfile, DEFAULT_ATTACK } from '@/lib/classSystem'
import { preloadSheets, updateFx, drawFx, spawnKillSplash, spawnLockSelectFx, spawnBurst, spawnShockwave, getScreenShake, addScreenShake } from '@/lib/combat/particles'
import { updateProjectiles, drawProjectiles } from '@/lib/combat/projectiles'
import { cycleLock, clearLock, getLocked, type LockState } from '@/lib/combat/targeting'
import { isStunned, tickDots, clearDeadStatus } from '@/lib/combat/status'
import { resolveBasicAttack, resolveSkillCast, applyProjectileDamage, type MutableMonster } from '@/lib/combat/resolve'
import {
  monsterAccFromAtkSpd,
  monsterEvaFromSpd,
  resolveMonsterSkillIds,
  rollDodge,
} from '@/lib/combat/hitDodge'

const WORLD_SIZE = 3200
const CONTACT_RANGE = 36
const CHASE_RANGE = 220
const RESPAWN_MS = 4000
const GATE_COOLDOWN_MS = 900

type LivingMonster = {
  id: string
  templateId: string
  name: string
  x: number
  y: number
  hp: number
  maxHp: number
  atk: number
  def: number
  spd: number
  acc: number
  eva: number
  skills: string[]
  skillCdUntil: number
  color: string
  face: string
  drops: string[]
  deadUntil: number
  flashUntil: number
  homeX: number
  homeY: number
}

type MonsterShot = {
  x: number
  y: number
  vx: number
  vy: number
  damage: number
  acc: number
  life: number
  born: number
  radius: number
}

type FloatText = {
  id: number
  x: number
  y: number
  text: string
  color: string
  born: number
}

type PanelState = {
  title: string
  body: string
  cost?: number
  item?: string
  kind: string
  objId: string
} | null

const getObjectColor = (type: string) => {
  switch (type) {
    case 'monster': return '#ef4444'
    case 'boss': return '#9333ea'
    case 'npc': return '#f59e0b'
    case 'market': return '#10b981'
    case 'hotel': return '#60a5fa'
    case 'landmark': return '#a78bfa'
    case 'forest': return '#166534'
    case 'town': return '#eab308'
    case 'safezone': return '#3b82f6'
    case 'spawner': return '#64748b'
    default: return '#fff'
  }
}

const drawFace = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, face: string) => {
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(1.5, r * 0.12)

  switch (face) {
    case 'ghost': {
      const top = y - r * 0.55
      const mid = y + r * 0.05
      const bottom = y + r * 0.7
      const left = x - r * 0.62
      const right = x + r * 0.62
      ctx.beginPath()
      ctx.moveTo(left, mid)
      ctx.bezierCurveTo(left, top, right, top, right, mid)
      ctx.lineTo(right, bottom - r * 0.15)
      ctx.quadraticCurveTo(x + r * 0.42, bottom + r * 0.12, x + r * 0.28, bottom - r * 0.18)
      ctx.quadraticCurveTo(x + r * 0.14, bottom + r * 0.12, x, bottom - r * 0.18)
      ctx.quadraticCurveTo(x - r * 0.14, bottom + r * 0.12, x - r * 0.28, bottom - r * 0.18)
      ctx.quadraticCurveTo(x - r * 0.42, bottom + r * 0.12, left, bottom - r * 0.15)
      ctx.closePath()
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(15,23,42,0.35)'
      ctx.lineWidth = Math.max(1, r * 0.06)
      ctx.stroke()
      ctx.fillStyle = 'rgba(15,23,42,0.85)'
      ctx.beginPath()
      ctx.arc(x - r * 0.22, y - r * 0.08, r * 0.11, 0, Math.PI * 2)
      ctx.arc(x + r * 0.22, y - r * 0.08, r * 0.11, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'skull': {
      ctx.beginPath()
      ctx.arc(x, y - r * 0.1, r * 0.62, Math.PI * 0.85, Math.PI * 2.15)
      ctx.lineTo(x + r * 0.38, y + r * 0.55)
      ctx.lineTo(x - r * 0.38, y + r * 0.55)
      ctx.closePath()
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(15,23,42,0.4)'
      ctx.stroke()
      ctx.fillStyle = 'rgba(15,23,42,0.85)'
      ctx.beginPath()
      ctx.arc(x - r * 0.22, y - r * 0.12, r * 0.12, 0, Math.PI * 2)
      ctx.arc(x + r * 0.22, y - r * 0.12, r * 0.12, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'star': {
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const a = (i * 2 * Math.PI) / 5 - Math.PI / 2
        const b = a + Math.PI / 5
        const x1 = x + Math.cos(a) * r * 0.85
        const y1 = y + Math.sin(a) * r * 0.85
        const x2 = x + Math.cos(b) * r * 0.38
        const y2 = y + Math.sin(b) * r * 0.38
        if (i === 0) ctx.moveTo(x1, y1)
        else ctx.lineTo(x1, y1)
        ctx.lineTo(x2, y2)
      }
      ctx.closePath()
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(15,23,42,0.35)'
      ctx.stroke()
      break
    }
    default: {
      ctx.beginPath()
      ctx.arc(x, y, r * 0.72, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(15,23,42,0.35)'
      ctx.stroke()
      ctx.fillStyle = 'rgba(15,23,42,0.85)'
      ctx.beginPath()
      ctx.arc(x - r * 0.22, y - r * 0.05, r * 0.1, 0, Math.PI * 2)
      ctx.arc(x + r * 0.22, y - r * 0.05, r * 0.1, 0, Math.PI * 2)
      ctx.fill()
      break
    }
  }
  ctx.restore()
}

function drawGroundShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  strength = 0.22,
) {
  const rx = radius * 0.78
  const ry = radius * 0.22
  const grad = ctx.createRadialGradient(x, y, 0, x, y, rx)
  grad.addColorStop(0, `rgba(0,0,0,${strength})`)
  grad.addColorStop(0.55, `rgba(0,0,0,${strength * 0.45})`)
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
}

/** Soft contact shadow drawn under sprite-based buildings, at their base y-offset. */
function buildingGroundShadow(ctx: CanvasRenderingContext2D, rx: number, dy: number) {
  ctx.save()
  const grad = ctx.createRadialGradient(0, dy, 0, 0, dy, rx)
  grad.addColorStop(0, 'rgba(8, 6, 5, 0.4)')
  grad.addColorStop(1, 'rgba(8, 6, 5, 0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.ellipse(0, dy, rx, rx * 0.34, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function dist(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx
  const dy = ay - by
  return Math.sqrt(dx * dx + dy * dy)
}

export default function GameScene2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const {
    player, updatePosition, world, updateWorldCycle, attack, castSkillSlot, useItemSlot, isEditorMode, isForgeMode,
    forgeSelection, addWorldObject, takeDamage, healFull, applyKillRewards, syncHpToServer,
    buyItem, spendMoney, setWorldObjects,
  } = useGameStore()
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({})
  const [panel, setPanel] = useState<PanelState>(null)
  const [hint, setHint] = useState('')
  const [safeBanner, setSafeBanner] = useState(true)
  const [deathScreen, setDeathScreen] = useState(false)
  const awaitingRespawnRef = useRef(false)
  const requestRef = useRef<number>(0)
  const posRef = useRef({ x: player.position.x, y: player.position.y })
  const camRef = useRef({ x: player.position.x, y: player.position.y })
  const camReady = useRef(false)
  const lastTimeRef = useRef<number>(0)
  const movingRef = useRef(false)
  const monstersRef = useRef<LivingMonster[]>([])
  const floatsRef = useRef<FloatText[]>([])
  const lastAttackHandled = useRef(0)
  const lastSkillHandled = useRef(0)
  const lastBasicAtkAt = useRef(0)
  const profileRef = useRef(DEFAULT_ATTACK)
  const lastContactHit = useRef(0)
  const deadUntilRef = useRef(0)
  const templatesReady = useRef(false)
  const floatId = useRef(0)
  const playerStatsRef = useRef(player.stats)
  const eLatch = useRef(false)
  const panelRef = useRef<PanelState>(null)
  const hintRef = useRef('')
  const safeRef = useRef(true)
  const facingRef = useRef(1)
  const buffRef = useRef({ atkMul: 1, defMul: 1, rangeAdd: 0, until: 0, stealthUntil: 0 })
  const skillKeyLatch = useRef<Set<string>>(new Set())
  const lockRef = useRef<LockState>({ targetId: null })
  const lastDotTick = useRef(0)
  const lastMpRegenAt = useRef(0)
  const mouseWorldRef = useRef({ x: 0, y: 0, ready: false })
  const lastAimAngleRef = useRef(0)
  const monsterShotsRef = useRef<MonsterShot[]>([])
  const lastGateWarp = useRef(0)
  const lastGateId = useRef('')

  useEffect(() => {
    preloadSheets()
    preloadSprites()
  }, [])

  useEffect(() => {
    playerStatsRef.current = player.stats
    profileRef.current = parseAttackProfile(player.jobs.main?.attack_profile)
  }, [player.stats, player.jobs.main?.attack_profile, player.jobs.main?.id])

  useEffect(() => {
    panelRef.current = panel
  }, [panel])

  useEffect(() => {
    posRef.current = { x: player.position.x, y: player.position.y }
  }, [player.position.x, player.position.y])

  useEffect(() => {
    const merged = ensureStarTownObjects(useGameStore.getState().world.objects)
    const cur = useGameStore.getState().world.objects
    const same =
      cur.length === merged.length &&
      cur.every(
        (o, i) =>
          o.id === merged[i]?.id &&
          o.name === merged[i]?.name &&
          o.type === merged[i]?.type &&
          o.x === merged[i]?.x &&
          o.y === merged[i]?.y,
      )
    if (!same) setWorldObjects(merged)
  }, [setWorldObjects])

  useEffect(() => {
    if (isEditorMode || isForgeMode) return
    let cancelled = false
    ;(async () => {
      const templates = await gasService.getAllMonsters()
      if (cancelled) return
      const byId = Object.fromEntries(templates.map((t) => [t.monster_id, t]))
      const objects = ensureStarTownObjects(useGameStore.getState().world.objects)

      const cuteFallback: Record<string, { name: string; hp: number; atk: number; def: number; spd: number; skills: string[]; drops: string[]; appearance: { color: string; face: string } }> = {
        MON_001: {
          name: 'Moss Slime',
          hp: 40,
          atk: 6,
          def: 1,
          spd: 6,
          skills: [],
          drops: ['EQ_004'],
          appearance: { color: '#22c55e', face: 'slime' },
        },
        MON_002: {
          name: 'Forest Wolf',
          hp: 70,
          atk: 12,
          def: 4,
          spd: 14,
          skills: [],
          drops: ['EQ_001'],
          appearance: { color: '#a3a3a3', face: 'wolf' },
        },
        MON_003: {
          name: 'Fluff Rabbit',
          hp: 28,
          atk: 4,
          def: 1,
          spd: 14,
          skills: ['hop'],
          drops: ['EQ_004'],
          appearance: { color: '#fda4af', face: 'bunny' },
        },
        MON_004: {
          name: 'Sleepy Sloth',
          hp: 55,
          atk: 7,
          def: 3,
          spd: 4,
          skills: ['spit'],
          drops: ['EQ_004'],
          appearance: { color: '#a8a29e', face: 'sloth' },
        },
        MON_005: {
          name: 'Moss Fox',
          hp: 42,
          atk: 9,
          def: 2,
          spd: 16,
          skills: ['hop'],
          drops: ['EQ_004'],
          appearance: { color: '#fb923c', face: 'fox' },
        },
        MON_006: {
          name: 'Puddle Frog',
          hp: 36,
          atk: 5,
          def: 2,
          spd: 10,
          skills: ['spit'],
          drops: ['EQ_004'],
          appearance: { color: '#4ade80', face: 'frog' },
        },
        MON_007: {
          name: 'Pine Squirrel',
          hp: 24,
          atk: 5,
          def: 1,
          spd: 18,
          skills: ['hop'],
          drops: ['EQ_004'],
          appearance: { color: '#c2410c', face: 'squirrel' },
        },
        MON_008: {
          name: 'Ember Bird',
          hp: 32,
          atk: 8,
          def: 1,
          spd: 20,
          skills: [],
          drops: ['EQ_004'],
          appearance: { color: '#f87171', face: 'bird' },
        },
        MON_009: {
          name: 'Bark Boar',
          hp: 80,
          atk: 14,
          def: 5,
          spd: 8,
          skills: [],
          drops: ['EQ_001'],
          appearance: { color: '#78716c', face: 'boar' },
        },
        MON_010: {
          name: 'Honey Bear',
          hp: 95,
          atk: 13,
          def: 6,
          spd: 7,
          skills: [],
          drops: ['EQ_001', 'EQ_004'],
          appearance: { color: '#92400e', face: 'bear' },
        },
        MON_011: {
          name: 'Spore Cap',
          hp: 45,
          atk: 7,
          def: 3,
          spd: 5,
          skills: ['spit'],
          drops: ['EQ_004'],
          appearance: { color: '#dc2626', face: 'mushroom' },
        },
        MON_012: {
          name: 'Leaf Beetle',
          hp: 38,
          atk: 8,
          def: 4,
          spd: 11,
          skills: [],
          drops: ['EQ_004'],
          appearance: { color: '#65a30d', face: 'beetle' },
        },
      }

      const fromMap: LivingMonster[] = objects
        .filter((o) => o.type === 'monster' || o.type === 'boss')
        .map((o) => {
          const tid = String(o.params?.entity_id || o.params?.monster_id || 'MON_003')
          const t = byId[tid] || cuteFallback[tid]
          const hp = t?.hp || 30
          const spd = t?.spd || 8
          const atk = t?.atk || 5
          const skills = (t as { skills?: string[] })?.skills?.length
            ? (t as { skills: string[] }).skills
            : (cuteFallback[tid]?.skills || [])
          return {
            id: o.id,
            templateId: tid,
            name: t?.name || o.name || 'Critter',
            x: o.x,
            y: o.y,
            homeX: o.x,
            homeY: o.y,
            hp,
            maxHp: hp,
            atk,
            def: t?.def || 1,
            spd,
            acc: monsterAccFromAtkSpd(atk, spd),
            eva: monsterEvaFromSpd(spd),
            skills,
            skillCdUntil: 0,
            color: t?.appearance?.color || '#fda4af',
            face: t?.appearance?.face || 'bunny',
            drops: t?.drops || ['EQ_004'],
            deadUntil: 0,
            flashUntil: 0,
          }
        })

      if (fromMap.length === 0) {
        for (const tid of ['MON_003', 'MON_004'] as const) {
          const t = byId[tid] || cuteFallback[tid]
          const ox = tid === 'MON_003' ? 720 : 900
          const oy = tid === 'MON_003' ? 220 : 280
          fromMap.push({
            id: `runtime_${tid}`,
            templateId: tid,
            name: t.name,
            x: ox,
            y: oy,
            homeX: ox,
            homeY: oy,
            hp: t.hp,
            maxHp: t.hp,
            atk: t.atk,
            def: t.def,
            spd: t.spd,
            acc: monsterAccFromAtkSpd(t.atk, t.spd),
            eva: monsterEvaFromSpd(t.spd),
            skills: t.skills || [],
            skillCdUntil: 0,
            color: t.appearance.color,
            face: t.appearance.face,
            drops: t.drops,
            deadUntil: 0,
            flashUntil: 0,
          })
        }
      }

      monstersRef.current = fromMap
      templatesReady.current = true
    })()
    return () => { cancelled = true }
  }, [isEditorMode, isForgeMode, world.objects])

  const pushFloat = (x: number, y: number, text: string, color: string) => {
    floatsRef.current.push({
      id: ++floatId.current,
      x, y, text, color,
      born: Date.now(),
    })
  }

  const findRespawn = () => {
    const safe = world.objects.find((o) => o.type === 'safezone' || o.type === 'town')
    return safe ? { x: safe.x, y: safe.y } : { ...STAR_TOWN_SPAWN }
  }

  const doRespawn = useCallback(() => {
    if (!awaitingRespawnRef.current) return
    awaitingRespawnRef.current = false
    deadUntilRef.current = 0
    setDeathScreen(false)
    const spawn = findRespawn()
    posRef.current = { ...spawn }
    camRef.current = { ...spawn }
    healFull()
    void syncHpToServer()
    spawnBurst(spawn.x, spawn.y, '#34d399', 24)
    spawnShockwave(spawn.x, spawn.y, '#fbbf24', 80, 500)
    pushFloat(spawn.x, spawn.y - 40, 'RESPAWN', '#fbbf24')
    sfx.levelUp()
  }, [healFull, syncHpToServer, world.objects])

  const runInteract = useCallback(async () => {
    if (isEditorMode || isForgeMode) return
    if (deadUntilRef.current > Date.now()) return

    const open = panelRef.current
    if (open) {
      const kind = open.kind
      if (kind === 'shop' && open.item && open.cost != null) {
        const ok = await buyItem({ itemId: open.item, price: open.cost, name: 'Health Potion' })
        if (ok) {
          pushFloat(posRef.current.x, posRef.current.y - 40, 'POTION +1', '#34d399')
          sfx.coin()
        } else {
          pushFloat(posRef.current.x, posRef.current.y - 40, 'NOT ENOUGH G', '#f87171')
        }
      } else if (kind === 'rest') {
        const cost = open.cost || 0
        if (cost > 0 && !spendMoney(cost)) {
          pushFloat(posRef.current.x, posRef.current.y - 40, 'NOT ENOUGH G', '#f87171')
        } else {
          if (cost > 0) {
            const email = useGameStore.getState().auth.user?.email
            if (email) {
              const moneyRes = await gasService.addMoney(email, -cost)
              if (moneyRes.startsWith('OK|MONEY_UPDATED|')) {
                const m = Number(moneyRes.split('|')[2])
                if (!Number.isNaN(m)) {
                  useGameStore.setState((state) => ({
                    player: { ...state.player, stats: { ...state.player.stats, money: m } },
                  }))
                }
              }
            }
          }
          healFull()
          void syncHpToServer()
          pushFloat(posRef.current.x, posRef.current.y - 40, 'FULL REST', '#60a5fa')
          sfx.levelUp()
        }
      } else if (kind === 'heal') {
        healFull()
        void syncHpToServer()
        pushFloat(posRef.current.x, posRef.current.y - 40, 'HEALED', '#2dd4bf')
        sfx.levelUp()
      } else if (kind === 'golf') {
        pushFloat(posRef.current.x, posRef.current.y - 40, 'FORE!', '#86efac')
        sfx.hit()
      }
      setPanel(null)
      return
    }

    const near = findNearbyInteractable(posRef.current.x, posRef.current.y, world.objects)
    if (!near) return
    const kind = interactKindOf(near)
    if (!kind) return
    const info = interactPrompt(near)
    setPanel({ ...info, kind, objId: near.id })
  }, [buyItem, healFull, isEditorMode, isForgeMode, spendMoney, syncHpToServer, world.objects])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys((prev) => ({ ...prev, [e.code]: true }))
      if (e.code === 'KeyE' && !eLatch.current) {
        eLatch.current = true
        void runInteract()
      }
      if (e.code === 'Escape') setPanel(null)
      if (awaitingRespawnRef.current && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE')) {
        e.preventDefault()
        doRespawn()
        return
      }
      if (e.code === 'Tab' && !isEditorMode && !isForgeMode) {
        e.preventDefault()
        if (awaitingRespawnRef.current) return
        const id = cycleLock(lockRef.current, monstersRef.current, posRef.current, Date.now())
        if (id) {
          const m = monstersRef.current.find((x) => x.id === id)
          if (m) spawnLockSelectFx(posRef.current.x, posRef.current.y, m.x, m.y)
        }
        return
      }
      if (!isEditorMode && !isForgeMode) {
        const slotMap: Record<string, 1 | 2 | 3 | 4> = {
          Digit1: 1, Digit2: 2, Digit3: 3, Digit4: 4,
          Numpad1: 1, Numpad2: 2, Numpad3: 3, Numpad4: 4,
        }
        const slot = slotMap[e.code]
        if (slot) {
          if (skillKeyLatch.current.has(e.code)) return
          skillKeyLatch.current.add(e.code)
          if (deadUntilRef.current > Date.now()) return
          const state = useGameStore.getState()
          const skillId = state.player.skillSlots[slot - 1]
          const skill = state.player.skillCatalog.find((s) => s.skill_id === skillId)
          const inSafe = isInSafeZone(posRef.current.x, posRef.current.y, world.objects)
          if (inSafe && skill?.skill_type === 'damage') {
            state.pushToast({
              kind: 'info',
              title: skill.skill_name,
              detail: 'Leave town to use combat skills',
            })
            return
          }
          castSkillSlot(slot)
        }
        if (e.code === 'KeyZ' || e.code === 'KeyX') {
          if (deadUntilRef.current > Date.now()) return
          if (panelRef.current) return
          const itemSlot = e.code === 'KeyZ' ? 1 : 2
          void useItemSlot(itemSlot).then((ok) => {
            if (!ok) return
            pushFloat(posRef.current.x, posRef.current.y - 42, 'ITEM', '#86efac')
          })
        }
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys((prev) => ({ ...prev, [e.code]: false }))
      if (e.code === 'KeyE') eLatch.current = false
      skillKeyLatch.current.delete(e.code)
    }
    const handleMouseDown = (e: MouseEvent) => {
      if (isForgeMode && forgeSelection) {
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        const camX = camRef.current.x - canvas.width / 2
        const camY = camRef.current.y - canvas.height / 2
        const t = forgeSelection.type
        addWorldObject({
          id: `obj_${Date.now()}`,
          type: t,
          x: mouseX + camX,
          y: mouseY + camY,
          name: forgeSelection.name || `New ${t}`,
          radius: (t === 'town' || t === 'safezone' || t === 'forest') ? 200 : 30,
          params: {
            ...(forgeSelection.id ? { entity_id: forgeSelection.id } : {}),
            ...(t === 'town' ? { shape: 'rect', w: '360', h: '320' } : {}),
            ...(t === 'hotel' ? { interact: 'rest', price: '10' } : {}),
            ...(t === 'market' ? { interact: 'shop', price: '25', item_id: 'EQ_004' } : {}),
            ...(t === 'npc' ? { interact: 'talk' } : {}),
          },
        })
        return
      }
      if (isEditorMode) return
      if (deadUntilRef.current > Date.now()) return
      if (isInSafeZone(posRef.current.x, posRef.current.y, world.objects)) return
      {
        const canvas = canvasRef.current
        if (canvas) {
          const rect = canvas.getBoundingClientRect()
          const camX = camRef.current.x - canvas.width / 2
          const camY = camRef.current.y - canvas.height / 2
          mouseWorldRef.current = {
            x: e.clientX - rect.left + camX,
            y: e.clientY - rect.top + camY,
            ready: true,
          }
          const mdx = mouseWorldRef.current.x - posRef.current.x
          if (Math.abs(mdx) > 2) facingRef.current = mdx >= 0 ? 1 : -1
        }
      }
      if (e.button === 0 && !e.shiftKey) {
        // click empty: soft-clear lock if far from any monster
        const near = monstersRef.current.find(
          (m) => m.deadUntil <= Date.now() && dist(posRef.current.x, posRef.current.y, m.x, m.y) < 40,
        )
        if (!near && e.detail === 2) clearLock(lockRef.current)
      }
      const profile = profileRef.current
      const now = Date.now()
      const spendBasicMp = (cost: number) => {
        if (cost <= 0) return true
        const mp = useGameStore.getState().player.stats.mp
        if (mp < cost) {
          useGameStore.getState().pushToast({
            kind: 'info',
            title: 'Out of MP',
            detail: `Need ${cost} MP to cast`,
          })
          return false
        }
        useGameStore.setState((s) => ({
          player: {
            ...s.player,
            stats: { ...s.player.stats, mp: s.player.stats.mp - cost },
          },
        }))
        return true
      }
      if (e.button === 0) {
        if (now - lastBasicAtkAt.current < profile.light_cd) return
        if (!spendBasicMp(profile.mp_cost_light || 0)) return
        lastBasicAtkAt.current = now
        attack('light')
      }
      if (e.button === 2) {
        if (now - lastBasicAtkAt.current < profile.hard_cd) return
        if (!spendBasicMp(profile.mp_cost_hard || 0)) return
        lastBasicAtkAt.current = now
        attack('hard')
      }
    }
    const handleContextMenu = (e: MouseEvent) => e.preventDefault()
    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const camX = camRef.current.x - canvas.width / 2
      const camY = camRef.current.y - canvas.height / 2
      mouseWorldRef.current = {
        x: e.clientX - rect.left + camX,
        y: e.clientY - rect.top + camY,
        ready: true,
      }
      const dx = mouseWorldRef.current.x - posRef.current.x
      if (Math.abs(dx) > 2) facingRef.current = dx >= 0 ? 1 : -1
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('contextmenu', handleContextMenu)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [attack, castSkillSlot, useItemSlot, isEditorMode, isForgeMode, forgeSelection, addWorldObject, runInteract, world.objects, doRespawn])

  const animate = (time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time
    const deltaTime = Math.min(64, time - lastTimeRef.current) / 16.66
    lastTimeRef.current = time

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const now = Date.now()
    const isDead = deadUntilRef.current > now
    const objects = world.objects

    let dx = 0
    let dy = 0
    const baseSpeed = isForgeMode ? 15 : (isEditorMode ? playerStatsRef.current.spd * 1.5 : playerStatsRef.current.spd * 0.48)
    if (!isDead && !panelRef.current) {
      if (keys['KeyW'] || keys['ArrowUp']) dy -= baseSpeed
      if (keys['KeyS'] || keys['ArrowDown']) dy += baseSpeed
      if (keys['KeyA'] || keys['ArrowLeft']) dx -= baseSpeed
      if (keys['KeyD'] || keys['ArrowRight']) dx += baseSpeed
    }

    if (dx !== 0 && dy !== 0) {
      const factor = 1 / Math.sqrt(2); dx *= factor; dy *= factor
    }

    const fromX = posRef.current.x
    const fromY = posRef.current.y
    const toX = Math.max(0, Math.min(WORLD_SIZE, fromX + dx * deltaTime))
    const toY = Math.max(0, Math.min(WORLD_SIZE, fromY + dy * deltaTime))
    const next = resolveWalk(fromX, fromY, toX, toY)
    posRef.current.x = next.x
    posRef.current.y = next.y
    movingRef.current = dx !== 0 || dy !== 0
    if (dx > 0) facingRef.current = 1
    else if (dx < 0) facingRef.current = -1

    // Passive mana regen (casters rely on MP for basic attacks)
    if (!isEditorMode && !isForgeMode && !isDead && now - lastMpRegenAt.current > 250) {
      lastMpRegenAt.current = now
      const st = useGameStore.getState().player.stats
      if (st.mp < st.maxMp) {
        const perSec = 3 + Math.floor((st.luck || 5) * 0.05) + Math.floor((st.maxMp || 50) / 80)
        const gain = Math.max(1, Math.floor(perSec * 0.25))
        useGameStore.setState((s) => ({
          player: {
            ...s.player,
            stats: {
              ...s.player.stats,
              mp: Math.min(s.player.stats.maxMp, s.player.stats.mp + gain),
            },
          },
        }))
      }
    }

    const playerSafe = isInSafeZone(posRef.current.x, posRef.current.y, objects)
    if (buffRef.current.until > 0 && now > buffRef.current.until) {
      buffRef.current = { ...buffRef.current, atkMul: 1, defMul: 1, rangeAdd: 0, until: 0 }
    }
    const buff = buffRef.current.until > now
      ? buffRef.current
      : { atkMul: 1, defMul: 1, rangeAdd: 0, until: 0, stealthUntil: buffRef.current.stealthUntil }
    const stealthed = buffRef.current.stealthUntil > now
    const atkNow = playerStatsRef.current.atk * buff.atkMul
    const defNow = playerStatsRef.current.def * buff.defMul
    const luckNow = playerStatsRef.current.luck || 5
    const accNow = playerStatsRef.current.acc ?? 0.15
    const evaNow = playerStatsRef.current.eva ?? 0.08

    const applyPlayerHit = (dmg: number, monsterAcc: number) => {
      if (rollDodge(evaNow, monsterAcc)) {
        pushFloat(posRef.current.x, posRef.current.y - 30, 'DODGE', '#67e8f9')
        return
      }
      takeDamage(dmg)
      pushFloat(posRef.current.x, posRef.current.y - 30, `-${dmg}`, '#f87171')
      sfx.hit()
      const hp = useGameStore.getState().player.stats.hp
      if (hp <= 0 && !awaitingRespawnRef.current) {
        awaitingRespawnRef.current = true
        deadUntilRef.current = Number.MAX_SAFE_INTEGER
        setDeathScreen(true)
        sfx.death()
        addScreenShake(10, 420)
        spawnBurst(posRef.current.x, posRef.current.y, '#ef4444', 28)
        spawnShockwave(posRef.current.x, posRef.current.y, '#7f1d1d', 100, 600)
      }
    }

    const onKillMonster = (m: MutableMonster) => {
      const live = m as LivingMonster
      live.hp = 0
      live.deadUntil = now + RESPAWN_MS
      clearDeadStatus(live.id)
      if (lockRef.current.targetId === live.id) lockRef.current.targetId = null
      const expGain = Math.max(10, Math.floor(live.maxHp / 3))
      const moneyGain = Math.max(4, Math.floor(live.atk * 2 + 6))
      const dropItems = live.drops.filter((d) => d.startsWith('EQ_') || d.startsWith('ITEM_'))
      spawnKillSplash(live.x, live.y, live.color || '#fbbf24')
      pushFloat(live.x, live.y - 70, 'KILL!', '#fb7185')
      pushFloat(live.x, live.y - 40, `+${expGain} EXP`, '#34d399')
      pushFloat(live.x, live.y - 55, `+${moneyGain} G`, '#fbbf24')
      sfx.kill()
      void applyKillRewards({ exp: expGain, money: moneyGain, items: dropItems.slice(0, 1) })
    }

    const locked = getLocked(lockRef.current, monstersRef.current, now)
    const aimPoint = mouseWorldRef.current.ready
      ? { x: mouseWorldRef.current.x, y: mouseWorldRef.current.y }
      : null
    if (locked) {
      lastAimAngleRef.current = Math.atan2(locked.y - posRef.current.y, locked.x - posRef.current.x)
    } else if (aimPoint) {
      lastAimAngleRef.current = Math.atan2(aimPoint.y - posRef.current.y, aimPoint.x - posRef.current.x)
    } else {
      lastAimAngleRef.current = facingRef.current >= 0 ? 0 : Math.PI
    }

    const lastAtk = world.lastAttack
    const profile = profileRef.current
    const atkCd = lastAtk.type === 'hard' ? profile.hard_cd : profile.light_cd
    if (
      !isEditorMode && !isForgeMode && !isDead && !playerSafe &&
      lastAtk.time && lastAtk.time !== lastAttackHandled.current &&
      now - lastAtk.time < atkCd + 50 && lastAtk.type
    ) {
      lastAttackHandled.current = lastAtk.time
      resolveBasicAttack({
        profile,
        type: lastAtk.type,
        origin: posRef.current,
        facing: facingRef.current,
        locked,
        aimPoint,
        atk: atkNow,
        luck: luckNow,
        acc: accNow,
        rangeAdd: buff.rangeAdd,
        monsters: monstersRef.current,
        now,
        pushFloat,
        onKill: onKillMonster,
      })
    }

    const lastSkill = world.lastSkillCast
    if (
      !isEditorMode && !isForgeMode && !isDead &&
      lastSkill && lastSkill.time !== lastSkillHandled.current &&
      now - lastSkill.time < 400
    ) {
      lastSkillHandled.current = lastSkill.time
      const raw = useGameStore.getState().player.skillCatalog.find((s) => s.skill_id === lastSkill.skillId)
      if (raw) {
        const skill = {
          skill_id: raw.skill_id,
          skill_name: raw.skill_name,
          skill_type: raw.skill_type,
          power: Number(raw.power) || 1,
          range: Number(raw.range) || 80,
          effect: String(raw.effect || ''),
        }
        if (!(playerSafe && skill.skill_type === 'damage')) {
          resolveSkillCast({
            skill,
            origin: { ...posRef.current },
            facing: facingRef.current,
            locked,
            aimPoint,
            atk: atkNow,
            luck: luckNow,
            acc: accNow,
            rangeAdd: buff.rangeAdd,
            monsters: monstersRef.current,
            now,
            pushFloat,
            onKill: onKillMonster,
            applyHeal: (hp, mp) => {
              useGameStore.setState((s) => ({
                player: {
                  ...s.player,
                  stats: {
                    ...s.player.stats,
                    hp: Math.min(s.player.stats.maxHp, s.player.stats.hp + hp),
                    mp: Math.min(s.player.stats.maxMp, s.player.stats.mp + mp),
                  },
                },
              }))
            },
            applyBuff: (kind, power, duration) => {
              if (kind === 'stealth') {
                buffRef.current.stealthUntil = now + duration
                return
              }
              if (kind === 'atk') buffRef.current = { ...buffRef.current, atkMul: power, until: now + duration }
              else if (kind === 'def') buffRef.current = { ...buffRef.current, defMul: power, until: now + duration }
              else if (kind === 'range') buffRef.current = { ...buffRef.current, rangeAdd: 50, until: now + duration }
            },
            applyDash: (d) => {
              const ang = lastAimAngleRef.current
              const nx = Math.max(0, Math.min(WORLD_SIZE, posRef.current.x + Math.cos(ang) * d))
              const ny = Math.max(0, Math.min(WORLD_SIZE, posRef.current.y + Math.sin(ang) * d))
              const next = resolveWalk(posRef.current.x, posRef.current.y, nx, ny)
              posRef.current.x = next.x
              posRef.current.y = next.y
              facingRef.current = Math.cos(ang) >= 0 ? 1 : -1
            },
          })
        }
      }
    }

    // projectiles
    if (!isEditorMode && !isForgeMode) {
      const projHits = updateProjectiles(now, deltaTime, monstersRef.current, (id) => {
        const m = monstersRef.current.find((x) => x.id === id)
        return m && m.deadUntil <= now ? { x: m.x, y: m.y } : null
      })
      for (const h of projHits) {
        applyProjectileDamage(
          monstersRef.current,
          h.targetId,
          h.damage,
          now,
          luckNow,
          h.status,
          h.aoe,
          h.x,
          h.y,
          pushFloat,
          onKillMonster,
          h.onHitSfx,
          accNow,
        )
      }
      updateFx(now, deltaTime)
      if (now - lastDotTick.current > 400) {
        lastDotTick.current = now
        tickDots(now, 400, (id, dmg) => {
          const m = monstersRef.current.find((x) => x.id === id)
          if (!m || m.deadUntil > now) return
          m.hp -= dmg
          m.flashUntil = now + 80
          pushFloat(m.x, m.y - 18, `-${dmg}`, '#a855f7')
          if (m.hp <= 0) onKillMonster(m)
        })
      }
    }

    if (time % 50 < 16) {
      updatePosition(posRef.current.x, posRef.current.y)
      if (!isEditorMode) updateWorldCycle(0.0005 * deltaTime)
      const near = findNearbyInteractable(posRef.current.x, posRef.current.y, objects)
      const gateNear = findNearbyGate(posRef.current.x, posRef.current.y, objects)
      const zone = getZoneAt(posRef.current.x, posRef.current.y)
      const lockHint = locked ? ` · Lock: ${locked.id.slice(0, 8)}` : ''
      const nextHint = near && !panelRef.current
        ? `Press E — ${near.name}`
        : gateNear
          ? `Gate → walk through`
          : (!playerSafe && !isEditorMode ? `Aim mouse · Tab lock${lockHint}` : '')
      if (nextHint !== hintRef.current) {
        hintRef.current = nextHint
        setHint(nextHint)
      }
      if (playerSafe !== safeRef.current) {
        safeRef.current = playerSafe
        setSafeBanner(playerSafe)
      }
      if (!playerSafe && zone && zone.name) {
        // banner text handled below via zone name in UI
      }
    }

    if (!isEditorMode && !isForgeMode && !isDead) {
      const gate = findNearbyGate(posRef.current.x, posRef.current.y, objects, 32)
      if (gate && now - lastGateWarp.current > GATE_COOLDOWN_MS) {
        if (lastGateId.current !== gate.id || now - lastGateWarp.current > GATE_COOLDOWN_MS) {
          lastGateWarp.current = now
          lastGateId.current = gate.id
          posRef.current.x = parseNum(gate.params?.spawn_x, posRef.current.x)
          posRef.current.y = parseNum(gate.params?.spawn_y, posRef.current.y)
          pushFloat(posRef.current.x, posRef.current.y - 36, gate.name, '#facc15')
          sfx.whoosh()
        }
      } else if (!gate) {
        lastGateId.current = ''
      }
    }

    if (!isEditorMode && !isForgeMode && !isDead) {
      for (const m of monstersRef.current) {
        if (m.deadUntil > now) {
          if (m.deadUntil - now < 50) {
            m.hp = m.maxHp
            m.x = m.homeX
            m.y = m.homeY
          }
          continue
        }
        if (isInSafeZone(m.homeX, m.homeY, objects)) continue
        if (isStunned(m.id, now)) continue
        if (stealthed) continue

        const dPlayer = dist(posRef.current.x, posRef.current.y, m.x, m.y)
        if (dPlayer < CHASE_RANGE && !playerSafe) {
          const ang = Math.atan2(posRef.current.y - m.y, posRef.current.x - m.x)
          const step = (m.spd * 0.15) * deltaTime
          m.x += Math.cos(ang) * step
          m.y += Math.sin(ang) * step

          const skillDefs = resolveMonsterSkillIds(m.skills)
          if (skillDefs.length && now >= m.skillCdUntil && dPlayer < skillDefs[0].range) {
            const sk = skillDefs[0]
            m.skillCdUntil = now + sk.cooldownMs
            if (sk.kind === 'hop') {
              m.x += Math.cos(ang) * 55
              m.y += Math.sin(ang) * 55
              pushFloat(m.x, m.y - 28, 'HOP', '#fda4af')
              if (dist(posRef.current.x, posRef.current.y, m.x, m.y) < CONTACT_RANGE + 10) {
                const dmg = Math.max(1, Math.floor(m.atk * sk.power - defNow * 0.3))
                applyPlayerHit(dmg, m.acc)
              }
            } else if (sk.kind === 'spit') {
              const spd = sk.speed || 2.2
              monsterShotsRef.current.push({
                x: m.x,
                y: m.y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                damage: Math.max(1, Math.floor(m.atk * sk.power)),
                acc: m.acc,
                life: 1800,
                born: now,
                radius: 8,
              })
              pushFloat(m.x, m.y - 28, 'SPIT', '#a8a29e')
            }
          }
        } else {
          const homeD = dist(m.x, m.y, m.homeX, m.homeY)
          if (homeD > 8) {
            const ang = Math.atan2(m.homeY - m.y, m.homeX - m.x)
            m.x += Math.cos(ang) * 0.8 * deltaTime
            m.y += Math.sin(ang) * 0.8 * deltaTime
          }
        }

        if (
          !playerSafe && !stealthed &&
          dist(posRef.current.x, posRef.current.y, m.x, m.y) < CONTACT_RANGE &&
          now - lastContactHit.current > 700
        ) {
          lastContactHit.current = now
          const dmg = Math.max(1, Math.floor(m.atk - defNow * 0.3))
          applyPlayerHit(dmg, m.acc)
        }
      }

      for (let i = monsterShotsRef.current.length - 1; i >= 0; i--) {
        const shot = monsterShotsRef.current[i]
        shot.x += shot.vx * deltaTime
        shot.y += shot.vy * deltaTime
        if (now - shot.born > shot.life) {
          monsterShotsRef.current.splice(i, 1)
          continue
        }
        if (playerSafe || stealthed || isDead) continue
        if (dist(posRef.current.x, posRef.current.y, shot.x, shot.y) < shot.radius + 18) {
          applyPlayerHit(shot.damage, shot.acc)
          monsterShotsRef.current.splice(i, 1)
        }
      }
    }

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    if (!camReady.current) {
      camRef.current.x = posRef.current.x
      camRef.current.y = posRef.current.y
      camReady.current = true
    }
    const camLerp = 1 - Math.pow(0.86, deltaTime)
    camRef.current.x += (posRef.current.x - camRef.current.x) * camLerp
    camRef.current.y += (posRef.current.y - camRef.current.y) * camLerp

    const camX = camRef.current.x - width / 2
    const camY = camRef.current.y - height / 2
    const shake = getScreenShake(now)

    ctx.save()
    ctx.translate(-camX + shake.x, -camY + shake.y)

    const gradientBg = ctx.createRadialGradient(camRef.current.x, camRef.current.y, 40, camRef.current.x, camRef.current.y, 900)
    if (playerSafe) {
      gradientBg.addColorStop(0, '#1a1520')
      gradientBg.addColorStop(0.45, '#0f172a')
      gradientBg.addColorStop(1, '#020617')
    } else {
      gradientBg.addColorStop(0, '#0c1f14')
      gradientBg.addColorStop(0.5, '#07140e')
      gradientBg.addColorStop(1, '#020617')
    }
    ctx.fillStyle = gradientBg
    ctx.fillRect(camX, camY, width, height)

    if (isEditorMode) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)'
      ctx.lineWidth = 1
      for (let x = 0; x <= WORLD_SIZE; x += 100) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_SIZE); ctx.stroke()
      }
      for (let y = 0; y <= WORLD_SIZE; y += 100) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_SIZE, y); ctx.stroke()
      }
    }

    drawGatePath(ctx)

    for (const obj of objects) {
      if (obj.type === 'town' || obj.type === 'safezone') {
        drawStarTownFloor(ctx, obj)
      }
      if (obj.type === 'forest') {
        drawParkGround(ctx, obj)
      }
    }

    drawTownWalls(ctx)
    drawForestDecor(ctx, camX, camY, width, height)

    for (const obj of objects) {
      if (obj.type === 'spawner') {
        ctx.save()
        ctx.translate(obj.x, obj.y)
        ctx.strokeStyle = '#64748b88'
        ctx.strokeRect(-12, -12, 24, 24)
        ctx.restore()
      }
      if (obj.type === 'town') {
        ctx.fillStyle = '#fde68a'
        ctx.font = '700 18px Oxanium, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(obj.name, obj.x, obj.y - zoneLabelOffset(obj) - 20)
      }
      if (obj.type === 'forest') {
        ctx.fillStyle = 'rgba(187, 247, 208, 0.85)'
        ctx.font = '600 13px Oxanium, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(obj.name, obj.x, obj.y - obj.radius * 0.55)
      }
    }

    const drawables = objects
      .filter((o) => o.type !== 'monster' && o.type !== 'boss' && o.type !== 'town' && o.type !== 'safezone' && o.type !== 'forest' && o.type !== 'spawner')
      .sort((a, b) => (a.z || 0) - (b.z || 0) || a.y - b.y)

    for (const obj of drawables) {
      ctx.save()
      ctx.translate(obj.x, obj.y)
      const color = String(obj.params?.color || getObjectColor(obj.type))
      const kind = String(obj.params?.kind || '')
      let labelOffset = 28
      if (obj.type === 'landmark' && kind === 'golf') {
        drawGolfGreen(ctx, 28)
      } else if (obj.type === 'npc') {
        ctx.shadowBlur = 14
        ctx.shadowColor = color
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(0, 0, 14, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        drawFace(ctx, 0, 0, 8, String(obj.params?.face || 'star'))
      } else if (kind === 'gate') {
        const gateRole = String(obj.params?.gate || '')
        if (gateRole === 'entrance') {
          ctx.restore()
          continue
        }
        buildingGroundShadow(ctx, 42, 18)
        if (!drawSprite(ctx, 'gate', 96, 22)) drawBuilding(ctx, 'landmark', color, 30, 'gate')
        labelOffset = 24
        drawLabelBelow(ctx, obj.name, labelOffset)
        ctx.restore()
        continue
      } else if (kind === 'house') {
        buildingGroundShadow(ctx, 46, 30)
        if (!drawSprite(ctx, 'house', 108, 30)) drawBuilding(ctx, 'house', color, 30, 'house')
        labelOffset = 32
      } else if (obj.type === 'market') {
        buildingGroundShadow(ctx, 38, 24)
        if (!drawSprite(ctx, 'market', 82, 24)) drawBuilding(ctx, 'market', color, 26, kind)
        labelOffset = 26
      } else if (obj.type === 'hotel') {
        buildingGroundShadow(ctx, 44, 28)
        if (!drawSprite(ctx, 'inn', 96, 28)) drawBuilding(ctx, 'hotel', color, 26, kind)
        labelOffset = 30
      } else {
        drawBuilding(ctx, obj.type === 'landmark' ? 'landmark' : obj.type, color, 26, kind)
      }
      drawLabelBelow(ctx, obj.name, labelOffset)
      ctx.restore()
    }

    for (const m of monstersRef.current) {
      if (m.deadUntil > now) continue
      const mBob = Math.sin(time * 0.006 + m.x * 0.02) * 1.6
      ctx.save()
      ctx.translate(m.x, m.y)
      drawGroundShadow(ctx, 0, 14, 16, 0.2)
      ctx.translate(0, mBob)
      if (m.flashUntil > now) ctx.globalAlpha = 0.5
      drawCuteCritter(ctx, m.face, m.color, 16)
      const barW = 36
      const pct = Math.max(0, m.hp / m.maxHp)
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.fillRect(-barW / 2, -30, barW, 5)
      ctx.fillStyle = pct > 0.35 ? '#86efac' : '#fb7185'
      ctx.fillRect(-barW / 2, -30, barW * pct, 5)
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.font = '600 9px Outfit, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(m.name, 0, 26)
      ctx.restore()
    }

    for (const shot of monsterShotsRef.current) {
      ctx.save()
      ctx.strokeStyle = 'rgba(168, 162, 158, 0.9)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    const walkBob = Math.sin(time * (movingRef.current ? 0.016 : 0.006)) * (movingRef.current ? 2.2 : 0.9)
    const pX = posRef.current.x
    const pY = posRef.current.y + walkBob
    const radius = isEditorMode ? 40 : 32

    if (isEditorMode) {
      ctx.beginPath()
      ctx.arc(pX, posRef.current.y, radius + 10, 0, Math.PI * 2)
      ctx.strokeStyle = '#f59e0b'
      ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([])
    }

    const attackAge = Date.now() - world.lastAttack.time
    if (attackAge < 280 && !playerSafe && world.lastAttack.type) {
      const progress = attackAge / 280
      const ang = lastAimAngleRef.current
      const r = (world.lastAttack.type === 'hard' ? profileRef.current.hard_range : profileRef.current.light_range) * 0.55
      ctx.beginPath()
      ctx.moveTo(posRef.current.x, posRef.current.y)
      ctx.arc(posRef.current.x, posRef.current.y, r * (0.5 + progress * 0.5), ang - 0.9, ang + 0.9)
      ctx.closePath()
      ctx.strokeStyle = world.lastAttack.type === 'hard'
        ? `rgba(239, 68, 68, ${1 - progress})`
        : `rgba(255, 255, 255, ${1 - progress})`
      ctx.lineWidth = 2
      ctx.stroke()
    }

    drawProjectiles(ctx, now)
    drawFx(ctx, now)

    if (locked && locked.deadUntil <= now) {
      const pulse = 0.6 + Math.sin(time * 0.014) * 0.25
      const spin = time * 0.004
      const lx = locked.x
      const ly = locked.y
      const px = posRef.current.x
      const py = posRef.current.y

      ctx.save()
      const beam = ctx.createLinearGradient(px, py, lx, ly)
      beam.addColorStop(0, `rgba(251, 191, 36, ${0.15 + pulse * 0.25})`)
      beam.addColorStop(0.5, `rgba(253, 224, 71, ${0.55 * pulse})`)
      beam.addColorStop(1, `rgba(255, 255, 255, ${0.85 * pulse})`)
      ctx.strokeStyle = beam
      ctx.lineWidth = 3.5
      ctx.shadowBlur = 12
      ctx.shadowColor = 'rgba(251, 191, 36, 0.8)'
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(lx, ly)
      ctx.stroke()
      ctx.lineWidth = 1.2
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 * pulse})`
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(lx, ly)
      ctx.stroke()
      ctx.shadowBlur = 0

      for (let i = 0; i < 3; i++) {
        const t = ((time * 0.002 + i / 3) % 1)
        const bx = px + (lx - px) * t
        const by = py + (ly - py) * t
        ctx.fillStyle = `rgba(254, 243, 199, ${0.9 - t * 0.7})`
        ctx.beginPath()
        ctx.arc(bx, by, 3.5 - t * 2, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.strokeStyle = `rgba(251, 191, 36, ${pulse})`
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(lx, ly, 26 + Math.sin(time * 0.02) * 3, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 * pulse})`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(lx, ly, 34 + Math.sin(time * 0.018 + 1) * 4, spin, spin + Math.PI * 1.4)
      ctx.stroke()

      const br = 30
      ctx.strokeStyle = `rgba(253, 224, 71, ${0.75 + pulse * 0.25})`
      ctx.lineWidth = 3
      ctx.lineCap = 'square'
      const corners: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]]
      for (const [cx, cy] of corners) {
        const ox = lx + cx * br
        const oy = ly + cy * br
        ctx.beginPath()
        ctx.moveTo(ox, oy - cy * 12)
        ctx.lineTo(ox, oy)
        ctx.lineTo(ox - cx * 12, oy)
        ctx.stroke()
      }
      ctx.restore()
    }

    const playerColor = isForgeMode ? 'transparent' : (isEditorMode ? '#f59e0b' : (isDead ? '#64748b' : player.appearance.color))

    if (!isForgeMode) {
      drawGroundShadow(
        ctx,
        posRef.current.x,
        posRef.current.y + radius * 0.62,
        radius,
        movingRef.current ? 0.18 : 0.24,
      )

      ctx.save()
      ctx.globalAlpha = isDead ? 0.35 : (stealthed ? 0.4 : 1)
      ctx.fillStyle = playerColor
      ctx.beginPath()
      ctx.arc(pX, pY, radius, 0, Math.PI * 2)
      ctx.fill()

      const pGrad = ctx.createRadialGradient(pX - radius * 0.25, pY - radius * 0.3, radius * 0.1, pX, pY, radius)
      pGrad.addColorStop(0, 'rgba(255,255,255,0.35)')
      pGrad.addColorStop(0.55, 'rgba(255,255,255,0.06)')
      pGrad.addColorStop(1, 'rgba(0,0,0,0.12)')
      ctx.fillStyle = pGrad
      ctx.beginPath()
      ctx.arc(pX, pY, radius, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = playerSafe ? 'rgba(251, 191, 36, 0.55)' : 'rgba(52, 211, 153, 0.45)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(pX, pY, radius - 1, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()

      drawFace(ctx, pX, pY, radius * 0.52, player.appearance.face)
    }

    if (!isEditorMode && !isForgeMode) {
      ctx.textAlign = 'center'
      const badgeY = pY - radius - 22
      ctx.fillStyle = 'rgba(0,0,0,0.72)'
      ctx.beginPath(); ctx.roundRect(pX - 18, badgeY - 10, 36, 18, 4); ctx.fill()
      ctx.strokeStyle = playerSafe ? '#fbbf24' : '#34d399'; ctx.lineWidth = 1.5; ctx.stroke()
      ctx.fillStyle = playerSafe ? '#fbbf24' : '#34d399'; ctx.font = '700 10px Oxanium, sans-serif'; ctx.fillText(`LV.${playerStatsRef.current.level}`, pX, badgeY + 3)

      ctx.font = '700 11px Oxanium, sans-serif'; ctx.fillStyle = 'white'
      ctx.shadowBlur = 4; ctx.shadowColor = 'black'
      ctx.fillText(player.name.toUpperCase(), pX, pY + radius + 20); ctx.shadowBlur = 0
    }

    floatsRef.current = floatsRef.current.filter((f) => now - f.born < (f.text === 'KILL!' || f.text.startsWith('CRIT') ? 1500 : 1100))
    for (const f of floatsRef.current) {
      const life = f.text === 'KILL!' || f.text.startsWith('CRIT') ? 1500 : 1100
      const age = (now - f.born) / life
      const rise = 1 - Math.pow(1 - Math.min(1, age), 2.2)
      const pop = age < 0.12 ? 0.7 + (age / 0.12) * 0.55 : f.text === 'KILL!' ? 1.35 - age * 0.25 : 1.05 - age * 0.2
      ctx.save()
      ctx.globalAlpha = Math.max(0, 1 - age * 1.05)
      ctx.translate(f.x, f.y - rise * (f.text === 'KILL!' ? 72 : 52))
      ctx.scale(pop, pop)
      ctx.fillStyle = f.color
      ctx.font = f.text === 'KILL!' ? '900 22px Oxanium, sans-serif' : '700 15px Oxanium, sans-serif'
      ctx.textAlign = 'center'
      ctx.shadowBlur = f.text === 'KILL!' ? 14 : 6
      ctx.shadowColor = f.text === 'KILL!' ? 'rgba(251, 113, 133, 0.85)' : 'rgba(0,0,0,0.55)'
      ctx.fillText(f.text, 0, 0)
      ctx.restore()
    }

    ctx.restore()
    requestRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(requestRef.current)
  }, [keys, world.lastAttack.time, world.lastSkillCast?.time, world.objects, isEditorMode, isForgeMode, player.name, player.appearance])

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth
        canvasRef.current.height = window.innerHeight
      }
    }
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 bg-[#020617] ${isEditorMode ? 'cursor-move' : isForgeMode ? 'cursor-crosshair' : 'cursor-default'}`}
      />
      {!isEditorMode && !isForgeMode && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex flex-col items-center gap-2 font-sans">
          <div
            className={`rpg-panel rounded-full px-4 py-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors duration-500 ${
              safeBanner
                ? 'rpg-panel-gold text-amber-100'
                : 'border-emerald-400/25 text-emerald-100'
            }`}
          >
            {safeBanner ? '★ Star Town — Safe Zone' : 'Whisperwood Park'}
          </div>
          {hint ? (
            <div className="rpg-panel animate-soft-bob rounded-xl border-amber-300/25 px-4 py-1.5 text-xs font-semibold tracking-wide text-amber-50 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
              {hint}
            </div>
          ) : null}
        </div>
      )}
      {panel && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-end justify-center bg-black/25 pb-24 font-sans backdrop-blur-[2px] sm:items-center sm:pb-0">
          <div className="rpg-panel rpg-panel-gold mx-4 w-full max-w-md rounded-2xl p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/80">Star Town</p>
            <h3 className="mt-1 font-display text-2xl font-bold tracking-tight text-amber-50">{panel.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/75">{panel.body}</p>
            {panel.cost != null && panel.cost > 0 && (
              <p className="mt-2 font-mono text-sm font-semibold tabular-nums text-amber-200">Cost: {panel.cost} G</p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => void runInteract()}
                className="flex-1 rounded-xl bg-amber-400 px-4 py-2.5 font-display text-sm font-bold text-stone-900 transition hover:bg-amber-300 active:scale-[0.98]"
              >
                {panel.kind === 'talk' || panel.kind === 'golf' ? 'OK (E)' : 'Confirm (E)'}
              </button>
              <button
                type="button"
                onClick={() => setPanel(null)}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {deathScreen && (
        <div
          className="pointer-events-auto absolute inset-0 z-40 flex cursor-pointer items-center justify-center font-sans"
          onClick={() => doRespawn()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') doRespawn()
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(127,29,29,0.55)_0%,rgba(2,6,23,0.92)_70%)]" />
          <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.45)_100%)]" />
          <div className="relative mx-4 max-w-lg text-center">
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.35em] text-red-300/80">
              Whisperwood claims another
            </p>
            <h2
              className="mt-3 font-display text-6xl font-black tracking-tight text-red-50 sm:text-7xl"
              style={{
                textShadow:
                  '0 0 28px rgba(239,68,68,0.85), 0 0 60px rgba(185,28,28,0.55), 0 4px 0 #7f1d1d',
              }}
            >
              YOU DIED
            </h2>
            <div className="mx-auto mt-5 h-px w-48 bg-gradient-to-r from-transparent via-red-400/80 to-transparent" />
            <p className="mt-5 text-sm font-semibold tracking-wide text-amber-100/90 sm:text-base">
              Click to respawn at closest town
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/45">
              Space · Enter · E
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                doRespawn()
              }}
              className="mt-8 rounded-full border border-amber-300/40 bg-amber-400/15 px-8 py-3 font-display text-sm font-bold uppercase tracking-[0.18em] text-amber-100 shadow-[0_0_40px_rgba(251,191,36,0.25)] transition hover:bg-amber-400/30 hover:shadow-[0_0_50px_rgba(251,191,36,0.4)] active:scale-[0.98]"
            >
              Respawn
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function zoneLabelOffset(obj: { radius: number; params?: { h?: string | number } }) {
  const h = Number(obj.params?.h)
  return Number.isFinite(h) ? h / 2 : obj.radius
}

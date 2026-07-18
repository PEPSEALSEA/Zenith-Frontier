'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { gasService } from '@/services/gasService'
import { sfx } from '@/lib/sfx'
import {
  drawBuilding,
  drawCuteCritter,
  drawForestDecor,
  drawGolfGreen,
  drawStarTownFloor,
  ensureStarTownObjects,
  findNearbyInteractable,
  interactKindOf,
  interactPrompt,
  isInSafeZone,
  STAR_TOWN_SPAWN,
} from '@/lib/starTown'
import { parseAttackProfile, DEFAULT_ATTACK } from '@/lib/classSystem'

const WORLD_SIZE = 2000
const CONTACT_RANGE = 36
const CHASE_RANGE = 220
const RESPAWN_MS = 4000

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
  color: string
  face: string
  drops: string[]
  deadUntil: number
  flashUntil: number
  homeX: number
  homeY: number
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
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()

  switch (face) {
    case 'ghost':
      ctx.arc(x, y - r * 0.2, r * 0.7, Math.PI, 0)
      ctx.lineTo(x + r * 0.7, y + r * 0.7)
      ctx.lineTo(x + r * 0.4, y + r * 0.4)
      ctx.lineTo(x + r * 0.1, y + r * 0.7)
      ctx.lineTo(x - r * 0.2, y + r * 0.4)
      ctx.lineTo(x - r * 0.5, y + r * 0.7)
      ctx.closePath()
      break
    case 'skull':
      ctx.arc(x, y - r * 0.3, r * 0.7, Math.PI * 0.8, Math.PI * 2.2)
      ctx.lineTo(x + r * 0.4, y + r * 0.8)
      ctx.lineTo(x - r * 0.4, y + r * 0.8)
      ctx.closePath()
      break
    case 'star':
      for (let i = 0; i < 5; i++) {
        const a = (i * 2 * Math.PI) / 5 - Math.PI / 2
        const b = a + Math.PI / 5
        const x1 = x + Math.cos(a) * r * 0.85
        const y1 = y + Math.sin(a) * r * 0.85
        const x2 = x + Math.cos(b) * r * 0.4
        const y2 = y + Math.sin(b) * r * 0.4
        if (i === 0) ctx.moveTo(x1, y1)
        else ctx.lineTo(x1, y1)
        ctx.lineTo(x2, y2)
      }
      ctx.closePath()
      break
    default:
      ctx.arc(x, y, r * 0.8, 0, Math.PI * 2)
      break
  }
  ctx.stroke()
}

function dist(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx
  const dy = ay - by
  return Math.sqrt(dx * dx + dy * dy)
}

export default function GameScene2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const {
    player, updatePosition, world, updateWorldCycle, attack, castSkillSlot, isEditorMode, isForgeMode,
    forgeSelection, addWorldObject, takeDamage, healFull, applyKillRewards, syncHpToServer,
    buyItem, spendMoney, setWorldObjects,
  } = useGameStore()
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({})
  const [panel, setPanel] = useState<PanelState>(null)
  const [hint, setHint] = useState('')
  const [safeBanner, setSafeBanner] = useState(true)
  const requestRef = useRef<number>(0)
  const posRef = useRef({ x: player.position.x, y: player.position.y })
  const lastTimeRef = useRef<number>(0)
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

  useEffect(() => {
    playerStatsRef.current = player.stats
    profileRef.current = parseAttackProfile(player.jobs.main?.attack_profile)
  }, [player.stats])

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
      cur.every((o, i) => o.id === merged[i]?.id && o.name === merged[i]?.name && o.type === merged[i]?.type)
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

      const cuteFallback: Record<string, { name: string; hp: number; atk: number; def: number; spd: number; drops: string[]; appearance: { color: string; face: string } }> = {
        MON_003: {
          name: 'Fluff Rabbit',
          hp: 28,
          atk: 4,
          def: 1,
          spd: 14,
          drops: ['EQ_004'],
          appearance: { color: '#fda4af', face: 'bunny' },
        },
        MON_004: {
          name: 'Sleepy Sloth',
          hp: 55,
          atk: 7,
          def: 3,
          spd: 4,
          drops: ['EQ_004'],
          appearance: { color: '#a8a29e', face: 'sloth' },
        },
      }

      const fromMap: LivingMonster[] = objects
        .filter((o) => o.type === 'monster' || o.type === 'boss')
        .map((o) => {
          const tid = String(o.params?.entity_id || o.params?.monster_id || 'MON_003')
          const t = byId[tid] || cuteFallback[tid]
          const hp = t?.hp || 30
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
            atk: t?.atk || 5,
            def: t?.def || 1,
            spd: t?.spd || 8,
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
          const ox = tid === 'MON_003' ? 700 : 820
          const oy = tid === 'MON_003' ? 260 : 300
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
      if (!isEditorMode && !isForgeMode) {
        const slotMap: Record<string, 1 | 2 | 3 | 4> = {
          Digit1: 1, Digit2: 2, Digit3: 3, Digit4: 4,
          Numpad1: 1, Numpad2: 2, Numpad3: 3, Numpad4: 4,
        }
        const slot = slotMap[e.code]
        if (slot) {
          if (isInSafeZone(posRef.current.x, posRef.current.y, world.objects)) return
          if (deadUntilRef.current > Date.now()) return
          castSkillSlot(slot)
        }
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys((prev) => ({ ...prev, [e.code]: false }))
      if (e.code === 'KeyE') eLatch.current = false
    }
    const handleMouseDown = (e: MouseEvent) => {
      if (isForgeMode && forgeSelection) {
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        const camX = posRef.current.x - canvas.width / 2
        const camY = posRef.current.y - canvas.height / 2
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
      const profile = profileRef.current
      const now = Date.now()
      if (e.button === 0) {
        if (now - lastBasicAtkAt.current < profile.light_cd) return
        lastBasicAtkAt.current = now
        attack('light')
      }
      if (e.button === 2) {
        if (now - lastBasicAtkAt.current < profile.hard_cd) return
        if (profile.mp_cost_hard > 0) {
          const mp = useGameStore.getState().player.stats.mp
          if (mp < profile.mp_cost_hard) return
          useGameStore.setState((s) => ({
            player: {
              ...s.player,
              stats: { ...s.player.stats, mp: s.player.stats.mp - profile.mp_cost_hard },
            },
          }))
        }
        lastBasicAtkAt.current = now
        attack('hard')
      }
    }
    const handleContextMenu = (e: MouseEvent) => e.preventDefault()

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('contextmenu', handleContextMenu)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [attack, castSkillSlot, isEditorMode, isForgeMode, forgeSelection, addWorldObject, runInteract, world.objects])

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
    const baseSpeed = isForgeMode ? 15 : (isEditorMode ? playerStatsRef.current.spd * 1.5 : playerStatsRef.current.spd * 0.6)
    if (!isDead && !panelRef.current) {
      if (keys['KeyW'] || keys['ArrowUp']) dy -= baseSpeed
      if (keys['KeyS'] || keys['ArrowDown']) dy += baseSpeed
      if (keys['KeyA'] || keys['ArrowLeft']) dx -= baseSpeed
      if (keys['KeyD'] || keys['ArrowRight']) dx += baseSpeed
    }

    if (dx !== 0 && dy !== 0) {
      const factor = 1 / Math.sqrt(2); dx *= factor; dy *= factor
    }

    posRef.current.x = Math.max(0, Math.min(WORLD_SIZE, posRef.current.x + dx * deltaTime))
    posRef.current.y = Math.max(0, Math.min(WORLD_SIZE, posRef.current.y + dy * deltaTime))

    const playerSafe = isInSafeZone(posRef.current.x, posRef.current.y, objects)

    if (time % 50 < 16) {
      updatePosition(posRef.current.x, posRef.current.y)
      if (!isEditorMode) updateWorldCycle(0.0005 * deltaTime)
      const near = findNearbyInteractable(posRef.current.x, posRef.current.y, objects)
      const nextHint =
        near && !panelRef.current
          ? `Press E — ${near.name}`
          : playerSafe
            ? 'Star Town · Safe Zone'
            : 'Whisperwood Forest'
      if (nextHint !== hintRef.current) {
        hintRef.current = nextHint
        setHint(nextHint)
      }
      if (playerSafe !== safeRef.current) {
        safeRef.current = playerSafe
        setSafeBanner(playerSafe)
      }
    }

    const lastAtk = world.lastAttack
    const profile = profileRef.current
    const atkCd = lastAtk.type === 'hard' ? profile.hard_cd : profile.light_cd
    if (
      !isEditorMode && !isForgeMode && !isDead && !playerSafe &&
      lastAtk.time && lastAtk.time !== lastAttackHandled.current &&
      now - lastAtk.time < atkCd + 50
    ) {
      lastAttackHandled.current = lastAtk.time
      const range = lastAtk.type === 'hard' ? profile.hard_range : profile.light_range
      const mult = lastAtk.type === 'hard' ? profile.hard_mult : profile.light_mult
      const hits = Math.max(1, profile.hits || 1)
      for (const m of monstersRef.current) {
        if (m.deadUntil > now) continue
        if (dist(posRef.current.x, posRef.current.y, m.x, m.y) > range) continue
        for (let h = 0; h < hits; h++) {
          const dmg = Math.max(1, Math.floor(playerStatsRef.current.atk * mult - m.def * 0.5))
          m.hp -= dmg
          m.flashUntil = now + 120
          pushFloat(m.x, m.y - 20 - h * 12, `-${dmg}`, '#fbbf24')
        }
        sfx.hit()
        if (m.hp <= 0) {
          m.hp = 0
          m.deadUntil = now + RESPAWN_MS
          const expGain = Math.max(10, Math.floor(m.maxHp / 3))
          const moneyGain = Math.max(4, Math.floor(m.atk * 2 + 6))
          const dropItems = m.drops.filter((d) => d.startsWith('EQ_') || d.startsWith('ITEM_'))
          pushFloat(m.x, m.y - 40, `+${expGain} EXP`, '#34d399')
          pushFloat(m.x, m.y - 55, `+${moneyGain} G`, '#fbbf24')
          sfx.kill()
          void applyKillRewards({ exp: expGain, money: moneyGain, items: dropItems.slice(0, 1) })
        }
      }
    }

    const lastSkill = world.lastSkillCast
    if (
      !isEditorMode && !isForgeMode && !isDead && !playerSafe &&
      lastSkill && lastSkill.time !== lastSkillHandled.current &&
      now - lastSkill.time < 400
    ) {
      lastSkillHandled.current = lastSkill.time
      const skill = useGameStore.getState().player.skillCatalog.find((s) => s.skill_id === lastSkill.skillId)
      if (skill) {
        if (skill.skill_type === 'heal') {
          const healAmt = Math.floor(skill.power)
          useGameStore.setState((s) => ({
            player: {
              ...s.player,
              stats: {
                ...s.player.stats,
                hp: Math.min(s.player.stats.maxHp, s.player.stats.hp + healAmt),
                mp: skill.effect === 'mp_heal'
                  ? Math.min(s.player.stats.maxMp, s.player.stats.mp + healAmt)
                  : s.player.stats.mp,
              },
            },
          }))
          pushFloat(posRef.current.x, posRef.current.y - 40, `+${healAmt}`, '#34d399')
          sfx.levelUp()
        } else if (skill.skill_type === 'dash') {
          const facing = 1
          posRef.current.x = Math.max(0, Math.min(WORLD_SIZE, posRef.current.x + facing * (skill.range || 90)))
          pushFloat(posRef.current.x, posRef.current.y - 30, 'DASH', '#a78bfa')
        } else if (skill.skill_type === 'buff') {
          pushFloat(posRef.current.x, posRef.current.y - 40, skill.effect.toUpperCase() || 'BUFF', '#60a5fa')
        } else {
          const aoe = skill.effect.includes('aoe')
          const multi = /hits:(\d+)/.exec(skill.effect)
          const hitCount = multi ? parseInt(multi[1]) : 1
          for (const m of monstersRef.current) {
            if (m.deadUntil > now) continue
            const d = dist(posRef.current.x, posRef.current.y, m.x, m.y)
            if (d > skill.range) continue
            if (!aoe && d > skill.range) continue
            for (let h = 0; h < hitCount; h++) {
              const dmg = Math.max(1, Math.floor(playerStatsRef.current.atk * skill.power - m.def * 0.4))
              m.hp -= dmg
              m.flashUntil = now + 140
              pushFloat(m.x, m.y - 20 - h * 12, `-${dmg}`, '#c084fc')
            }
            sfx.hit()
            if (m.hp <= 0) {
              m.hp = 0
              m.deadUntil = now + RESPAWN_MS
              const expGain = Math.max(10, Math.floor(m.maxHp / 3))
              const moneyGain = Math.max(4, Math.floor(m.atk * 2 + 6))
              const dropItems = m.drops.filter((d) => d.startsWith('EQ_') || d.startsWith('ITEM_'))
              pushFloat(m.x, m.y - 40, `+${expGain} EXP`, '#34d399')
              sfx.kill()
              void applyKillRewards({ exp: expGain, money: moneyGain, items: dropItems.slice(0, 1) })
            }
          }
        }
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

        const d = dist(posRef.current.x, posRef.current.y, m.x, m.y)
        if (!playerSafe && d < CHASE_RANGE && d > 4) {
          const speed = (m.spd * 0.35) * deltaTime
          const nx = m.x + ((posRef.current.x - m.x) / d) * speed
          const ny = m.y + ((posRef.current.y - m.y) / d) * speed
          if (!isInSafeZone(nx, ny, objects)) {
            m.x = nx
            m.y = ny
          }
        }
        if (!playerSafe && d < CONTACT_RANGE && now - lastContactHit.current > 700) {
          lastContactHit.current = now
          const dmg = Math.max(1, m.atk - Math.floor(playerStatsRef.current.def * 0.3))
          takeDamage(dmg)
          pushFloat(posRef.current.x, posRef.current.y - 30, `-${dmg}`, '#f87171')
          sfx.hit()
          const hpLeft = useGameStore.getState().player.stats.hp
          if (hpLeft <= 0) {
            deadUntilRef.current = now + 1600
            sfx.death()
            const spawn = findRespawn()
            setTimeout(() => {
              posRef.current = { ...spawn }
              healFull()
              void syncHpToServer()
              pushFloat(spawn.x, spawn.y - 40, 'RESPAWN', '#60a5fa')
            }, 800)
          } else {
            void syncHpToServer()
          }
        }
      }
    }

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    const camX = posRef.current.x - width / 2
    const camY = posRef.current.y - height / 2

    ctx.save()
    ctx.translate(-camX, -camY)

    const gradientBg = ctx.createRadialGradient(posRef.current.x, posRef.current.y, 40, posRef.current.x, posRef.current.y, 900)
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

    ctx.strokeStyle = isEditorMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 41, 59, 0.18)'
    ctx.lineWidth = 1
    for (let x = 0; x <= WORLD_SIZE; x += 100) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_SIZE); ctx.stroke()
    }
    for (let y = 0; y <= WORLD_SIZE; y += 100) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_SIZE, y); ctx.stroke()
    }

    drawForestDecor(ctx, camX, camY, width, height)

    for (const obj of objects) {
      if (obj.type === 'town' || obj.type === 'safezone') {
        drawStarTownFloor(ctx, obj)
      }
      if (obj.type === 'forest') {
        ctx.fillStyle = 'rgba(22, 101, 52, 0.12)'
        ctx.beginPath()
        ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    for (const obj of objects) {
      if (obj.type === 'monster' || obj.type === 'boss') continue
      if (obj.type === 'town' || obj.type === 'safezone' || obj.type === 'forest' || obj.type === 'spawner') {
        if (obj.type === 'spawner') {
          ctx.save()
          ctx.translate(obj.x, obj.y)
          ctx.strokeStyle = '#64748b88'
          ctx.strokeRect(-12, -12, 24, 24)
          ctx.restore()
        }
        ctx.fillStyle = 'rgba(255,255,255,0.75)'
        ctx.font = '600 12px Oxanium, sans-serif'
        ctx.textAlign = 'center'
        if (obj.type === 'town') {
          ctx.fillStyle = '#fde68a'
          ctx.font = '700 18px Oxanium, sans-serif'
          ctx.fillText(obj.name, obj.x, obj.y - zoneLabelOffset(obj) - 16)
        }
        continue
      }

      ctx.save()
      ctx.translate(obj.x, obj.y)
      const color = String(obj.params?.color || getObjectColor(obj.type))
      if (obj.type === 'landmark' && String(obj.params?.kind || '') === 'golf') {
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
      } else {
        drawBuilding(ctx, obj.type === 'landmark' ? 'landmark' : obj.type, color, 26)
      }
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.font = '600 10px Outfit, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(obj.name, 0, -36)
      ctx.restore()
    }

    for (const m of monstersRef.current) {
      if (m.deadUntil > now) continue
      ctx.save()
      ctx.translate(m.x, m.y)
      if (m.flashUntil > now) ctx.globalAlpha = 0.5
      ctx.shadowBlur = 10
      ctx.shadowColor = m.color
      drawCuteCritter(ctx, m.face, m.color, 16)
      ctx.shadowBlur = 0
      const barW = 36
      const pct = Math.max(0, m.hp / m.maxHp)
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.fillRect(-barW / 2, -30, barW, 5)
      ctx.fillStyle = pct > 0.35 ? '#86efac' : '#fb7185'
      ctx.fillRect(-barW / 2, -30, barW * pct, 5)
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.font = '600 9px Outfit, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(m.name, 0, -36)
      ctx.restore()
    }

    const pX = posRef.current.x
    const pY = posRef.current.y
    const radius = isEditorMode ? 40 : 32

    if (isEditorMode) {
      ctx.beginPath()
      ctx.arc(pX, pY, radius + 10, 0, Math.PI * 2)
      ctx.strokeStyle = '#f59e0b'
      ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([])
    }

    const attackAge = Date.now() - world.lastAttack.time
    if (attackAge < 350 && !playerSafe) {
      const progress = attackAge / 350
      const ringRadius = (world.lastAttack.type === 'hard' ? profileRef.current.hard_range : profileRef.current.light_range) * (0.35 + progress * 0.65)
      ctx.beginPath()
      ctx.arc(pX, pY, ringRadius, 0, Math.PI * 2)
      ctx.strokeStyle = world.lastAttack.type === 'hard' ? `rgba(239, 68, 68, ${1 - progress})` : `rgba(255, 255, 255, ${1 - progress})`
      ctx.lineWidth = 3 * (1 - progress); ctx.stroke()
    }
    if (world.lastSkillCast && Date.now() - world.lastSkillCast.time < 400 && !playerSafe) {
      const progress = (Date.now() - world.lastSkillCast.time) / 400
      ctx.beginPath()
      ctx.arc(pX, pY, 40 + progress * 80, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(192, 132, 252, ${1 - progress})`
      ctx.lineWidth = 4
      ctx.stroke()
    }

    ctx.shadowBlur = 30
    const playerColor = isForgeMode ? 'transparent' : (isEditorMode ? '#f59e0b' : (isDead ? '#64748b' : player.appearance.color))
    ctx.shadowColor = playerColor
    ctx.fillStyle = playerColor

    if (!isForgeMode) {
      ctx.globalAlpha = isDead ? 0.35 : 1
      ctx.beginPath(); ctx.arc(pX, pY, radius, 0, Math.PI * 2); ctx.fill()

      const pGrad = ctx.createRadialGradient(pX, pY, 0, pX, pY, radius)
      pGrad.addColorStop(0, 'rgba(255,255,255,0.4)'); pGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = pGrad; ctx.fill()
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1

      drawFace(ctx, pX, pY, radius * 0.5, player.appearance.face)
    }

    if (!isEditorMode && !isForgeMode) {
      ctx.textAlign = 'center'
      const badgeY = pY - radius - 25
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.beginPath(); ctx.roundRect(pX - 18, badgeY - 10, 36, 18, 4); ctx.fill()
      ctx.strokeStyle = playerSafe ? '#fbbf24' : '#10b981'; ctx.lineWidth = 1.5; ctx.stroke()
      ctx.fillStyle = playerSafe ? '#fbbf24' : '#10b981'; ctx.font = '700 10px Oxanium, sans-serif'; ctx.fillText(`LV.${playerStatsRef.current.level}`, pX, badgeY + 3)

      ctx.font = '700 11px Oxanium, sans-serif'; ctx.fillStyle = 'white'
      ctx.shadowBlur = 4; ctx.shadowColor = 'black'
      ctx.fillText(player.name.toUpperCase(), pX, pY + radius + 22); ctx.shadowBlur = 0
    }

    floatsRef.current = floatsRef.current.filter((f) => now - f.born < 900)
    for (const f of floatsRef.current) {
      const age = (now - f.born) / 900
      ctx.globalAlpha = 1 - age
      ctx.fillStyle = f.color
      ctx.font = '700 14px Oxanium, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(f.text, f.x, f.y - age * 40)
      ctx.globalAlpha = 1
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
        className={`absolute inset-0 bg-[#020617] ${isEditorMode ? 'cursor-move' : 'cursor-crosshair'}`}
      />
      {!isEditorMode && !isForgeMode && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex flex-col items-center gap-2 font-sans">
          <div
            className={`rounded-full border px-4 py-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.16em] shadow-lg backdrop-blur-md ${
              safeBanner
                ? 'border-amber-300/40 bg-amber-500/15 text-amber-100'
                : 'border-emerald-400/30 bg-emerald-900/40 text-emerald-100'
            }`}
          >
            {safeBanner ? '★ Star Town — Safe Zone' : 'Whisperwood Forest'}
          </div>
          {hint && (
            <div className="rounded-lg border border-white/10 bg-black/55 px-3.5 py-1.5 text-xs font-medium tracking-wide text-white/85 backdrop-blur-sm">
              {hint}
            </div>
          )}
        </div>
      )}
      {panel && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-end justify-center pb-24 font-sans sm:items-center sm:pb-0">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-amber-200/20 bg-[#1a1520]/95 p-5 shadow-2xl backdrop-blur-xl">
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
                className="flex-1 rounded-xl bg-amber-400 px-4 py-2.5 font-display text-sm font-bold text-stone-900 hover:bg-amber-300"
              >
                {panel.kind === 'talk' || panel.kind === 'golf' ? 'OK (E)' : 'Confirm (E)'}
              </button>
              <button
                type="button"
                onClick={() => setPanel(null)}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5"
              >
                Close
              </button>
            </div>
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

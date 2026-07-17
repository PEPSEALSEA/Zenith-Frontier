'use client'

import React, { useRef, useEffect, useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { gasService } from '@/services/gasService'
import { sfx } from '@/lib/sfx'

const WORLD_SIZE = 2000
const ATTACK_COOLDOWN_MS = 280
const LIGHT_RANGE = 70
const HARD_RANGE = 95
const CONTACT_RANGE = 36
const CHASE_RANGE = 220
const RESPAWN_MS = 4000
const SPAWN_X = 400
const SPAWN_Y = 300

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

const getObjectColor = (type: string) => {
    switch (type) {
        case 'monster': return '#ef4444'
        case 'boss': return '#9333ea'
        case 'npc': return '#f59e0b'
        case 'market': return '#10b981'
        case 'town': return '#22c55e'
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
        player, updatePosition, world, updateWorldCycle, attack, isEditorMode, isForgeMode,
        forgeSelection, addWorldObject, takeDamage, healFull, applyKillRewards, syncHpToServer,
    } = useGameStore()
    const [keys, setKeys] = useState<{ [key: string]: boolean }>({})
    const requestRef = useRef<number>(0)
    const posRef = useRef({ x: player.position.x, y: player.position.y })
    const lastTimeRef = useRef<number>(0)
    const monstersRef = useRef<LivingMonster[]>([])
    const floatsRef = useRef<FloatText[]>([])
    const lastAttackHandled = useRef(0)
    const lastContactHit = useRef(0)
    const deadUntilRef = useRef(0)
    const templatesReady = useRef(false)
    const floatId = useRef(0)
    const playerStatsRef = useRef(player.stats)

    useEffect(() => {
        playerStatsRef.current = player.stats
    }, [player.stats])

    useEffect(() => {
        posRef.current = { x: player.position.x, y: player.position.y }
    }, [player.position.x, player.position.y])

    useEffect(() => {
        if (isEditorMode || isForgeMode) return
        let cancelled = false
        ;(async () => {
            const templates = await gasService.getAllMonsters()
            if (cancelled) return
            const byId = Object.fromEntries(templates.map((t) => [t.monster_id, t]))

            const fromMap: LivingMonster[] = world.objects
                .filter((o) => o.type === 'monster' || o.type === 'boss')
                .map((o) => {
                    const tid = String(o.params?.entity_id || o.params?.monster_id || 'MON_001')
                    const t = byId[tid]
                    const hp = t?.hp || 40
                    return {
                        id: o.id,
                        templateId: tid,
                        name: t?.name || o.name || 'Monster',
                        x: o.x,
                        y: o.y,
                        homeX: o.x,
                        homeY: o.y,
                        hp,
                        maxHp: hp,
                        atk: t?.atk || 8,
                        def: t?.def || 2,
                        spd: t?.spd || 8,
                        color: t?.appearance?.color || '#ef4444',
                        face: t?.appearance?.face || 'skull',
                        drops: t?.drops || ['EQ_004'],
                        deadUntil: 0,
                        flashUntil: 0,
                    }
                })

            if (fromMap.length === 0) {
                const t = byId['MON_001'] || {
                    monster_id: 'MON_001',
                    name: 'Slime',
                    hp: 40,
                    atk: 6,
                    def: 1,
                    spd: 6,
                    drops: ['EQ_004'],
                    appearance: { color: '#22c55e', face: 'ghost' },
                }
                fromMap.push({
                    id: 'runtime_slime_1',
                    templateId: 'MON_001',
                    name: t.name,
                    x: SPAWN_X + 120,
                    y: SPAWN_Y + 40,
                    homeX: SPAWN_X + 120,
                    homeY: SPAWN_Y + 40,
                    hp: t.hp,
                    maxHp: t.hp,
                    atk: t.atk,
                    def: t.def,
                    spd: t.spd,
                    color: t.appearance?.color || '#22c55e',
                    face: t.appearance?.face || 'ghost',
                    drops: t.drops?.length ? t.drops : ['EQ_004'],
                    deadUntil: 0,
                    flashUntil: 0,
                })
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
        return safe ? { x: safe.x, y: safe.y } : { x: SPAWN_X, y: SPAWN_Y }
    }

    // Input
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => setKeys(prev => ({ ...prev, [e.code]: true }))
        const handleKeyUp = (e: KeyboardEvent) => setKeys(prev => ({ ...prev, [e.code]: false }))
        const handleMouseDown = (e: MouseEvent) => {
            if (isForgeMode && forgeSelection) {
                const canvas = canvasRef.current
                if (!canvas) return
                const rect = canvas.getBoundingClientRect()
                const mouseX = e.clientX - rect.left
                const mouseY = e.clientY - rect.top
                const camX = posRef.current.x - canvas.width / 2
                const camY = posRef.current.y - canvas.height / 2
                addWorldObject({
                    id: `obj_${Date.now()}`,
                    type: forgeSelection.type,
                    x: mouseX + camX,
                    y: mouseY + camY,
                    name: forgeSelection.name || `New ${forgeSelection.type}`,
                    radius: (forgeSelection.type === 'town' || forgeSelection.type === 'safezone') ? 200 : 30,
                    params: forgeSelection.id ? { entity_id: forgeSelection.id } : {}
                })
                return
            }
            if (isEditorMode) return
            if (deadUntilRef.current > Date.now()) return
            if (e.button === 0) attack('light')
            if (e.button === 2) attack('hard')
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
    }, [attack, isEditorMode, isForgeMode, forgeSelection, addWorldObject])

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

        // --- MOVEMENT ---
        let dx = 0
        let dy = 0
        const baseSpeed = isForgeMode ? 15 : (isEditorMode ? playerStatsRef.current.spd * 1.5 : playerStatsRef.current.spd * 0.6)
        if (!isDead) {
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

        if (time % 50 < 16) {
            updatePosition(posRef.current.x, posRef.current.y)
            if (!isEditorMode) updateWorldCycle(0.0005 * deltaTime)
        }

        // --- COMBAT: resolve new attacks ---
        const lastAtk = world.lastAttack
        if (
            !isEditorMode && !isForgeMode && !isDead &&
            lastAtk.time && lastAtk.time !== lastAttackHandled.current &&
            now - lastAtk.time < ATTACK_COOLDOWN_MS + 50
        ) {
            lastAttackHandled.current = lastAtk.time
            const range = lastAtk.type === 'hard' ? HARD_RANGE : LIGHT_RANGE
            const mult = lastAtk.type === 'hard' ? 1.6 : 1
            for (const m of monstersRef.current) {
                if (m.deadUntil > now) continue
                if (dist(posRef.current.x, posRef.current.y, m.x, m.y) > range) continue
                const dmg = Math.max(1, Math.floor(playerStatsRef.current.atk * mult - m.def * 0.5))
                m.hp -= dmg
                m.flashUntil = now + 120
                pushFloat(m.x, m.y - 20, `-${dmg}`, '#fbbf24')
                sfx.hit()
                if (m.hp <= 0) {
                    m.hp = 0
                    m.deadUntil = now + RESPAWN_MS
                    const expGain = Math.max(12, Math.floor(m.maxHp / 3))
                    const moneyGain = Math.max(5, Math.floor(m.atk * 2 + 8))
                    const dropItems = m.drops.filter((d) => d.startsWith('EQ_') || d.startsWith('ITEM_'))
                    pushFloat(m.x, m.y - 40, `+${expGain} EXP`, '#34d399')
                    pushFloat(m.x, m.y - 55, `+${moneyGain} G`, '#fbbf24')
                    sfx.kill()
                    void applyKillRewards({ exp: expGain, money: moneyGain, items: dropItems.slice(0, 1) })
                }
            }
        }

        // --- Monster AI + contact damage ---
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
                const d = dist(posRef.current.x, posRef.current.y, m.x, m.y)
                if (d < CHASE_RANGE && d > 4) {
                    const speed = (m.spd * 0.35) * deltaTime
                    m.x += ((posRef.current.x - m.x) / d) * speed
                    m.y += ((posRef.current.y - m.y) / d) * speed
                }
                if (d < CONTACT_RANGE && now - lastContactHit.current > 700) {
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

        // --- RENDER ---
        const { width, height } = canvas
        ctx.clearRect(0, 0, width, height)

        const camX = posRef.current.x - width / 2
        const camY = posRef.current.y - height / 2

        ctx.save()
        ctx.translate(-camX, -camY)

        const gradientBg = ctx.createRadialGradient(posRef.current.x, posRef.current.y, 50, posRef.current.x, posRef.current.y, 1000)
        gradientBg.addColorStop(0, '#020617')
        gradientBg.addColorStop(1, '#000000')
        ctx.fillStyle = gradientBg
        ctx.fillRect(camX, camY, width, height)

        ctx.strokeStyle = isEditorMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 41, 59, 0.2)'
        ctx.lineWidth = 1
        for (let x = 0; x <= WORLD_SIZE; x += 100) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_SIZE); ctx.stroke()
        }
        for (let y = 0; y <= WORLD_SIZE; y += 100) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_SIZE, y); ctx.stroke()
        }

        world.objects.forEach(obj => {
            if (obj.type === 'monster' || obj.type === 'boss') return
            ctx.save()
            ctx.translate(obj.x, obj.y)

            if (obj.type === 'town' || obj.type === 'safezone' || obj.type === 'spawner') {
                ctx.fillStyle = obj.type === 'town' ? 'rgba(34, 197, 94, 0.08)' : obj.type === 'spawner' ? 'rgba(100, 116, 139, 0.08)' : 'rgba(59, 130, 246, 0.08)'
                ctx.beginPath(); ctx.arc(0, 0, obj.radius, 0, Math.PI * 2); ctx.fill()
                ctx.strokeStyle = obj.type === 'town' ? '#22c55e44' : obj.type === 'spawner' ? '#64748b88' : '#3b82f644'
                ctx.setLineDash([10, 10]); ctx.stroke(); ctx.setLineDash([])
            }

            ctx.shadowBlur = 10
            ctx.shadowColor = getObjectColor(obj.type)
            ctx.fillStyle = getObjectColor(obj.type)

            if (obj.type === 'npc' || obj.type === 'market') {
                ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill()
            } else if (obj.type === 'spawner') {
                ctx.strokeRect(-12, -12, 24, 24)
            }

            ctx.shadowBlur = 0
            ctx.fillStyle = 'rgba(255,255,255,0.7)'
            ctx.font = 'black 10px Inter'
            ctx.textAlign = 'center'
            ctx.fillText(obj.name.toUpperCase(), 0, -obj.radius - 12)
            ctx.restore()
        })

        // Living monsters
        for (const m of monstersRef.current) {
            if (m.deadUntil > now) continue
            ctx.save()
            ctx.translate(m.x, m.y)
            if (m.flashUntil > now) ctx.globalAlpha = 0.5
            ctx.shadowBlur = 12
            ctx.shadowColor = m.color
            ctx.fillStyle = m.color
            ctx.beginPath()
            ctx.moveTo(-10, -10)
            ctx.lineTo(10, -10)
            ctx.lineTo(0, 14)
            ctx.closePath()
            ctx.fill()
            ctx.shadowBlur = 0
            // HP bar
            const barW = 36
            const pct = Math.max(0, m.hp / m.maxHp)
            ctx.fillStyle = 'rgba(0,0,0,0.7)'
            ctx.fillRect(-barW / 2, -28, barW, 5)
            ctx.fillStyle = pct > 0.35 ? '#22c55e' : '#ef4444'
            ctx.fillRect(-barW / 2, -28, barW * pct, 5)
            ctx.fillStyle = 'rgba(255,255,255,0.85)'
            ctx.font = 'bold 9px Inter'
            ctx.textAlign = 'center'
            ctx.fillText(m.name.toUpperCase(), 0, -34)
            ctx.restore()
        }

        // --- PLAYER ---
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
        if (attackAge < 350) {
            const progress = attackAge / 350
            const ringRadius = radius * (1 + progress * 2.5)
            ctx.beginPath()
            ctx.arc(pX, pY, ringRadius, 0, Math.PI * 2)
            ctx.strokeStyle = world.lastAttack.type === 'hard' ? `rgba(239, 68, 68, ${1 - progress})` : `rgba(255, 255, 255, ${1 - progress})`
            ctx.lineWidth = 3 * (1 - progress); ctx.stroke()
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
            ctx.strokeStyle = '#10b981'; ctx.lineWidth = 1.5; ctx.stroke()
            ctx.fillStyle = '#10b981'; ctx.font = 'black 10px Inter'; ctx.fillText(`LV.${playerStatsRef.current.level}`, pX, badgeY + 3)

            ctx.font = 'black 11px Inter'; ctx.letterSpacing = '1px'; ctx.fillStyle = 'white'
            ctx.shadowBlur = 4; ctx.shadowColor = 'black'
            ctx.fillText(player.name.toUpperCase(), pX, pY + radius + 22); ctx.shadowBlur = 0
        }

        // Floating damage / loot text
        floatsRef.current = floatsRef.current.filter((f) => now - f.born < 900)
        for (const f of floatsRef.current) {
            const age = (now - f.born) / 900
            ctx.globalAlpha = 1 - age
            ctx.fillStyle = f.color
            ctx.font = 'bold 14px Inter'
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [keys, world.lastAttack.time, world.objects, isEditorMode, isForgeMode, player.name, player.appearance])

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
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 bg-[#020617] ${isEditorMode ? 'cursor-move' : 'cursor-crosshair'}`}
        />
    )
}

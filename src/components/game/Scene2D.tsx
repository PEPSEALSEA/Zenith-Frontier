'use client'

import React, { useRef, useEffect, useState } from 'react'
import { useGameStore } from '@/store/gameStore'

const WORLD_SIZE = 2000

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
        case 'fire':
            ctx.moveTo(x, y - r)
            ctx.bezierCurveTo(x + r, y, x - r, y + r, x, y + r)
            ctx.bezierCurveTo(x + r * 0.5, y + r * 0.5, x + r * 0.5, y - r * 0.5, x, y - r)
            break
        case 'bolt':
            ctx.moveTo(x + r * 0.2, y - r)
            ctx.lineTo(x - r * 0.5, y + r * 0.1)
            ctx.lineTo(x, y + r * 0.1)
            ctx.lineTo(x - r * 0.2, y + r)
            ctx.lineTo(x + r * 0.5, y - r * 0.1)
            ctx.lineTo(x, y - r * 0.1)
            ctx.closePath()
            break
        case 'star':
            for (let i = 0; i < 5; i++) {
                const angle = (i * 0.8 - 0.5) * Math.PI
                ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r)
                const nextAngle = (i * 0.8 - 0.1) * Math.PI
                ctx.lineTo(x + Math.cos(nextAngle) * r * 0.4, y + Math.sin(nextAngle) * r * 0.4)
            }
            ctx.closePath()
            break
        case 'crown':
            ctx.moveTo(x - r, y + r * 0.5)
            ctx.lineTo(x - r, y - r * 0.3)
            ctx.lineTo(x - r * 0.5, y + r * 0.1)
            ctx.lineTo(x, y - r * 0.7)
            ctx.lineTo(x + r * 0.5, y + r * 0.1)
            ctx.lineTo(x + r, y - r * 0.3)
            ctx.lineTo(x + r, y + r * 0.5)
            ctx.closePath()
            break
        case 'swords':
            ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r)
            ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r)
            break
        case 'target':
            ctx.arc(x, y, r, 0, Math.PI * 2)
            ctx.moveTo(x, y - r * 0.5); ctx.arc(x, y, r * 0.5, 1.5 * Math.PI, 1.49 * Math.PI)
            break
        case 'shield':
            ctx.moveTo(x - r * 0.7, y - r * 0.7)
            ctx.lineTo(x + r * 0.7, y - r * 0.7)
            ctx.lineTo(x + r * 0.7, y + r * 0.2)
            ctx.quadraticCurveTo(x, y + r, x - r * 0.7, y + r * 0.2)
            ctx.closePath()
            break
        case 'heart':
            ctx.moveTo(x, y + r * 0.5)
            ctx.bezierCurveTo(x - r, y - r * 0.5, x - r * 0.5, y - r, x, y - r * 0.3)
            ctx.bezierCurveTo(x + r * 0.5, y - r, x + r, y - r * 0.5, x, y + r * 0.5)
            break
        default:
            ctx.arc(x, y, r * 0.8, 0, Math.PI * 2)
            break
    }
    ctx.stroke()
}

export default function GameScene2D() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const { player, updatePosition, world, updateWorldCycle, attack, isEditorMode } = useGameStore()
    const [keys, setKeys] = useState<{ [key: string]: boolean }>({})
    const requestRef = useRef<number>(0)
    const posRef = useRef({ x: player.position.x, y: player.position.y })
    const lastTimeRef = useRef<number>(0)

    // Input handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => setKeys(prev => ({ ...prev, [e.code]: true }))
        const handleKeyUp = (e: KeyboardEvent) => setKeys(prev => ({ ...prev, [e.code]: false }))
        const handleMouseDown = (e: MouseEvent) => {
            if (isEditorMode) return // Prevent attacks in editor
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
    }, [attack, isEditorMode])

    const animate = (time: number) => {
        if (!lastTimeRef.current) lastTimeRef.current = time
        const deltaTime = Math.min(64, time - lastTimeRef.current) / 16.66
        lastTimeRef.current = time

        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // --- MOVEMENT ---
        let dx = 0
        let dy = 0
        const baseSpeed = isEditorMode ? player.stats.spd * 1.5 : player.stats.spd * 0.6 // Faster in editor
        if (keys['KeyW'] || keys['ArrowUp']) dy -= baseSpeed
        if (keys['KeyS'] || keys['ArrowDown']) dy += baseSpeed
        if (keys['KeyA'] || keys['ArrowLeft']) dx -= baseSpeed
        if (keys['KeyD'] || keys['ArrowRight']) dx += baseSpeed

        if (dx !== 0 && dy !== 0) {
            const factor = 1 / Math.sqrt(2); dx *= factor; dy *= factor
        }

        posRef.current.x = Math.max(0, Math.min(WORLD_SIZE, posRef.current.x + dx * deltaTime))
        posRef.current.y = Math.max(0, Math.min(WORLD_SIZE, posRef.current.y + dy * deltaTime))

        if (time % 50 < 16) {
            updatePosition(posRef.current.x, posRef.current.y)
            if (!isEditorMode) updateWorldCycle(0.0005 * deltaTime)
        }

        // --- RENDER ---
        const { width, height } = canvas
        ctx.clearRect(0, 0, width, height)

        const camX = posRef.current.x - width / 2
        const camY = posRef.current.y - height / 2

        ctx.save()
        ctx.translate(-camX, -camY)

        // Draw Ambient Floor
        const gradientBg = ctx.createRadialGradient(posRef.current.x, posRef.current.y, 50, posRef.current.x, posRef.current.y, 1000)
        gradientBg.addColorStop(0, '#020617')
        gradientBg.addColorStop(1, '#000000')
        ctx.fillStyle = gradientBg
        ctx.fillRect(camX, camY, width, height)

        // Grid
        ctx.strokeStyle = isEditorMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 41, 59, 0.2)'
        ctx.lineWidth = 1
        for (let x = 0; x <= WORLD_SIZE; x += 100) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_SIZE); ctx.stroke()
        }
        for (let y = 0; y <= WORLD_SIZE; y += 100) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_SIZE, y); ctx.stroke()
        }

        // World Objects
        world.objects.forEach(obj => {
            ctx.save()
            ctx.translate(obj.x, obj.y)

            if (obj.type === 'town' || obj.type === 'safezone') {
                ctx.fillStyle = obj.type === 'town' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(59, 130, 246, 0.08)'
                ctx.beginPath(); ctx.arc(0, 0, obj.radius, 0, Math.PI * 2); ctx.fill()
                ctx.strokeStyle = obj.type === 'town' ? '#22c55e44' : '#3b82f644'
                ctx.setLineDash([10, 10]); ctx.stroke(); ctx.setLineDash([])
            }

            ctx.shadowBlur = 10
            ctx.shadowColor = getObjectColor(obj.type)
            ctx.fillStyle = getObjectColor(obj.type)

            if (obj.type === 'monster' || obj.type === 'boss') {
                ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(8, -8); ctx.lineTo(0, 12); ctx.closePath(); ctx.fill()
            } else if (obj.type === 'npc' || obj.type === 'market') {
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

        // --- PLAYER ---
        const pX = posRef.current.x
        const pY = posRef.current.y
        const radius = isEditorMode ? 40 : 32

        // Editor Cursor Ring
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
        ctx.shadowColor = isEditorMode ? '#f59e0b' : player.appearance.color
        ctx.fillStyle = isEditorMode ? '#f59e0b' : player.appearance.color
        ctx.beginPath(); ctx.arc(pX, pY, radius, 0, Math.PI * 2); ctx.fill()

        const pGrad = ctx.createRadialGradient(pX, pY, 0, pX, pY, radius)
        pGrad.addColorStop(0, 'rgba(255,255,255,0.4)'); pGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = pGrad; ctx.fill()
        ctx.shadowBlur = 0

        drawFace(ctx, pX, pY, radius * 0.5, player.appearance.face)

        if (!isEditorMode) {
            ctx.textAlign = 'center'
            const badgeY = pY - radius - 25
            ctx.fillStyle = 'rgba(0,0,0,0.7)'
            ctx.beginPath(); ctx.roundRect(pX - 18, badgeY - 10, 36, 18, 4); ctx.fill()
            ctx.strokeStyle = '#10b981'; ctx.lineWidth = 1.5; ctx.stroke()
            ctx.fillStyle = '#10b981'; ctx.font = 'black 10px Inter'; ctx.fillText(`LV.${player.stats.level}`, pX, badgeY + 3)

            ctx.font = 'black 11px Inter'; ctx.letterSpacing = '1px'; ctx.fillStyle = 'white'
            ctx.shadowBlur = 4; ctx.shadowColor = 'black'
            ctx.fillText(player.name.toUpperCase(), pX, pY + radius + 22); ctx.shadowBlur = 0
        }

        ctx.restore()
        requestRef.current = requestAnimationFrame(animate)
    }

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(requestRef.current)
    }, [player, keys, world, isEditorMode])

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

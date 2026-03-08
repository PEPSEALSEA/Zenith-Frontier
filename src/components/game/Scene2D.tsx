'use client'

import React, { useRef, useEffect, useState } from 'react'
import { useGameStore } from '@/store/gameStore'

const WORLD_SIZE = 2000

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
    const { player, updatePosition, world, updateWorldCycle, attack } = useGameStore()
    const [keys, setKeys] = useState<{ [key: string]: boolean }>({})
    const requestRef = useRef<number>(0)
    const posRef = useRef({ x: player.position.x, y: player.position.y })
    const lastTimeRef = useRef<number>(0)

    // Input handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => setKeys(prev => ({ ...prev, [e.code]: true }))
        const handleKeyUp = (e: KeyboardEvent) => setKeys(prev => ({ ...prev, [e.code]: false }))
        const handleMouseDown = (e: MouseEvent) => {
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
    }, [attack])

    const animate = (time: number) => {
        if (!lastTimeRef.current) lastTimeRef.current = time
        const deltaTime = (time - lastTimeRef.current) / 16.66 // normalized to 60fps
        lastTimeRef.current = time

        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Smoother Movement Mechanics
        let dx = 0
        let dy = 0
        const baseSpeed = player.stats.spd * 0.8
        if (keys['KeyW'] || keys['ArrowUp']) dy -= baseSpeed
        if (keys['KeyS'] || keys['ArrowDown']) dy += baseSpeed
        if (keys['KeyA'] || keys['ArrowLeft']) dx -= baseSpeed
        if (keys['KeyD'] || keys['ArrowRight']) dx += baseSpeed

        // Normalize diagonal speed
        if (dx !== 0 && dy !== 0) {
            const factor = 1 / Math.sqrt(2)
            dx *= factor
            dy *= factor
        }

        // Apply movement with delta-time for smoothness
        posRef.current.x = Math.max(0, Math.min(WORLD_SIZE, posRef.current.x + dx * deltaTime))
        posRef.current.y = Math.max(0, Math.min(WORLD_SIZE, posRef.current.y + dy * deltaTime))

        // Update global state every few frames to save performance
        if (time % 100 < 20) {
            updatePosition(posRef.current.x, posRef.current.y)
        }

        updateWorldCycle(0.0001 * deltaTime)

        // Render
        const { width, height } = canvas
        ctx.clearRect(0, 0, width, height)

        const camX = posRef.current.x - width / 2
        const camY = posRef.current.y - height / 2

        ctx.save()
        ctx.translate(-camX, -camY)

        // Draw Ambient Floor (Atmospheric)
        const gradientBg = ctx.createRadialGradient(posRef.current.x, posRef.current.y, 100, posRef.current.x, posRef.current.y, 800)
        gradientBg.addColorStop(0, '#020617')
        gradientBg.addColorStop(1, '#000000')
        ctx.fillStyle = gradientBg
        ctx.fillRect(camX, camY, width, height)

        // Grid
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)'
        ctx.lineWidth = 1
        for (let x = 0; x <= WORLD_SIZE; x += 100) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_SIZE); ctx.stroke()
        }
        for (let y = 0; y <= WORLD_SIZE; y += 100) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_SIZE, y); ctx.stroke()
        }

        // Draw "Mana Particles"
        ctx.fillStyle = `hsla(${world.manaCycle * 360}, 70%, 60%, 0.4)`
        for (let i = 0; i < 40; i++) {
            const seed = i * 2500
            const px = (seed % WORLD_SIZE)
            const py = ((seed * 3) % WORLD_SIZE)
            const pulse = Math.sin(time * 0.001 + i) * 3
            ctx.beginPath()
            ctx.arc(px, py, 3 + pulse, 0, Math.PI * 2)
            ctx.fill()
        }

        // --- DRAW PLAYER ---
        const pX = posRef.current.x
        const pY = posRef.current.y
        const radius = 35

        // Attack FX
        const attackAge = Date.now() - world.lastAttack.time
        if (attackAge < 300) {
            const progress = attackAge / 300
            const ringRadius = radius * (1 + progress * 2)
            ctx.beginPath()
            ctx.arc(pX, pY, ringRadius, 0, Math.PI * 2)
            ctx.strokeStyle = world.lastAttack.type === 'hard' ? 'rgba(239, 68, 68, ' + (1 - progress) + ')' : 'rgba(255, 255, 255, ' + (1 - progress) + ')'
            ctx.lineWidth = 4 * (1 - progress)
            ctx.stroke()
        }

        // Glow
        ctx.shadowBlur = 40
        ctx.shadowColor = player.appearance.color
        ctx.fillStyle = player.appearance.color
        ctx.beginPath()
        ctx.arc(pX, pY, radius, 0, Math.PI * 2)
        ctx.fill()

        // Inner Light
        const pGrad = ctx.createRadialGradient(pX, pY, 0, pX, pY, radius)
        pGrad.addColorStop(0, 'rgba(255,255,255,0.6)')
        pGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = pGrad
        ctx.fill()
        ctx.shadowBlur = 0

        // Vector Face
        drawFace(ctx, pX, pY, radius * 0.5, player.appearance.face)

        // Floating Info (Fixed bad alignment)
        ctx.textAlign = 'center'

        // Level Circle Tag
        ctx.fillStyle = '#000'
        ctx.beginPath(); ctx.arc(pX - 45, pY - 45, 12, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = '#10b981'
        ctx.lineWidth = 2; ctx.stroke()
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 10px Inter'
        ctx.fillText(stats.level.toString(), pX - 45, pY - 41)

        // Name (Now Cool and properly placed)
        ctx.font = 'black 12px Inter'
        ctx.letterSpacing = '2px'
        ctx.fillStyle = 'white'
        ctx.lineWidth = 4
        ctx.strokeStyle = 'rgba(0,0,0,0.8)'
        ctx.strokeText(player.name.toUpperCase(), pX, pY + radius + 25)
        ctx.fillText(player.name.toUpperCase(), pX, pY + radius + 25)

        ctx.restore()
        requestRef.current = requestAnimationFrame(animate)
    }

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(requestRef.current)
    }, [player, keys, world])

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
            className="absolute inset-0 cursor-crosshair bg-black"
        />
    )
}

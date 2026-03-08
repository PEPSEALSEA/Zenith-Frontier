'use client'

import React, { useRef, useEffect, useState } from 'react'
import { useGameStore } from '@/store/gameStore'

const WORLD_SIZE = 2000

const drawFace = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, face: string) => {
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2
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
        default:
            ctx.arc(x, y, r * 0.8, 0, Math.PI * 2)
            break
    }
    ctx.stroke()
}

export default function GameScene2D() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const { player, updatePosition, world, updateWorldCycle } = useGameStore()
    const [keys, setKeys] = useState<{ [key: string]: boolean }>({})
    const requestRef = useRef<number>(0)

    // Input handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => setKeys(prev => ({ ...prev, [e.code]: true }))
        const handleKeyUp = (e: KeyboardEvent) => setKeys(prev => ({ ...prev, [e.code]: false }))
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
        }
    }, [])

    const animate = (time: number) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Movement Logic
        let dx = 0
        let dy = 0
        const speed = player.stats.spd * 0.5
        if (keys['KeyW'] || keys['ArrowUp']) dy -= speed
        if (keys['KeyS'] || keys['ArrowDown']) dy += speed
        if (keys['KeyA'] || keys['ArrowLeft']) dx -= speed
        if (keys['KeyD'] || keys['ArrowRight']) dx += speed

        if (dx !== 0 || dy !== 0) {
            const newX = Math.max(0, Math.min(WORLD_SIZE, player.position.x + dx))
            const newY = Math.max(0, Math.min(WORLD_SIZE, player.position.y + dy))
            updatePosition(newX, newY)
        }

        // World Update
        updateWorldCycle(0.0001)

        // Render
        const { width, height } = canvas
        ctx.clearRect(0, 0, width, height)

        // Camera follow (interpolated toward player)
        const camX = player.position.x - width / 2
        const camY = player.position.y - height / 2

        ctx.save()
        ctx.translate(-camX, -camY)

        // Draw Grid
        ctx.strokeStyle = '#1e293b'
        ctx.lineWidth = 1
        const gridSize = 100
        for (let x = 0; x <= WORLD_SIZE; x += gridSize) {
            ctx.beginPath()
            ctx.moveTo(x, 0)
            ctx.lineTo(x, WORLD_SIZE)
            ctx.stroke()
        }
        for (let y = 0; y <= WORLD_SIZE; y += gridSize) {
            ctx.beginPath()
            ctx.moveTo(0, y)
            ctx.lineTo(WORLD_SIZE, y)
            ctx.stroke()
        }

        // Draw World Boundary
        ctx.strokeStyle = '#334155'
        ctx.lineWidth = 5
        ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE)

        // Draw "Mana Crystals" (Decorative)
        ctx.fillStyle = `hsla(${world.manaCycle * 360}, 70%, 50%, 0.3)`
        for (let i = 0; i < 50; i++) {
            const seed = i * 1337
            const x = (seed % WORLD_SIZE)
            const y = ((seed * 7) % WORLD_SIZE)
            ctx.beginPath()
            ctx.arc(x, y, 5 + Math.sin(time * 0.002 + i) * 2, 0, Math.PI * 2)
            ctx.fill()
        }

        // Draw Player
        const pX = player.position.x
        const pY = player.position.y
        const radius = 30

        // Shadow
        ctx.shadowBlur = 20
        ctx.shadowColor = player.appearance.color

        // Circle Body
        ctx.fillStyle = player.appearance.color
        ctx.beginPath()
        ctx.arc(pX, pY, radius, 0, Math.PI * 2)
        ctx.fill()

        // Inner Glow
        const gradient = ctx.createRadialGradient(pX, pY, 0, pX, pY, radius)
        gradient.addColorStop(0, 'rgba(255,255,255,0.4)')
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.fill()

        // Face (Vector Icon)
        ctx.shadowBlur = 0
        drawFace(ctx, pX, pY, radius * 0.5, player.appearance.face)

        // Level Tag
        ctx.fillStyle = 'white'
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 2
        ctx.font = 'bold 12px Arial'
        ctx.strokeText(`LVL ${player.stats.level}`, pX, pY - radius - 10)
        ctx.fillText(`LVL ${player.stats.level}`, pX, pY - radius - 10)

        // Name Tag
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.font = 'bold 10px Arial'
        ctx.fillText(player.name.toUpperCase(), pX, pY + radius + 15)

        ctx.restore()

        requestRef.current = requestAnimationFrame(animate)
    }

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(requestRef.current)
    }, [player, keys, world])

    // Handle Resize
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
            className="absolute inset-0 cursor-crosshair"
        />
    )
}

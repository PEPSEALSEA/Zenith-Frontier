'use client'

import React, { useRef, useEffect, useState } from 'react'
import { useGameStore } from '@/store/gameStore'

const WORLD_SIZE = 2000

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

        // Face (Emoji)
        ctx.shadowBlur = 0
        ctx.font = '30px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(player.appearance.face, pX, pY + 2)

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

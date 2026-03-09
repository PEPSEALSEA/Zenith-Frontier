'use client'

import React, { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Ring, Sphere } from '@react-three/drei'
import * as THREE from 'three'
import { Spawner, useGameStore, MonsterTemplate } from '@/store/gameStore'
import MonsterEntity from './Monster'

interface SpawnerProps {
    data: Spawner
}

interface MonsterInstance {
    id: string
    monster: MonsterTemplate
    position: [number, number, number]
}

export default function SpawnerEntity({ data }: SpawnerProps) {
    const { world, isEditorMode } = useGameStore()
    const [monsters, setMonsters] = useState<MonsterInstance[]>([])
    const lastSpawnTime = useRef(0)
    const lastCheckTime = useRef(0)

    // Find the monster definition
    const monsterDef = world.monsterTemplates.find(m => m.monster_id === data.monster_id)

    useFrame((state) => {
        if (!monsterDef) return

        const now = state.clock.getElapsedTime()

        // Spawn Logic
        if (now - lastSpawnTime.current > data.spawn_rate && monsters.length < data.max_monsters) {
            const angle = Math.random() * Math.PI * 2
            const distance = Math.random() * data.range
            const x = data.x + Math.cos(angle) * distance
            const z = data.z + Math.sin(angle) * distance

            const newMonster: MonsterInstance = {
                id: `INST_${Date.now()}_${Math.random()}`,
                monster: monsterDef,
                position: [x, 0, z]
            }

            setMonsters(prev => [...prev, newMonster])
            lastSpawnTime.current = now
        }

        // Despawn / Range logic (Crucial requirement: 1 sec tick rate)
        if (now - lastCheckTime.current > 1.0) {
            setMonsters(prev => prev.filter(m => {
                const distSq = Math.pow(m.position[0] - data.x, 2) + Math.pow(m.position[2] - data.z, 2)
                if (distSq > data.range * data.range) {
                    return false // Despawn
                }
                return true
            }))
            lastCheckTime.current = now
        }
    })

    const killMonster = (id: string) => {
        setMonsters(prev => prev.filter(m => m.id !== id))
        // Quest progress update would go here
    }

    return (
        <group position={[data.x, 0, data.z]}>
            {/* Visual Spawner (Editor Only or Subtle in Game) */}
            {isEditorMode && (
                <group>
                    <Ring args={[data.range - 0.1, data.range, 64]} rotation={[Math.PI / 2, 0, 0]}>
                        <meshStandardMaterial color="#06b6d4" transparent opacity={0.5} />
                    </Ring>
                    <Sphere args={[0.2, 16, 16]}>
                        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={2} />
                    </Sphere>
                    <Html position={[0, 0.5, 0]} center>
                        <div className="bg-cyan-500/20 backdrop-blur-md border border-cyan-500/50 px-2 py-1 rounded text-[8px] text-cyan-400 font-bold uppercase whitespace-nowrap select-none">
                            SPAWNER: {data.monster_id} ({monsters.length}/{data.max_monsters})
                        </div>
                    </Html>
                </group>
            )}

            {/* Render Monster Instances */}
            {monsters.map(m => (
                <MonsterEntity
                    key={m.id}
                    data={m.monster}
                    position={m.position}
                    onHit={() => killMonster(m.id)}
                />
            ))}
        </group>
    )
}

'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, PerspectiveCamera, Environment, Float, Sparkles, ContactShadows } from '@react-three/drei'
import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useGameStore } from '@/store/gameStore'
import SpawnerEntity from './Spawner'
import MonsterEntity from './Monster'

function Player() {
    const meshRef = useRef<THREE.Mesh>(null!)

    useFrame((state) => {
        const t = state.clock.getElapsedTime()
        meshRef.current.position.y = Math.sin(t) * 0.1
    })

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <mesh ref={meshRef} position={[0, 0, 0]}>
                <octahedronGeometry args={[0.5, 0]} />
                <meshStandardMaterial
                    color="#10b981"
                    emissive="#10b981"
                    emissiveIntensity={1.5}
                    metalness={0.9}
                    roughness={0.1}
                    wireframe
                />
            </mesh>
            {/* Internal Glow */}
            <mesh scale={[0.3, 0.3, 0.3]}>
                <sphereGeometry />
                <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={5} />
            </mesh>
        </Float>
    )
}

function Ground() {
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.1} metalness={0.8} />
            <gridHelper args={[100, 50, "#333", "#111"]} rotation={[Math.PI / 2, 0, 0]} />
        </mesh>
    )
}

function ManaCrystals() {
    const crystals = useMemo(() => {
        return Array.from({ length: 20 }, (_, i) => ({
            position: [
                (Math.random() - 0.5) * 40,
                Math.random() * 5,
                (Math.random() - 0.5) * 40
            ] as [number, number, number],
            scale: Math.random() * 0.5 + 0.1
        }))
    }, [])

    return crystals.map((c, i) => (
        <mesh key={i} position={c.position} scale={c.scale}>
            <coneGeometry args={[0.5, 1, 4]} />
            <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={2} />
        </mesh>
    ))
}

export default function GameScene() {
    const { world, isEditorMode, isForgeMode } = useGameStore()

    return (
        <div className="h-full w-full">
            <Canvas shadows dpr={[1, 2]}>
                <PerspectiveCamera makeDefault position={[5, 5, 10]} fov={50} />
                <OrbitControls
                    enablePan={false}
                    maxPolarAngle={Math.PI / 2 - 0.1}
                    minDistance={2}
                    maxDistance={20}
                />

                {/* Environment */}
                <color attach="background" args={['#020617']} />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                <Sparkles count={200} scale={20} size={1} speed={0.4} color="#10b981" />

                {/* Lights */}
                <ambientLight intensity={0.2} />
                <pointLight position={[10, 10, 10]} intensity={1.5} color="#fff" />
                <spotLight position={[0, 10, 0]} intensity={1} angle={0.3} penumbra={1} castShadow color="#10b981" />

                {/* Objects */}
                <Ground />
                <ManaCrystals />

                {/* Game Entities */}
                {world.spawners.map(s => (
                    <SpawnerEntity key={s.spawner_id} data={s} />
                ))}

                {/* Additional World Objects (NPCs, Bosses) could be mapped here */}

                <Environment preset="city" />
                <ContactShadows resolution={1024} scale={20} blur={2} opacity={0.5} far={10} color="#000000" />
            </Canvas>
        </div>
    )
}

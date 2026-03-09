'use client'

import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, Text, Html } from '@react-three/drei'
import * as THREE from 'three'
import { MonsterTemplate, FACES_MAP, FaceKey } from '@/store/gameStore'

interface MonsterProps {
    data: MonsterTemplate
    position: [number, number, number]
    onHit?: () => void
}

export default function MonsterEntity({ data, position, onHit }: MonsterProps) {
    const meshRef = useRef<THREE.Group>(null!)
    const faceRef = useRef<THREE.Group>(null!)

    useFrame((state) => {
        const t = state.clock.getElapsedTime()
        if (meshRef.current) {
            meshRef.current.position.y = Math.sin(t * 2) * 0.1
            // Basic "bobbing" and "looking at player" logic could go here
        }
    })

    return (
        <group position={position} ref={meshRef}>
            <Float speed={3} rotationIntensity={1} floatIntensity={1}>
                {/* Body */}
                <mesh castShadow>
                    <sphereGeometry args={[0.5, 32, 32]} />
                    <meshStandardMaterial
                        color={data.appearance.color}
                        emissive={data.appearance.color}
                        emissiveIntensity={0.5}
                        roughness={0.2}
                        metalness={0.8}
                    />
                </mesh>

                {/* Face Visual (Floating Icon) */}
                <Html position={[0, 0, 0.51]} transform occlude pointerEvents="none">
                    <div className="flex items-center justify-center bg-black/40 rounded-full p-2 border border-white/20">
                        {React.createElement(FACES_MAP[data.appearance.face as FaceKey] || FACES_MAP['skull'], {
                            className: "w-8 h-8 text-white",
                            strokeWidth: 2.5
                        })}
                    </div>
                </Html>
            </Float>

            {/* Health Bar / Name */}
            <Html position={[0, 1.2, 0]} center>
                <div className="flex flex-col items-center gap-1 w-32 pointer-events-none select-none">
                    <span className="text-[10px] font-black tracking-tighter text-white uppercase italic drop-shadow-md">
                        {data.name} <span className="text-white/40 font-mono">ID:{data.monster_id}</span>
                    </span>
                    <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/10">
                        <div className="h-full bg-red-500 w-full" />
                    </div>
                </div>
            </Html>

            {/* Shadow */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]} receiveShadow>
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial color="#000" transparent opacity={0.3} />
            </mesh>
        </group>
    )
}

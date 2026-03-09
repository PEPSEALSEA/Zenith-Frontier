'use client'

import React from 'react'
import { Html, Float } from '@react-three/drei'
import { UserCircle2 } from 'lucide-react'
import { FACES_MAP, FaceKey } from '@/store/gameStore'

interface NPCProps {
    data: {
        npc_id: string
        name: string
        appearance: { color: string, face: string }
        is_merchant?: boolean
        is_trader?: boolean
    }
    position: [number, number, number]
}

export default function NPCEntity({ data, position }: NPCProps) {
    return (
        <group position={position}>
            <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
                {/* Body */}
                <mesh castShadow>
                    <capsuleGeometry args={[0.3, 0.6, 4, 32]} />
                    <meshStandardMaterial
                        color={data.appearance.color}
                        emissive={data.appearance.color}
                        emissiveIntensity={0.2}
                    />
                </mesh>

                {/* Face */}
                <Html position={[0, 0.4, 0.31]} transform occlude pointerEvents="none">
                    <div className="p-1 bg-black/40 rounded-full border border-white/20">
                        {React.createElement(FACES_MAP[data.appearance.face as FaceKey] || UserCircle2, {
                            className: "w-4 h-4 text-white"
                        })}
                    </div>
                </Html>
            </Float>

            {/* NPC Label */}
            <Html position={[0, 1.4, 0]} center>
                <div className="flex flex-col items-center gap-1 pointer-events-none select-none">
                    <span className="text-[10px] font-black tracking-widest text-white uppercase italic drop-shadow-lg px-2 py-0.5 bg-black/40 border border-white/10 rounded">
                        {data.name}
                        {(data.is_merchant || data.is_trader) && (
                            <span className="ml-2 text-amber-400">[SHOP]</span>
                        )}
                    </span>
                </div>
            </Html>

            {/* Interaction Trigger Visual */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
                <ringGeometry args={[0.6, 0.7, 32]} />
                <meshStandardMaterial color="#fcd34d" transparent opacity={0.2} />
            </mesh>
        </group>
    )
}

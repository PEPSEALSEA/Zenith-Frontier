'use client'

import React, { useState, useEffect } from 'react'
import { useGameStore, Job, PlayerAppearance, FACES_MAP, FaceKey } from '@/store/gameStore'
import { motion, AnimatePresence } from 'framer-motion'
import { GoogleLogin, googleLogout } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'
import { gasService } from '@/services/gasService'
import {
    UserCircle2,
    Palette,
    Smile,
    Shield,
    Sword,
    Target,
    Zap,
    DraftingCompass,
    Heart,
    ChevronRight,
    LogOut,
    Loader2
} from 'lucide-react'

const FACES: FaceKey[] = ['ghost', 'skull', 'fire', 'bolt', 'star', 'crown', 'swords', 'target', 'shield', 'heart']
const COLORS = [
    '#10b981', '#3b82f6', '#ef4444', '#f59e0b',
    '#8b5cf6', '#ec4899', '#ffffff', '#000000',
]

const JOBS: (Job & { icon: any })[] = [
    { id: 'JOB_001', name: 'Warrior', level: 1, type: 'main', skills: ['Slash'], icon: Sword },
    { id: 'JOB_002', name: 'Archer', level: 1, type: 'main', skills: ['Double Shot'], icon: Target },
    { id: 'JOB_003', name: 'Twin-Blade', level: 1, type: 'main', skills: ['Quick Step'], icon: Zap },
    { id: 'JOB_004', name: 'Spearman', level: 1, type: 'main', skills: ['Pierce'], icon: DraftingCompass },
    { id: 'JOB_005', name: 'Supporter', level: 1, type: 'main', skills: ['Heal'], icon: Heart },
    { id: 'JOB_008', name: 'Mage', level: 1, type: 'main', skills: ['Arcane Bolt'], icon: Shield },
]

export default function CharacterCreator() {
    const { auth, login, logout, initializeCharacter } = useGameStore()
    const [name, setName] = useState('')
    const [appearance, setAppearance] = useState<PlayerAppearance>({ color: COLORS[0], face: FACES[0] })
    const [selectedJob, setSelectedJob] = useState<Job>(JOBS[0])
    const [step, setStep] = useState(1)
    const [isLoading, setIsLoading] = useState(false)

    const handleSuccess = async (credentialResponse: any) => {
        setIsLoading(true)
        try {
            const decoded: any = jwtDecode(credentialResponse.credential)
            const email = decoded.email

            login({
                name: decoded.name,
                email: email,
                picture: decoded.picture
            })

            // Check GAS for existing player
            const existingPlayer = await gasService.getPlayer(email)

            if (existingPlayer) {
                // Already registered, sync and enter
                const job = JOBS.find(j => j.id === existingPlayer.main_job_id) || JOBS[0]
                initializeCharacter(existingPlayer.name, existingPlayer.appearance, job)
            } else {
                // New player, proceed to customisation
                setName(decoded.name)
                setStep(2)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }

    const handleStartGame = async () => {
        if (!name || !auth.user?.email) return
        setIsLoading(true)

        try {
            // 1. Create in GAS
            await gasService.createPlayer(auth.user.email, name, appearance)
            // 2. Set Job
            await gasService.setMainJob(auth.user.email, selectedJob.id)

            // 3. Init locally
            initializeCharacter(name, appearance, selectedJob)
        } catch (e) {
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#020617] p-4 lg:p-8">
            {isLoading && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
                    <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
                </div>
            )}

            <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-black/60 shadow-2xl backdrop-blur-2xl">
                <div className="relative grid h-full grid-cols-1 lg:grid-cols-2">

                    {/* Preview */}
                    <div className="flex flex-col items-center justify-center border-b border-white/5 p-12 lg:border-b-0 lg:border-r bg-zinc-950/20">
                        <motion.div
                            style={{ backgroundColor: appearance.color }}
                            className="h-48 w-48 rounded-full shadow-[0_0_50px_rgba(255,255,255,0.05)] flex items-center justify-center select-none relative"
                        >
                            {React.createElement(FACES_MAP[appearance.face as FaceKey] || Ghost, {
                                className: "h-24 w-24 text-white drop-shadow-lg",
                                strokeWidth: 2.5
                            })}
                            <div className="absolute inset-0 rounded-full border-[8px] border-white/10" />
                        </motion.div>
                        <div className="text-center mt-8">
                            <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase">{name || 'ADVENTURER'}</h2>
                            <p className="text-sm font-bold tracking-[0.3em] text-emerald-500/80 uppercase mt-1">{selectedJob.name}</p>
                        </div>
                    </div>

                    {/* Configuration */}
                    <div className="flex flex-col p-12">
                        {!auth.isAuthenticated ? (
                            <div className="flex h-full flex-col items-center justify-center text-center">
                                <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic mb-6">ZENITH FRONTIER</h1>
                                <GoogleLogin onSuccess={handleSuccess} onError={() => { }} />
                            </div>
                        ) : (
                            <div className="flex h-full flex-col">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <img src={auth.user?.picture} className="h-10 w-10 rounded-full border border-emerald-500/50" />
                                        <span className="text-xs font-bold text-white uppercase">{auth.user?.name}</span>
                                    </div>
                                    <button onClick={logout} className="p-2 text-white/20 hover:text-rose-500 transition-colors">
                                        <LogOut className="h-5 w-5" />
                                    </button>
                                </div>

                                <AnimatePresence mode="wait">
                                    {step === 2 && (
                                        <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                            <SectionTitle icon={Palette} title="Color Spectrum" />
                                            <div className="grid grid-cols-4 gap-2">
                                                {COLORS.map(c => (
                                                    <button key={c} onClick={() => setAppearance({ ...appearance, color: c })} style={{ backgroundColor: c }} className={`h-10 rounded-lg border-2 ${appearance.color === c ? 'border-white scale-105' : 'border-transparent opacity-60'}`} />
                                                ))}
                                            </div>
                                            <SectionTitle icon={Smile} title="Facial Identity" />
                                            <div className="flex flex-wrap gap-2">
                                                {FACES.map(f => {
                                                    const Icon = FACES_MAP[f]
                                                    return (
                                                        <button
                                                            key={f}
                                                            onClick={() => setAppearance({ ...appearance, face: f })}
                                                            className={`h-12 w-12 rounded-xl bg-white/5 border-2 flex items-center justify-center transition-all ${appearance.face === f ? 'border-emerald-500 bg-emerald-500/10' : 'border-transparent hover:bg-white/10'}`}
                                                        >
                                                            <Icon className={`h-6 w-6 ${appearance.face === f ? 'text-emerald-500' : 'text-white/40'}`} />
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                            <button onClick={() => setStep(3)} className="w-full h-14 bg-emerald-600 rounded-xl font-black tracking-widest text-white mt-4">NEXT SYSTEM</button>
                                        </motion.div>
                                    )}

                                    {step === 3 && (
                                        <motion.div key="s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                            <SectionTitle icon={Sword} title="Select Job" />
                                            {JOBS.map(job => (
                                                <button key={job.id} onClick={() => setSelectedJob(job)} className={`w-full p-4 rounded-xl border-2 text-left flex items-start gap-4 transition-all ${selectedJob.id === job.id ? 'border-emerald-500 bg-emerald-500/10 scale-[1.02]' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}>
                                                    <div className={`p-2 rounded-lg ${selectedJob.id === job.id ? 'bg-emerald-500 text-black' : 'bg-white/5 text-white/40'}`}>
                                                        <job.icon className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-lg font-bold uppercase italic text-white">{job.name}</h4>
                                                        <p className="text-[10px] text-emerald-500/60 uppercase font-black">Skills: {job.skills.join(', ')}</p>
                                                    </div>
                                                </button>
                                            ))}
                                            <div className="flex gap-4 mt-4">
                                                <button onClick={() => setStep(2)} className="px-6 border border-white/10 rounded-xl text-white/40">BACK</button>
                                                <button onClick={handleStartGame} className="flex-1 h-14 bg-white text-black font-black tracking-[0.3em] rounded-xl hover:bg-emerald-500 hover:text-white transition-all">ENTER FRONT</button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

const SectionTitle = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-emerald-500" />
        <h3 className="text-xs font-black tracking-widest text-white/40 uppercase">{title}</h3>
    </div>
)

'use client'

import React, { useState, useEffect } from 'react'
import { useGameStore, Job, PlayerAppearance, FACES_MAP, FaceKey, ADMIN_EMAIL } from '@/store/gameStore'
import { motion, AnimatePresence } from 'framer-motion'
import { GoogleLogin } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'
import { gasService } from '@/services/gasService'
import {
    Palette,
    Smile,
    Shield,
    Sword,
    Target,
    Zap,
    DraftingCompass,
    Heart,
    LogOut,
    Ghost
} from 'lucide-react'
import SessionLoading from '@/components/ui/SessionLoading'

const FACES: FaceKey[] = ['ghost', 'skull', 'fire', 'bolt', 'star', 'crown', 'swords', 'target', 'shield', 'heart']
const COLORS = [
    '#10b981', '#3b82f6', '#ef4444', '#f59e0b',
    '#8b5cf6', '#ec4899', '#ffffff', '#000000',
]

const JOB_ICONS: Record<string, any> = {
    JOB_001: Sword,
    JOB_002: Target,
    JOB_003: Zap,
    JOB_004: DraftingCompass,
    JOB_005: Heart,
    JOB_008: Shield,
}

const FALLBACK_JOBS: (Job & { icon: any; stat_bonus?: string })[] = [
    { id: 'JOB_001', name: 'Warrior', level: 1, type: 'main', skills: ['Slash'], icon: Sword, stat_bonus: 'atk+10,def+5' },
    { id: 'JOB_002', name: 'Archer', level: 1, type: 'main', skills: ['Double Shot'], icon: Target, stat_bonus: 'spd+10,atk+5' },
    { id: 'JOB_003', name: 'Twin-Blade', level: 1, type: 'main', skills: ['Quick Step'], icon: Zap, stat_bonus: 'spd+15,atk+3' },
    { id: 'JOB_004', name: 'Spearman', level: 1, type: 'main', skills: ['Pierce'], icon: DraftingCompass, stat_bonus: 'atk+7,def+8' },
    { id: 'JOB_005', name: 'Supporter', level: 1, type: 'main', skills: ['Heal'], icon: Heart, stat_bonus: 'mp+30,def+5' },
    { id: 'JOB_008', name: 'Mage', level: 1, type: 'main', skills: ['Arcane Bolt'], icon: Shield, stat_bonus: 'mp+20,atk+5' },
]

export default function CharacterCreator() {
    const {
        auth,
        login,
        logout,
        initializeCharacter,
        hydrateFromServer,
        enterForgeMode,
        enterAdminDashboard,
        setHydratingSession,
        setAuthBootComplete,
    } = useGameStore()
    const [name, setName] = useState('')
    const [appearance, setAppearance] = useState<PlayerAppearance>({ color: COLORS[0], face: FACES[0] })
    const [jobs, setJobs] = useState<(Job & { icon: any; stat_bonus?: string })[]>(FALLBACK_JOBS)
    const [selectedJob, setSelectedJob] = useState<Job>(FALLBACK_JOBS[0])
    const [step, setStep] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const [loginAsName, setLoginAsName] = useState('')

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const fromApi = await gasService.getAllJobs()
                if (cancelled || !fromApi.length) return
                const mapped = fromApi
                    .filter((j: any) => !j.is_hidden && (!j.parent_job_id || j.parent_job_id === ''))
                    .map((j) => ({
                        ...j,
                        icon: JOB_ICONS[j.id] || Sword,
                    }))
                const starters = mapped.length ? mapped : FALLBACK_JOBS
                setJobs(starters)
                setSelectedJob(starters[0])
            } catch {
                /* keep fallback */
            }
        })()
        return () => { cancelled = true }
    }, [])

    useEffect(() => {
        if (!auth.isAuthenticated || !auth.user) return
        if (step !== 1) return
        setName((n) => n || auth.user?.name || 'Adventurer')
        setStep(2)
    }, [auth.isAuthenticated, auth.user, step])

    const finishLogin = async (email: string, displayName: string, picture = '') => {
        setLoginAsName(displayName)
        login({ name: displayName, email, picture })

        if (email === ADMIN_EMAIL) {
            enterAdminDashboard()
            setAuthBootComplete(true)
            return
        }

        setHydratingSession(true)
        const ok = await hydrateFromServer(email)
        setHydratingSession(false)
        setAuthBootComplete(true)
        if (ok) return

        setName(displayName)
        setStep(2)
    }

    const handleSuccess = async (credentialResponse: any) => {
        setIsLoading(true)
        try {
            const decoded: any = jwtDecode(credentialResponse.credential)
            await finishLogin(
                decoded.email,
                decoded.name || 'Adventurer',
                decoded.picture || '',
            )
        } catch (e) {
            console.error(e)
            setHydratingSession(false)
            setAuthBootComplete(true)
        } finally {
            setIsLoading(false)
        }
    }

    const handleGuestLogin = async () => {
        setIsLoading(true)
        try {
            await finishLogin('guest@zenith.local', 'Guest')
        } catch (e) {
            console.error(e)
            setHydratingSession(false)
            setAuthBootComplete(true)
        } finally {
            setIsLoading(false)
        }
    }

    const handleStartGame = async () => {
        if (!name || !auth.user?.email) return
        setIsLoading(true)

        try {
            await gasService.createPlayer(auth.user.email, name, appearance)
            await gasService.setMainJob(auth.user.email, selectedJob.id)
            initializeCharacter(name, appearance, selectedJob)
            const stats = useGameStore.getState().player.stats
            await gasService.updateStats(auth.user.email, {
                atk: stats.atk,
                def: stats.def,
                spd: stats.spd,
                hp: stats.hp,
                mp: stats.mp,
                money: stats.money,
            })
            await useGameStore.getState().refreshSkills()
        } catch (e) {
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex h-screen items-center justify-center bg-[#020617] p-4 lg:p-8">
            {isLoading && (
                <div className="fixed inset-0 z-[100]">
                    <SessionLoading
                        name={loginAsName || auth.user?.name}
                        picture={auth.user?.picture}
                        detail="Loading character…"
                    />
                </div>
            )}

            <div className="relative flex h-full max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/60 shadow-2xl backdrop-blur-2xl">
                <div className="relative grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">

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

                    <div className="flex min-h-0 flex-col p-8 lg:p-12">
                        {!auth.isAuthenticated ? (
                            <div className="flex h-full flex-col items-center justify-center text-center gap-4">
                                <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic mb-2">ZENITH FRONTIER</h1>
                                <GoogleLogin onSuccess={handleSuccess} onError={() => { }} />
                                <button
                                    type="button"
                                    onClick={handleGuestLogin}
                                    className="mt-2 rounded-lg border border-white/15 bg-white/5 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white/80 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400"
                                >
                                    Play as Guest
                                </button>
                            </div>
                        ) : (
                            <div className="flex min-h-0 flex-1 flex-col">
                                <div className="mb-6 flex shrink-0 items-center justify-between overflow-x-auto">
                                    <div className="flex items-center gap-4">
                                        {auth.user?.picture ? (
                                            <img src={auth.user.picture} alt="" className="h-10 w-10 rounded-full border border-emerald-500/50" />
                                        ) : (
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/15">
                                                <Ghost className="h-5 w-5 text-emerald-400" />
                                            </div>
                                        )}
                                        <span className="text-xs font-bold text-white uppercase">{auth.user?.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {auth.user?.email === ADMIN_EMAIL && (
                                            <button
                                                onClick={() => enterForgeMode()}
                                                className="px-4 py-2 border border-amber-500/50 bg-amber-500/10 text-amber-500 font-black tracking-widest rounded-lg hover:bg-amber-500 hover:text-black transition-all uppercase text-[8px]"
                                            >
                                                Launch World Forge
                                            </button>
                                        )}
                                        <button onClick={logout} className="p-2 text-white/20 hover:text-rose-500 transition-colors">
                                            <LogOut className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="relative min-h-0 flex-1">
                                <AnimatePresence mode="wait">
                                    {step === 2 && (
                                        <motion.div
                                            key="s2"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 space-y-6 overflow-y-auto overscroll-contain pr-1"
                                        >
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
                                            <div className="space-y-2">
                                                <label className="text-xs font-black tracking-widest text-white/40 uppercase">Name</label>
                                                <input
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    className="w-full h-12 rounded-xl bg-black/40 border border-white/10 px-4 text-white font-bold"
                                                />
                                            </div>
                                            <button onClick={() => setStep(3)} className="w-full h-14 bg-emerald-600 rounded-xl font-black tracking-widest text-white mt-4">NEXT SYSTEM</button>
                                        </motion.div>
                                    )}

                                    {step === 3 && (
                                        <motion.div
                                            key="s3"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 flex flex-col"
                                        >
                                            <div className="shrink-0">
                                                <SectionTitle icon={Sword} title="Select Job" />
                                            </div>
                                            <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
                                                {jobs.map(job => (
                                                    <button
                                                        key={job.id}
                                                        type="button"
                                                        onClick={() => setSelectedJob(job)}
                                                        className={`w-full p-4 rounded-xl border-2 text-left flex items-start gap-4 transition-all ${selectedJob.id === job.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
                                                    >
                                                        <div className={`p-2 rounded-lg ${selectedJob.id === job.id ? 'bg-emerald-500 text-black' : 'bg-white/5 text-white/40'}`}>
                                                            <job.icon className="h-6 w-6" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-lg font-bold uppercase italic text-white">{job.name}</h4>
                                                            <p className="text-[10px] text-emerald-500/60 uppercase font-black">
                                                                {(job as any).stat_bonus || job.id}
                                                            </p>
                                                            {(job as any).potential && (
                                                                <p className="text-[9px] text-white/35 font-mono mt-1 truncate">
                                                                    Potential {(job as any).potential}
                                                                </p>
                                                            )}
                                                            {(job as any).description && (
                                                                <p className="text-[10px] text-white/40 mt-1">{(job as any).description}</p>
                                                            )}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="mt-4 flex shrink-0 flex-col gap-4 border-t border-white/5 pt-4">
                                                <div className="flex gap-4">
                                                    <button type="button" onClick={() => setStep(2)} className="px-6 border border-white/10 rounded-xl text-white/40">BACK</button>
                                                    <button type="button" onClick={handleStartGame} className="flex-1 h-14 bg-white text-black font-black tracking-[0.3em] rounded-xl hover:bg-emerald-500 hover:text-white transition-all uppercase">Enter Frontier</button>
                                                </div>

                                                {auth.user?.email === ADMIN_EMAIL && (
                                                    <button
                                                        type="button"
                                                        onClick={() => enterForgeMode()}
                                                        className="w-full h-12 border-2 border-amber-500/50 bg-amber-500/10 text-amber-500 font-black tracking-[0.2em] rounded-xl hover:bg-amber-500 hover:text-black transition-all uppercase text-[10px]"
                                                    >
                                                        Initialize World Forge Mode
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                </div>
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

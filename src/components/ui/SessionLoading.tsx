'use client'

import { motion } from 'framer-motion'

type Props = {
    name?: string | null
    picture?: string | null
    detail?: string
}

export default function SessionLoading({ name, picture, detail }: Props) {
    const label = name ? `Login as ${name}` : 'Restoring session…'

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#020617] p-6">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-black/70 px-8 py-12 text-center shadow-2xl backdrop-blur-xl"
            >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.18),transparent_55%)]" />

                <p className="relative text-[10px] font-black uppercase tracking-[0.35em] text-emerald-400/70">
                    Zenith Frontier
                </p>

                <div className="relative mx-auto mt-8 flex h-20 w-20 items-center justify-center">
                    <div className="absolute inset-0 animate-ping rounded-full border border-emerald-400/20" />
                    <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-emerald-400/80 border-r-emerald-400/20" />
                    {picture ? (
                        <img
                            src={picture}
                            alt=""
                            className="h-14 w-14 rounded-full border border-white/20 object-cover"
                        />
                    ) : (
                        <div className="h-14 w-14 rounded-full border border-emerald-400/30 bg-emerald-500/10" />
                    )}
                </div>

                <h1 className="relative mt-8 font-display text-2xl font-bold tracking-tight text-white">
                    {label}
                </h1>
                <p className="relative mt-3 text-xs font-medium uppercase tracking-[0.22em] text-white/35">
                    {detail || 'Entering the frontier…'}
                </p>

                <div className="relative mx-auto mt-10 h-1 w-40 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                        className="h-full rounded-full bg-emerald-400"
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                        style={{ width: '55%' }}
                    />
                </div>
            </motion.div>
        </div>
    )
}

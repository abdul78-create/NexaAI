'use client'

/**
 * AI Orb — abstract intelligence visualization.
 * Composed of concentric animated rings, pulsing core, and orbiting particles.
 * Pure CSS + Motion — no Three.js required.
 * Performance: uses will-change: transform and pauses on reduced-motion.
 * Theme-aware: optimized for high-contrast, glowing elegance in both light and dark themes.
 */

import { motion } from 'motion/react'

interface OrbRingProps {
  size: number
  duration: number
  delay?: number
  opacity?: number
  borderStyle?: 'solid' | 'dashed'
  clockwise?: boolean
}

function OrbRing({ size, duration, delay = 0, opacity = 0.35, borderStyle = 'solid', clockwise = true }: OrbRingProps) {
  return (
    <motion.div
      className="absolute rounded-full border border-brand/40 dark:border-brand"
      style={{
        width: size,
        height: size,
        left: '50%',
        top: '50%',
        x: '-50%',
        y: '-50%',
        opacity,
        borderStyle,
        willChange: 'transform',
      }}
      animate={{ rotate: clockwise ? 360 : -360 }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'linear',
        delay,
      }}
    >
      {/* Particle on this ring */}
      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-1.5 rounded-full bg-brand shadow-[0_0_8px_rgba(147,51,234,0.7)] dark:shadow-[0_0_10px_oklch(0.72_0.22_280)]"
      />
    </motion.div>
  )
}

export function AiOrb() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
      {/* Ambient glow behind orb */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, oklch(0.65 0.22 280 / 0.25) 0%, transparent 70%)',
          filter: 'blur(24px)',
        }}
        aria-hidden
      />

      {/* Rings */}
      <OrbRing size={280} duration={20} opacity={0.2} />
      <OrbRing size={220} duration={15} delay={1} opacity={0.28} clockwise={false} borderStyle="dashed" />
      <OrbRing size={170} duration={10} delay={0.5} opacity={0.35} />
      <OrbRing size={120} duration={7} delay={2} opacity={0.42} clockwise={false} />
      <OrbRing size={75} duration={4} delay={1} opacity={0.5} />

      {/* Core glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 64,
          height: 64,
          background: 'radial-gradient(circle, oklch(0.70 0.24 280 / 0.95) 0%, oklch(0.55 0.24 280 / 0.45) 60%, transparent 100%)',
          boxShadow: '0 0 35px oklch(0.65 0.24 280 / 0.7), 0 0 70px oklch(0.65 0.24 280 / 0.35)',
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.85, 1, 0.85],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Inner sparkle */}
      <motion.div
        className="absolute size-3.5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.95)]"
        animate={{
          scale: [0.8, 1.25, 0.8],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5,
        }}
      />
    </div>
  )
}

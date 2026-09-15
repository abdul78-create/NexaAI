'use client'

/**
 * AI Orb — abstract intelligence visualization.
 * Composed of concentric animated rings, pulsing core, and orbiting particles.
 * Pure CSS + Motion — no Three.js required.
 * Performance: uses will-change: transform and pauses on reduced-motion.
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

function OrbRing({ size, duration, delay = 0, opacity = 0.3, borderStyle = 'solid', clockwise = true }: OrbRingProps) {
  return (
    <motion.div
      className="absolute rounded-full border border-brand"
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
        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-1.5 rounded-full bg-brand"
        style={{ boxShadow: '0 0 6px oklch(0.72 0.22 280)' }}
      />
    </motion.div>
  )
}

export function AiOrb() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
      {/* Rings */}
      <OrbRing size={280} duration={20} opacity={0.12} />
      <OrbRing size={220} duration={15} delay={1} opacity={0.18} clockwise={false} borderStyle="dashed" />
      <OrbRing size={170} duration={10} delay={0.5} opacity={0.22} />
      <OrbRing size={120} duration={7} delay={2} opacity={0.28} clockwise={false} />
      <OrbRing size={75} duration={4} delay={1} opacity={0.35} />

      {/* Core glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 60,
          height: 60,
          background: 'radial-gradient(circle, oklch(0.72 0.22 280 / 0.8) 0%, oklch(0.55 0.22 280 / 0.3) 60%, transparent 100%)',
          boxShadow: '0 0 40px oklch(0.72 0.22 280 / 0.5), 0 0 80px oklch(0.72 0.22 280 / 0.2)',
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Inner sparkle */}
      <motion.div
        className="absolute size-3 rounded-full bg-white"
        style={{ boxShadow: '0 0 12px white' }}
        animate={{
          scale: [0.8, 1.2, 0.8],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5,
        }}
      />

      {/* Ambient glow behind orb */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, oklch(0.55 0.22 280 / 0.15) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
        aria-hidden
      />
    </div>
  )
}

'use client'

import React from 'react'
import { motion } from 'motion/react'

/**
 * NexaAI Thinking Animation
 *
 * Signature orbital particle animation used while the AI is generating a response.
 * Design: Central glowing orb + 2 orbital rings at different speeds/directions
 * + 4 orbiting particles + pulsing label.
 *
 * Usage:
 *   <ThinkingAnimation />                     (default: compact inline)
 *   <ThinkingAnimation size="lg" label />     (large with label text)
 */

interface ThinkingAnimationProps {
  /** Visual size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to show the "NexaAI is thinking..." label */
  showLabel?: boolean
  className?: string
}

const sizeMap = {
  sm: { orb: 24, ring1: 44, ring2: 60, particle: 5, particleOrbit1: 22, particleOrbit2: 30 },
  md: { orb: 32, ring1: 60, ring2: 80, particle: 6, particleOrbit1: 30, particleOrbit2: 40 },
  lg: { orb: 44, ring1: 84, ring2: 112, particle: 7, particleOrbit1: 42, particleOrbit2: 56 },
}

export function ThinkingAnimation({
  size = 'md',
  showLabel = false,
  className = '',
}: ThinkingAnimationProps) {
  const s = sizeMap[size]
  const containerSize = s.ring2 + 20

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
      className={`flex flex-col items-center gap-3 ${className}`}
    >
      {/* Orbital system */}
      <div
        className="relative flex items-center justify-center flex-shrink-0"
        style={{ width: containerSize, height: containerSize }}
      >
        {/* Ambient glow backdrop */}
        <div
          className="absolute rounded-full"
          style={{
            width: s.ring2 + 24,
            height: s.ring2 + 24,
            background: 'radial-gradient(circle, oklch(0.72 0.22 280 / 0.12) 0%, transparent 70%)',
          }}
        />

        {/* Outer orbit ring (slow, clockwise) */}
        <div
          className="absolute rounded-full border border-dashed"
          style={{
            width: s.ring2,
            height: s.ring2,
            borderColor: 'oklch(0.72 0.22 280 / 0.18)',
          }}
        />
        <motion.div
          className="absolute"
          style={{ width: s.ring2, height: s.ring2 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          {/* Outer particle 1 */}
          <div
            className="absolute rounded-full"
            style={{
              width: s.particle,
              height: s.particle,
              top: '50%',
              left: '50%',
              marginTop: -(s.particleOrbit2),
              marginLeft: -(s.particle / 2),
              background: 'oklch(0.72 0.22 280)',
              boxShadow: '0 0 8px oklch(0.72 0.22 280 / 0.8)',
            }}
          />
          {/* Outer particle 2 (opposite side) */}
          <div
            className="absolute rounded-full opacity-60"
            style={{
              width: s.particle - 1,
              height: s.particle - 1,
              top: '50%',
              left: '50%',
              marginTop: s.particleOrbit2 - (s.particle / 2),
              marginLeft: -(s.particle / 2),
              background: 'oklch(0.80 0.16 195)',
              boxShadow: '0 0 6px oklch(0.80 0.16 195 / 0.7)',
            }}
          />
        </motion.div>

        {/* Inner orbit ring (faster, counter-clockwise) */}
        <div
          className="absolute rounded-full border border-dashed"
          style={{
            width: s.ring1,
            height: s.ring1,
            borderColor: 'oklch(0.80 0.16 195 / 0.22)',
          }}
        />
        <motion.div
          className="absolute"
          style={{ width: s.ring1, height: s.ring1 }}
          animate={{ rotate: -360 }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        >
          {/* Inner particle 1 */}
          <div
            className="absolute rounded-full"
            style={{
              width: s.particle - 1,
              height: s.particle - 1,
              top: '50%',
              left: '50%',
              marginTop: -(s.particleOrbit1),
              marginLeft: -((s.particle - 1) / 2),
              background: 'oklch(0.80 0.16 195)',
              boxShadow: '0 0 8px oklch(0.80 0.16 195 / 0.9)',
            }}
          />
          {/* Inner particle 2 (offset 120deg) */}
          <div
            className="absolute rounded-full opacity-70"
            style={{
              width: s.particle - 2,
              height: s.particle - 2,
              top: '50%',
              left: '50%',
              marginTop: (s.particleOrbit1 * 0.5) - ((s.particle - 2) / 2),
              marginLeft: (s.particleOrbit1 * 0.866) - ((s.particle - 2) / 2),
              background: 'oklch(0.82 0.12 320)',
              boxShadow: '0 0 6px oklch(0.82 0.12 320 / 0.7)',
            }}
          />
        </motion.div>

        {/* Central glowing orb */}
        <motion.div
          className="absolute rounded-full gradient-brand z-10"
          style={{
            width: s.orb,
            height: s.orb,
          }}
          animate={{
            boxShadow: [
              '0 0 12px oklch(0.72 0.22 280 / 0.50), 0 0 32px oklch(0.72 0.22 280 / 0.20)',
              '0 0 24px oklch(0.72 0.22 280 / 0.80), 0 0 60px oklch(0.72 0.22 280 / 0.35), 0 0 80px oklch(0.80 0.16 195 / 0.15)',
              '0 0 12px oklch(0.72 0.22 280 / 0.50), 0 0 32px oklch(0.72 0.22 280 / 0.20)',
            ],
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Inner orb shine */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, oklch(1 0 0 / 0.25) 0%, transparent 60%)',
            }}
          />
        </motion.div>
      </div>

      {/* Optional label */}
      {showLabel && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2"
        >
          <span className="text-xs font-medium text-muted-foreground tracking-wide">
            NexaAI is thinking
          </span>
          <span className="flex gap-0.5 items-end">
            <span
              className="block w-1 h-1 rounded-full bg-brand animate-dot-wave-1"
            />
            <span
              className="block w-1 h-1 rounded-full bg-brand animate-dot-wave-2"
            />
            <span
              className="block w-1 h-1 rounded-full bg-brand animate-dot-wave-3"
            />
          </span>
        </motion.div>
      )}
    </motion.div>
  )
}

/**
 * Compact inline version for use inside MessageBubble during empty streaming.
 * Renders just the 3-dot wave + a short label — no full orbital system.
 */
export function ThinkingDots({ className = '' }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`flex items-center gap-2.5 py-1 ${className}`}
    >
      <div className="relative flex items-center justify-center flex-shrink-0">
        {/* Mini orbital */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 28,
            height: 28,
            background: 'radial-gradient(circle, oklch(0.72 0.22 280 / 0.15) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div
          className="relative rounded-full gradient-brand"
          style={{
            width: 14,
            height: 14,
            boxShadow: '0 0 8px oklch(0.72 0.22 280 / 0.5)',
          }}
        />
      </div>
      <span className="flex gap-1 items-end">
        <span className="block w-1.5 h-1.5 rounded-full bg-brand/70 animate-dot-wave-1" />
        <span className="block w-1.5 h-1.5 rounded-full bg-brand/70 animate-dot-wave-2" />
        <span className="block w-1.5 h-1.5 rounded-full bg-brand/70 animate-dot-wave-3" />
      </span>
      <span className="text-xs text-muted-foreground/70 font-medium">Generating</span>
    </motion.div>
  )
}

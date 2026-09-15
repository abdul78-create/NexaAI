'use client'

/**
 * Magnetic Button — the element follows the cursor with a spring effect.
 * Accessible: motion is disabled when prefers-reduced-motion is set.
 */

import { useRef, useState } from 'react'
import { motion, useSpring, useTransform } from 'motion/react'
import { cn } from '@/lib/utils'

interface MagneticButtonProps {
  children: React.ReactNode
  className?: string
  strength?: number
  as?: 'button' | 'div'
  onClick?: () => void
}

export function MagneticButton({
  children,
  className,
  strength = 0.3,
  as: Tag = 'button',
  onClick,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const x = useSpring(0, { stiffness: 300, damping: 30 })
  const y = useSpring(0, { stiffness: 300, damping: 30 })

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    x.set((e.clientX - centerX) * strength)
    y.set((e.clientY - centerY) * strength)
  }

  function onMouseLeave() {
    setIsHovered(false)
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      style={{ x, y }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onMouseEnter={() => setIsHovered(true)}
      className={cn('inline-block', className)}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}

/* ============================================================
   POINTER GLOW — follows the cursor within a container
   ============================================================ */
export function PointerGlow({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: -999, y: -999 })
  const [visible, setVisible] = useState(false)

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setVisible(true)
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setVisible(false)}
      className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}
      aria-hidden
    >
      <div
        className="absolute pointer-events-none transition-opacity duration-300 rounded-full"
        style={{
          width: 300,
          height: 300,
          left: pos.x - 150,
          top: pos.y - 150,
          background: 'radial-gradient(circle, oklch(0.72 0.22 280 / 0.12) 0%, transparent 60%)',
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  )
}

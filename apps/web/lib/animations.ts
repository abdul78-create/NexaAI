/**
 * NexaAI — Animation System
 * Centralized Motion for React variants, easing, and durations.
 * Import from this file — never define ad-hoc animations in components.
 */

import type { Variants, Transition } from 'motion/react'

/* ============================================================
   EASING CURVES
   ============================================================ */
export const ease = {
  standard:   [0.4, 0, 0.2, 1]  as const,
  decelerate: [0, 0, 0.2, 1]    as const,
  accelerate: [0.4, 0, 1, 1]    as const,
  spring:     [0.34, 1.56, 0.64, 1] as const,
  smooth:     [0.25, 0.46, 0.45, 0.94] as const,
} satisfies Record<string, readonly number[]>

/* ============================================================
   SHARED TRANSITIONS
   ============================================================ */
export const transition = {
  fast:   { duration: 0.1, ease: ease.standard } satisfies Transition,
  normal: { duration: 0.2, ease: ease.standard } satisfies Transition,
  slow:   { duration: 0.35, ease: ease.decelerate } satisfies Transition,
  spring: { type: 'spring', stiffness: 300, damping: 30 } satisfies Transition,
  springBouncy: { type: 'spring', stiffness: 260, damping: 20 } satisfies Transition,
}

/* ============================================================
   PAGE TRANSITION
   ============================================================ */
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: ease.decelerate },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2, ease: ease.accelerate },
  },
}

/* ============================================================
   FADE UP — default entrance for sections and cards
   ============================================================ */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: ease.decelerate },
  },
}

export const fadeUpFast: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: ease.decelerate },
  },
}

/* ============================================================
   FADE IN — simple opacity entrance
   ============================================================ */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: ease.standard },
  },
}

/* ============================================================
   SCALE IN — for modals, popovers, dropdowns
   ============================================================ */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: ease.spring },
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    transition: { duration: 0.15, ease: ease.accelerate },
  },
}

export const scaleInSpring: Variants = {
  hidden: { opacity: 0, scale: 0.88 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transition.springBouncy,
  },
}

/* ============================================================
   SLIDE IN — directional entrances
   ============================================================ */
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: ease.decelerate },
  },
  exit: {
    opacity: 0,
    x: -24,
    transition: { duration: 0.2, ease: ease.accelerate },
  },
}

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: ease.decelerate },
  },
  exit: {
    opacity: 0,
    x: 24,
    transition: { duration: 0.2, ease: ease.accelerate },
  },
}

export const slideInBottom: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: ease.decelerate },
  },
  exit: {
    opacity: 0,
    y: 40,
    transition: { duration: 0.2, ease: ease.accelerate },
  },
}

/* ============================================================
   STAGGER CONTAINER — orchestrates children with delay
   ============================================================ */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
}

export const staggerContainerFast: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
}

export const staggerContainerSlow: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
}

/* ============================================================
   STAGGER ITEM — child of stagger container
   ============================================================ */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: ease.decelerate },
  },
}

export const staggerItemFade: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: ease.standard },
  },
}

/* ============================================================
   HERO TEXT — staggered word reveal
   ============================================================ */
export const heroContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.2,
    },
  },
}

export const heroWord: Variants = {
  hidden: { opacity: 0, y: 40, rotateX: -15 },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { duration: 0.6, ease: ease.decelerate },
  },
}

/* ============================================================
   MODAL / OVERLAY
   ============================================================ */
export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.25, ease: ease.decelerate },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 16,
    transition: { duration: 0.18, ease: ease.accelerate },
  },
}

/* ============================================================
   SIDEBAR
   ============================================================ */
export const sidebarVariants: Variants = {
  open: {
    x: 0,
    transition: { duration: 0.3, ease: ease.decelerate },
  },
  closed: {
    x: '-100%',
    transition: { duration: 0.25, ease: ease.accelerate },
  },
}

/* ============================================================
   HOVER / TAP INTERACTIONS
   ============================================================ */
export const hoverScale = {
  whileHover: { scale: 1.02 },
  whileTap:   { scale: 0.97 },
  transition: transition.fast,
}

export const hoverLift = {
  whileHover: { y: -2, transition: transition.fast },
  whileTap:   { y: 0 },
}

export const hoverGlow = {
  whileHover: {
    boxShadow: '0 0 20px oklch(0.72 0.22 280 / 0.30)',
    transition: transition.normal,
  },
}

/* ============================================================
   ANIMATED BORDER / GRADIENT ROTATION
   ============================================================ */
export const spinAnimation = {
  animate: { rotate: 360 },
  transition: {
    duration: 8,
    repeat: Infinity,
    ease: 'linear' as const,
  },
}

/* ============================================================
   TYPING / PULSE — for AI thinking indicator
   ============================================================ */
export const pulseVariants: Variants = {
  idle: { scale: 1, opacity: 0.6 },
  active: {
    scale: [1, 1.15, 1],
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 1.4,
      repeat: Infinity,
      ease: ease.smooth,
    },
  },
}

/* ============================================================
   ORBIT — decorative rotating element
   ============================================================ */
export const orbitVariants = {
  animate: {
    rotate: [0, 360],
    transition: {
      duration: 20,
      repeat: Infinity,
      ease: 'linear' as const,
    },
  },
}

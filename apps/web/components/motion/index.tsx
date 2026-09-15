'use client'

/**
 * Reusable Motion components.
 * These are client components that wrap Motion for React's motion elements
 * with our centralized animation variants.
 *
 * Usage:
 *   <FadeUp>
 *     <Card />
 *   </FadeUp>
 *
 *   <Stagger>
 *     <StaggerItem><Card /></StaggerItem>
 *     <StaggerItem><Card /></StaggerItem>
 *   </Stagger>
 */

import { motion, type HTMLMotionProps } from 'motion/react'
import {
  fadeUp,
  fadeIn,
  scaleIn,
  scaleInSpring,
  staggerContainer,
  staggerContainerFast,
  staggerContainerSlow,
  staggerItem,
  staggerItemFade,
  slideInLeft,
  slideInRight,
  slideInBottom,
  pageVariants,
} from '@/lib/animations'

type DivProps = HTMLMotionProps<'div'>

/* ============================================================
   PAGE WRAPPER
   ============================================================ */
export function PageTransition({ children, className, ...props }: DivProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/* ============================================================
   FADE UP
   ============================================================ */
interface FadeUpProps extends DivProps {
  delay?: number
}

export function FadeUp({ children, className, delay = 0, ...props }: FadeUpProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/* ============================================================
   FADE IN
   ============================================================ */
export function FadeIn({ children, className, ...props }: DivProps) {
  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/* ============================================================
   SCALE IN
   ============================================================ */
export function ScaleIn({ children, className, ...props }: DivProps) {
  return (
    <motion.div
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function ScaleInView({ children, className, ...props }: DivProps) {
  return (
    <motion.div
      variants={scaleInSpring}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/* ============================================================
   SLIDE IN
   ============================================================ */
export function SlideInLeft({ children, className, ...props }: DivProps) {
  return (
    <motion.div
      variants={slideInLeft}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function SlideInRight({ children, className, ...props }: DivProps) {
  return (
    <motion.div
      variants={slideInRight}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function SlideInBottom({ children, className, ...props }: DivProps) {
  return (
    <motion.div
      variants={slideInBottom}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/* ============================================================
   STAGGER CONTAINER + ITEM
   ============================================================ */
interface StaggerProps extends DivProps {
  speed?: 'fast' | 'normal' | 'slow'
}

export function Stagger({ children, className, speed = 'normal', ...props }: StaggerProps) {
  const variants =
    speed === 'fast'
      ? staggerContainerFast
      : speed === 'slow'
        ? staggerContainerSlow
        : staggerContainer

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface StaggerItemProps extends DivProps {
  fade?: boolean
}

export function StaggerItem({ children, className, fade = false, ...props }: StaggerItemProps) {
  return (
    <motion.div
      variants={fade ? staggerItemFade : staggerItem}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/* ============================================================
   HOVER CARD — subtle lift on hover
   ============================================================ */
export function HoverCard({ children, className, ...props }: DivProps) {
  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.98 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/* ============================================================
   ANIMATED NUMBER — counts up to a value
   ============================================================ */
export function MotionSpan({ children, className, ...props }: HTMLMotionProps<'span'>) {
  return (
    <motion.span className={className} {...props}>
      {children}
    </motion.span>
  )
}

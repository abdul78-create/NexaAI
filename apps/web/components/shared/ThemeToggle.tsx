'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="Toggle theme"
      className="relative size-9 rounded-lg"
    >
      <motion.div
        key={theme}
        initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-center"
      >
        {theme === 'dark' ? (
          <Moon className="size-4" />
        ) : (
          <Sun className="size-4" />
        )}
      </motion.div>
    </Button>
  )
}

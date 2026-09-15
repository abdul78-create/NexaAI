'use client'

import { ThemeProvider } from 'next-themes'
import { TooltipProvider } from '@/components/ui/tooltip'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange={false}
    >
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </ThemeProvider>
  )
}

import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'NexaAI — Premium AI Platform',
    template: '%s | NexaAI',
  },
  description:
    'NexaAI is a premium AI conversational platform with intelligent chat, NLP-powered analysis, and document intelligence.',
  keywords: [
    'AI chat',
    'NLP',
    'document intelligence',
    'artificial intelligence',
    'conversational AI',
  ],
  authors: [{ name: 'NexaAI' }],
  openGraph: {
    type: 'website',
    title: 'NexaAI — Premium AI Platform',
    description: 'A premium AI conversational platform with intelligent chat and NLP analysis.',
    siteName: 'NexaAI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NexaAI — Premium AI Platform',
    description: 'A premium AI conversational platform with intelligent chat and NLP analysis.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

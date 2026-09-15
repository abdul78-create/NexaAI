/**
 * NexaAI site-wide configuration constants.
 * Import from here for consistent branding and URLs.
 */

export const siteConfig = {
  name: 'NexaAI',
  tagline: 'Premium AI Platform',
  description:
    'A full-stack AI conversational platform combining intelligent chat, NLP-powered text analysis, and document intelligence.',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000',

  nav: {
    main: [
      { label: 'Features', href: '#features' },
      { label: 'NLP Studio', href: '#nlp-studio' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Docs', href: '/docs' },
    ],
  },

  social: {
    twitter: 'https://twitter.com/nexaai',
    github: 'https://github.com/nexaai',
  },
} as const

export type SiteConfig = typeof siteConfig

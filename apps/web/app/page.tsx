import { redirect } from 'next/navigation'

/**
 * Root page — redirects to the marketing landing page.
 * The actual landing page is rendered by app/(marketing)/page.tsx.
 */
export default function RootPage() {
  redirect('/')
}

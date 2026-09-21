import { NextRequest, NextResponse } from 'next/server'

/**
 * Resolves a trusted, public application origin for OAuth redirects.
 *
 * Prevents container-internal bind host leakage (e.g. 0.0.0.0:10000)
 * and open redirect vulnerabilities.
 */
export function resolvePublicOrigin(request: NextRequest): string {
  // 1. Highest priority: explicit production/staging environment configuration
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      const parsed = new URL(process.env.NEXT_PUBLIC_APP_URL)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.origin
      }
    } catch {
      // Invalid NEXT_PUBLIC_APP_URL format, fall through to header inspection
    }
  }

  // 2. Reverse proxy headers (e.g. Cloudflare / Nginx / Load Balancer)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  const rawHost = forwardedHost || request.headers.get('host')

  if (rawHost) {
    const host = rawHost.trim()
    const validHostRegex = /^[a-zA-Z0-9.\-]+(?::\d+)?$/
    if (validHostRegex.test(host)) {
      // Strictly avoid unrouteable container listener addresses
      if (!host.startsWith('0.0.0.0')) {
        const proto = forwardedProto === 'http' ? 'http' : 'https'
        return `${proto}://${host}`
      }
    }
  }

  // 3. Next.js internal URL fallback (sanitized if 0.0.0.0)
  const nextOrigin = request.nextUrl?.origin
  if (nextOrigin && !nextOrigin.includes('0.0.0.0')) {
    return nextOrigin
  }

  // 4. Default safe fallback
  return 'http://localhost:3000'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const origin = resolvePublicOrigin(request)
  const targetUrl = new URL('/oauth/callback', origin)
  targetUrl.searchParams.set('provider', provider)

  if (code) targetUrl.searchParams.set('code', code)
  if (state) targetUrl.searchParams.set('state', state)
  if (error) targetUrl.searchParams.set('error', error)
  if (errorDescription) targetUrl.searchParams.set('error_description', errorDescription)

  return NextResponse.redirect(targetUrl)
}

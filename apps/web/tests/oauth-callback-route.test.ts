import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { GET, resolvePublicOrigin } from '../app/api/auth/callback/[provider]/route'

describe('OAuth Callback Route Origin & Parameter Regression Tests', () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL
    }
  })

  it('1. Resolves NEXT_PUBLIC_APP_URL as authoritative origin over container 0.0.0.0:10000', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.nexaai.com'

    const req = new NextRequest('http://0.0.0.0:10000/api/auth/callback/google?code=abc', {
      headers: {
        host: '0.0.0.0:10000',
      },
    })

    const origin = resolvePublicOrigin(req)
    assert.equal(origin, 'https://app.nexaai.com')
    assert.doesNotMatch(origin, /0\.0\.0\.0/)
    assert.doesNotMatch(origin, /10000/)
    assert.doesNotMatch(origin, /onrender\.com/)
  })

  it('2. Google callback redirects to public domain with all parameters preserved', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.nexaai.com'

    const req = new NextRequest(
      'http://0.0.0.0:10000/api/auth/callback/google?code=google-test-code-123&state=google.nonce.123.sig',
      {
        headers: { host: '0.0.0.0:10000' },
      }
    )

    const response = await GET(req, { params: Promise.resolve({ provider: 'google' }) })
    assert.equal(response.status, 307)

    const location = response.headers.get('location')
    assert.ok(location, 'Location header must be present')

    const parsed = new URL(location)
    assert.equal(parsed.origin, 'https://app.nexaai.com')
    assert.equal(parsed.pathname, '/oauth/callback')
    assert.equal(parsed.searchParams.get('provider'), 'google')
    assert.equal(parsed.searchParams.get('code'), 'google-test-code-123')
    assert.equal(parsed.searchParams.get('state'), 'google.nonce.123.sig')

    assert.doesNotMatch(location, /0\.0\.0\.0/)
    assert.doesNotMatch(location, /:10000/)
    assert.doesNotMatch(location, /onrender\.com/)
  })

  it('3. GitHub callback redirects to public domain with all parameters preserved', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.nexaai.com'

    const req = new NextRequest(
      'http://0.0.0.0:10000/api/auth/callback/github?code=github-test-code-456&state=github.nonce.456.sig',
      {
        headers: { host: '0.0.0.0:10000' },
      }
    )

    const response = await GET(req, { params: Promise.resolve({ provider: 'github' }) })
    assert.equal(response.status, 307)

    const location = response.headers.get('location')
    assert.ok(location, 'Location header must be present')

    const parsed = new URL(location)
    assert.equal(parsed.origin, 'https://app.nexaai.com')
    assert.equal(parsed.pathname, '/oauth/callback')
    assert.equal(parsed.searchParams.get('provider'), 'github')
    assert.equal(parsed.searchParams.get('code'), 'github-test-code-456')
    assert.equal(parsed.searchParams.get('state'), 'github.nonce.456.sig')

    assert.doesNotMatch(location, /0\.0\.0\.0/)
    assert.doesNotMatch(location, /onrender\.com/)
  })

  it('4. Preserves error and error_description when OAuth is denied/cancelled', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.nexaai.com'

    const req = new NextRequest(
      'http://0.0.0.0:10000/api/auth/callback/google?error=access_denied&error_description=User+cancelled+authentication',
      {
        headers: { host: '0.0.0.0:10000' },
      }
    )

    const response = await GET(req, { params: Promise.resolve({ provider: 'google' }) })
    const location = response.headers.get('location')!
    const parsed = new URL(location)

    assert.equal(parsed.origin, 'https://app.nexaai.com')
    assert.equal(parsed.searchParams.get('error'), 'access_denied')
    assert.equal(parsed.searchParams.get('error_description'), 'User cancelled authentication')
    assert.doesNotMatch(location, /onrender\.com/)
  })

  it('5. Fallback without NEXT_PUBLIC_APP_URL uses safe reverse proxy headers', () => {
    delete process.env.NEXT_PUBLIC_APP_URL

    const req = new NextRequest('http://0.0.0.0:10000/api/auth/callback/google', {
      headers: {
        'x-forwarded-host': 'app.nexaai.com',
        'x-forwarded-proto': 'https',
      },
    })

    const origin = resolvePublicOrigin(req)
    assert.equal(origin, 'https://app.nexaai.com')
    assert.doesNotMatch(origin, /onrender\.com/)
  })

  it('6. Rejects 0.0.0.0 and does NOT fall back to Render URL', () => {
    delete process.env.NEXT_PUBLIC_APP_URL

    const req = new NextRequest('http://0.0.0.0:10000/api/auth/callback/google', {
      headers: {
        host: '0.0.0.0:10000',
      },
    })

    const origin = resolvePublicOrigin(req)
    assert.doesNotMatch(origin, /0\.0\.0\.0/)
    assert.doesNotMatch(origin, /onrender\.com/)
    assert.doesNotMatch(origin, /render\.com/)
    assert.equal(origin, 'http://localhost:3000')
  })

  it('7. Confirms resolution never yields any Render URLs under any fallback condition', () => {
    delete process.env.NEXT_PUBLIC_APP_URL

    const fallbackReq = new NextRequest('http://0.0.0.0:10000/api/auth/callback/google')
    const fallbackOrigin = resolvePublicOrigin(fallbackReq)
    assert.doesNotMatch(fallbackOrigin, /onrender\.com/)
    assert.doesNotMatch(fallbackOrigin, /render\.com/)
    assert.equal(fallbackOrigin, 'http://localhost:3000')
  })

  it('8. Confirms production environment falls back safely to production frontend', () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    const env = process.env as Record<string, string | undefined>
    const originalNodeEnv = env.NODE_ENV
    env.NODE_ENV = 'production'
    try {
      const fallbackReq = new NextRequest('http://0.0.0.0:10000/api/auth/callback/google')
      const fallbackOrigin = resolvePublicOrigin(fallbackReq)
      assert.equal(fallbackOrigin, 'https://nexaai-frontend-1yi2.onrender.com')
    } finally {
      env.NODE_ENV = originalNodeEnv
    }
  })
})

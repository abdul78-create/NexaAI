import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { getApiBaseUrl } from '../lib/api-config.ts'

describe('API Configuration (getApiBaseUrl) Tests', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Clear relevant environment variables before each test
    delete process.env.NEXT_PUBLIC_API_URL
    delete process.env.INTERNAL_API_URL
  })

  afterEach(() => {
    // Restore original environment and clean up global window
    process.env = { ...originalEnv }
    delete (globalThis as unknown as { window?: unknown }).window
  })

  it('1. Returns relative "/api/v1" in browser context even if NEXT_PUBLIC_API_URL is configured', () => {
    // Simulate browser environment where window is defined
    ;(globalThis as unknown as { window?: unknown }).window = {}
    process.env.NEXT_PUBLIC_API_URL = 'https://nexaai-backend-4uqm.onrender.com/api/v1'

    const url = getApiBaseUrl()
    assert.equal(url, '/api/v1', 'Browser context must always use same-origin /api/v1 proxy')
  })

  it('2. Returns relative "/api/v1" in browser context when no environment variable is set', () => {
    ;(globalThis as unknown as { window?: unknown }).window = {}

    const url = getApiBaseUrl()
    assert.equal(url, '/api/v1', 'Browser context must return /api/v1 by default')
  })

  it('3. Returns configured NEXT_PUBLIC_API_URL in server context (window undefined)', () => {
    // Ensure window is undefined (server context)
    delete (globalThis as unknown as { window?: unknown }).window
    process.env.NEXT_PUBLIC_API_URL = 'https://nexaai-backend-4uqm.onrender.com/api/v1'

    const url = getApiBaseUrl()
    assert.equal(url, 'https://nexaai-backend-4uqm.onrender.com/api/v1')
  })

  it('4. Normalizes NEXT_PUBLIC_API_URL by appending /api/v1 if omitted in server context', () => {
    delete (globalThis as unknown as { window?: unknown }).window
    process.env.NEXT_PUBLIC_API_URL = 'https://nexaai-backend-4uqm.onrender.com'

    const url = getApiBaseUrl()
    assert.equal(url, 'https://nexaai-backend-4uqm.onrender.com/api/v1')
  })

  it('5. Strips trailing slashes from NEXT_PUBLIC_API_URL in server context', () => {
    delete (globalThis as unknown as { window?: unknown }).window
    process.env.NEXT_PUBLIC_API_URL = 'https://nexaai-backend-4uqm.onrender.com/api/v1///'

    const url = getApiBaseUrl()
    assert.equal(url, 'https://nexaai-backend-4uqm.onrender.com/api/v1')
  })

  it('6. Uses INTERNAL_API_URL in server context when NEXT_PUBLIC_API_URL is unset', () => {
    delete (globalThis as unknown as { window?: unknown }).window
    process.env.INTERNAL_API_URL = 'http://backend-internal:8000'

    const url = getApiBaseUrl()
    assert.equal(url, 'http://backend-internal:8000/api/v1')
  })

  it('7. Falls back to default http://localhost:8000/api/v1 in server context when no env is set', () => {
    delete (globalThis as unknown as { window?: unknown }).window

    const url = getApiBaseUrl()
    assert.equal(url, 'http://localhost:8000/api/v1')
  })
})

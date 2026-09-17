import { NextRequest, NextResponse } from 'next/server'

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

  const targetUrl = new URL('/oauth/callback', request.url)
  targetUrl.searchParams.set('provider', provider)

  if (code) targetUrl.searchParams.set('code', code)
  if (state) targetUrl.searchParams.set('state', state)
  if (error) targetUrl.searchParams.set('error', error)
  if (errorDescription) targetUrl.searchParams.set('error_description', errorDescription)

  return NextResponse.redirect(targetUrl)
}

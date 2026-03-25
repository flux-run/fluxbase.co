import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Lazy initialization to prevent build-time crashes when env vars are missing
const getSupabase = () => {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  if (!supabase) {
    console.error('[waitlist] Supabase environment variables missing')
    return NextResponse.json({ error: 'Database configuration missing' }, { status: 500 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { email, source } = body as { email?: unknown; source?: unknown }

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  const { error } = await supabase
    .from('waitlist')
    .insert({
      email: email.toLowerCase().trim(),
      source: typeof source === 'string' ? source : 'website',
    })

  if (error) {
    // Postgres unique-violation code — email already registered
    if (error.code === '23505') {
      return NextResponse.json({ error: 'already_registered' }, { status: 409 })
    }
    console.error('[waitlist] supabase error:', error.message)
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

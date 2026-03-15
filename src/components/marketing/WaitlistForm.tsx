'use client'

import { useState } from 'react'

type State = 'idle' | 'loading' | 'success' | 'duplicate' | 'error'

export function WaitlistForm({ source = 'website' }: { source?: string }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })
      if (res.ok) {
        setState('success')
      } else if (res.status === 409) {
        setState('duplicate')
      } else {
        setState('error')
      }
    } catch {
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div style={{
        padding: '20px 24px',
        border: '1px solid rgba(34,197,94,.35)',
        borderRadius: 10,
        background: 'rgba(34,197,94,.06)',
        maxWidth: 480,
      }}>
        <p style={{ fontWeight: 700, color: 'var(--mg-green)', marginBottom: 4, margin: '0 0 4px' }}>
          You&apos;re on the list ✓
        </p>
        <p style={{ fontSize: '.85rem', color: 'var(--mg-muted)', margin: 0 }}>
          We&apos;ll email you when the stable CLI release is ready.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@company.com"
          disabled={state === 'loading'}
          style={{
            flex: 1,
            padding: '9px 14px',
            background: 'var(--mg-bg-elevated)',
            border: '1px solid var(--mg-border)',
            borderRadius: 7,
            color: 'var(--mg-text)',
            fontSize: '.88rem',
            outline: 'none',
            minWidth: 0,
          }}
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          style={{
            padding: '9px 18px',
            background: 'var(--mg-accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 7,
            fontWeight: 600,
            fontSize: '.88rem',
            cursor: state === 'loading' ? 'not-allowed' : 'pointer',
            opacity: state === 'loading' ? 0.7 : 1,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {state === 'loading' ? 'Joining…' : 'Join Waitlist'}
        </button>
      </div>
      {state === 'duplicate' && (
        <p style={{ fontSize: '.82rem', color: 'var(--mg-muted)', margin: 0 }}>
          That email is already on the list.
        </p>
      )}
      {state === 'error' && (
        <p style={{ fontSize: '.82rem', color: 'var(--mg-red)', margin: 0 }}>
          Something went wrong — please try again.
        </p>
      )}
      <p style={{ fontSize: '.78rem', color: 'var(--mg-muted)', margin: 0 }}>
        No spam. One email when stable v1 ships.
      </p>
    </form>
  )
}

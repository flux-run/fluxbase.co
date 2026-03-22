'use client'

import Link from 'next/link'
import { useRef, useEffect } from 'react'
import { CopyCodeBlocks } from '@/components/CopyCodeBlocks'

const COMMANDS = [
  { cmd: 'flux why',    arg: '<id>', desc: 'understand what failed and why'     },
  { cmd: 'flux replay', arg: '<id>', desc: 'test your fix safely, no real IO'   },
  { cmd: 'flux resume', arg: '<id>', desc: 'apply the fix with real IO'          },
]

export default function HomePage() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.play().catch(() => {
      const overlay = document.getElementById('play-overlay')
      if (overlay) overlay.style.display = 'flex'
    })
  }, [])

  return (
    <div style={{ background: '#0a0a0a', color: '#f0f0f0', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <CopyCodeBlocks />

      {/* ── Nav ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky', top: 0, background: 'rgba(10,10,10,0.92)',
        backdropFilter: 'blur(12px)', zIndex: 100,
      }}>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>flux</span>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link href="/docs" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '.88rem', textDecoration: 'none' }}>Docs</Link>
          <Link href="https://github.com/flux-run/flux" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '.88rem', textDecoration: 'none' }}>GitHub</Link>
          <Link href="/docs/quickstart" style={{
            background: '#fff', color: '#000', fontSize: '.82rem', fontWeight: 600,
            padding: '7px 16px', borderRadius: 6, textDecoration: 'none',
          }}>Get Started →</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>

        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 700,
          lineHeight: 1.15, letterSpacing: '-0.03em',
          marginBottom: 20, color: '#fff',
        }}>
          What if you could replay<br />
          production API failures locally?
        </h1>

        <p style={{
          fontSize: 'clamp(.95rem, 2vw, 1.1rem)',
          color: 'rgba(255,255,255,0.55)',
          maxWidth: 520, margin: '0 auto 16px',
          lineHeight: 1.6,
        }}>
          Replay production failures locally. Fix them. Resume execution.
        </p>

        <p style={{
          fontSize: '.88rem',
          color: 'rgba(255,255,255,0.3)',
          maxWidth: 480, margin: '0 auto 48px',
          lineHeight: 1.6,
        }}>
          Every request is recorded — inputs, outputs, and external calls.
        </p>

        {/* Video cue */}
        <p style={{
          fontSize: '.82rem', color: 'rgba(255,255,255,0.3)',
          marginBottom: 16, letterSpacing: '.01em',
        }}>
          Watch a real debugging session ↓
        </p>

        {/* ── Video ── */}
        <div style={{
          position: 'relative',
          borderRadius: 12, overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
          background: '#111',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          marginBottom: 48,
        }}>
          <div id="play-overlay" style={{
            display: 'none', position: 'absolute', inset: 0,
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)', zIndex: 10, cursor: 'pointer',
          }} onClick={() => videoRef.current?.play()}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(255,255,255,0.9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 24, marginLeft: 4 }}>▶</span>
            </div>
          </div>

          <video
            ref={videoRef}
            src="/flux_demo.mp4"
            muted
            loop
            playsInline
            controls
            preload="metadata"
            style={{ width: '100%', display: 'block', maxHeight: '60vh', objectFit: 'contain' }}
          />
        </div>

        {/* ── CLI Block ── */}
        <p style={{
          fontSize: '.78rem',
          color: 'rgba(255,255,255,0.25)',
          textTransform: 'uppercase',
          letterSpacing: '.1em',
          marginBottom: 14,
          fontFamily: 'monospace',
        }}>
          The debugging loop:
        </p>
        <div style={{
          background: '#0d0d0d',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, overflow: 'hidden',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 16px 48px rgba(0,0,0,0.4)',
          marginBottom: 64, textAlign: 'left',
        }}>
          {/* Toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '14px 18px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: '#111',
          }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
            <span style={{ marginLeft: 8, fontSize: '.72rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>flux — bash</span>
          </div>

          <div style={{ padding: '28px 28px 32px', fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace', fontSize: '.88rem', lineHeight: 2.1 }}>
            {COMMANDS.map(({ cmd, arg, desc }) => (
              <div key={cmd} style={{ display: 'flex', alignItems: 'baseline', gap: 0, marginBottom: 4 }}>
                <span style={{ color: 'rgba(255,255,255,0.25)', userSelect: 'none', marginRight: 10 }}>$</span>
                <span style={{ color: '#7dd3fc', minWidth: 120 }}>{cmd}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>{arg}</span>
                <span style={{ color: 'rgba(255,255,255,0.2)', marginLeft: 24, fontSize: '.78rem' }}>— {desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Quote ── */}
        <blockquote style={{
          fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
          fontStyle: 'italic',
          color: 'rgba(255,255,255,0.3)',
          fontWeight: 400,
          margin: '0 0 64px',
          letterSpacing: '-0.01em',
        }}>
          &ldquo;Debugging should be deterministic, not guesswork.&rdquo;
        </blockquote>

        {/* ── Install ── */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 14,
          background: '#111',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.4)',
          borderRadius: 8, padding: '16px 32px',
          fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: '1rem',
          color: 'rgba(255,255,255,0.75)',
          cursor: 'text',
          marginBottom: 64,
        }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', userSelect: 'none' }}>$</span>
          <span style={{ userSelect: 'all' }}>curl -fsSL https://fluxbase.co/install | bash</span>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        maxWidth: 900, margin: '0 auto', padding: '28px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <span style={{ fontSize: '.78rem', color: 'rgba(255,255,255,0.2)' }}>
          Built with Flux runtime
        </span>
        <Link href="https://github.com/flux-run/flux" style={{
          fontSize: '.78rem', color: 'rgba(255,255,255,0.3)',
          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          GitHub
        </Link>
      </footer>
    </div>
  )
}

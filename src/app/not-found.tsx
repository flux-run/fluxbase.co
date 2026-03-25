import Link from 'next/link'
import { FluxIcon } from '@/components/FluxLogo'

export default function NotFound() {
  return (
    <div className="marketing flex flex-col items-center justify-center p-6 text-center">
      <div style={{
        maxWidth: 500,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
      }}>
      <Link href="/" style={{ textDecoration: 'none', marginBottom: 8, opacity: 0.8, transition: 'opacity .15s' }}>
        <span style={{ fontWeight: 700, fontSize: '1.2rem', letterSpacing: '-0.04em', color: '#fff' }}>flux</span>
      </Link>

      <div>
        <div style={{ fontSize: '4rem', fontWeight: 800, lineHeight: 1, color: 'var(--mg-muted)', letterSpacing: '-0.04em' }}>
          404
        </div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '12px 0 8px', color: 'var(--mg-text)' }}>
          Page not found
        </h1>
        <p style={{ fontSize: '.925rem', color: 'var(--mg-muted)', maxWidth: 340 }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/" style={{
          background: 'var(--mg-accent)',
          color: '#fff',
          fontSize: '.875rem', fontWeight: 600,
          padding: '8px 18px', borderRadius: 7,
          textDecoration: 'none',
        }}>
          Go home
        </Link>
        <Link href="/docs" style={{
          background: 'var(--mg-bg-elevated)',
          border: '1px solid var(--mg-border)',
          color: 'var(--mg-text)',
          fontSize: '.875rem', fontWeight: 500,
          padding: '8px 18px', borderRadius: 7,
          textDecoration: 'none',
        }}>
          Browse docs
        </Link>
      </div>
      </div>
    </div>
  )
}

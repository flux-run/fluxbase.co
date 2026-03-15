import Link from 'next/link'
import { FluxIcon } from '@/components/FluxLogo'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      background: 'var(--mg-bg)',
      color: 'var(--mg-text)',
      fontFamily: 'var(--font-geist-sans), -apple-system, sans-serif',
      padding: '0 24px',
      textAlign: 'center',
    }}>
      <FluxIcon size={40} />

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
  )
}

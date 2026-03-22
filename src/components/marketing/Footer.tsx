import Link from 'next/link'

export function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--mg-border)',
      padding: '24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 12,
      fontSize: '.82rem',
      color: 'var(--mg-muted)',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.25)' }}>flux</span>
        <span style={{ marginLeft: 4 }}>© 2026</span>
      </span>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {[
          { href: '/docs',             label: 'Docs'       },
          { href: '/docs/quickstart',  label: 'Quickstart' },
          { href: '/docs/cli',         label: 'CLI'        },
          { href: 'https://github.com/flux-run/flux', label: 'GitHub' },
        ].map(({ href, label }) => (
          <Link key={href} href={href} style={{ color: 'var(--mg-muted)', textDecoration: 'none' }}>
            {label}
          </Link>
        ))}
      </div>
    </footer>
  )
}

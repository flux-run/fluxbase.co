'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLatestVersion } from '@/lib/use-latest-version'

const NAV = [
  {
    title: 'Getting Started',
    links: [
      { href: '/docs',              label: 'Introduction'   },
      { href: '/docs/install',      label: 'Install'        },
      { href: '/docs/quickstart',   label: 'Quickstart'     },
    ],
  },
  {
    title: 'CLI Commands',
    links: [
      { href: '/docs/cli',          label: 'CLI Reference'  },
    ],
  },
  {
    title: 'Runtime',
    links: [
      { href: '/docs/compatibility', label: 'Compatibility' },
      { href: '/docs/architecture',  label: 'Architecture'  },
    ],
  },
]

export function DocsSidebar() {
  const pathname = usePathname()
  const version = useLatestVersion()

  const isActive = (href: string) =>
    href === '/docs' ? pathname === '/docs' : pathname === href

  return (
    <nav style={{
      width: 240,
      flexShrink: 0,
      position: 'fixed',
      top: 56,
      left: 0,
      bottom: 0,
      overflowY: 'auto',
      padding: '28px 0 48px',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      background: '#0a0a0a',
    }}>
      <div style={{ padding: '0 16px', marginBottom: 28 }} title="Search coming soon">
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px',
          fontSize: '.8rem',
          background: 'var(--mg-bg)',
          border: '1px solid var(--mg-border)',
          borderRadius: 6,
          color: 'var(--mg-muted)',
          cursor: 'default',
          userSelect: 'none',
        }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.099zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
          </svg>
          <span>Search</span>
          <span style={{ marginLeft: 'auto', fontSize: '.65rem', padding: '1px 5px', borderRadius: 4, background: 'var(--mg-bg-elevated)', border: '1px solid var(--mg-border)' }}>
            coming soon
          </span>
        </div>
      </div>

      {NAV.map((group) => (
        <div key={group.title} style={{ marginBottom: 28, padding: '0 16px' }}>
          <div style={{
            fontSize: '.68rem',
            fontWeight: 700,
            letterSpacing: '.09em',
            textTransform: 'uppercase',
            color: 'var(--mg-muted)',
            marginBottom: 8,
            padding: '0 8px',
          }}>
            {group.title}
          </div>
          {group.links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: 'block',
                padding: '5px 8px',
                fontSize: '.875rem',
                borderRadius: 5,
                textDecoration: 'none',
                transition: 'background .12s, color .12s',
                color: isActive(href) ? 'var(--mg-text)' : 'var(--mg-muted)',
                background: isActive(href) ? 'var(--mg-accent-dim)' : 'transparent',
                fontWeight: isActive(href) ? 500 : 400,
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      ))}
      <div style={{ padding: '16px 24px', borderTop: '1px solid var(--mg-border)', marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: '.68rem', fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--mg-muted)' }}>
            Community
          </div>
          {version && (
            <Link
              href="https://github.com/flux-run/flux/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '.68rem', fontWeight: 600, padding: '1px 6px', borderRadius: 99, background: 'rgba(255,255,255,0.07)', border: '1px solid var(--mg-border)', color: 'var(--mg-muted)', textDecoration: 'none' }}
            >
              {version}
            </Link>
          )}
        </div>
        <a
          href="https://github.com/flux-run/flux/issues/new?labels=bug&template=bug_report.yml"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', fontSize: '.875rem', color: 'var(--mg-muted)', textDecoration: 'none' }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
          </svg>
          Report a bug
        </a>
        <a
          href="https://github.com/flux-run/flux/compare"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', fontSize: '.875rem', color: 'var(--mg-muted)', textDecoration: 'none' }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354Z" />
          </svg>
          Open a pull request
        </a>
        <a
          href="https://github.com/flux-run/flux"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', fontSize: '.875rem', color: 'var(--mg-muted)', textDecoration: 'none' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12Z" />
          </svg>
          View on GitHub
        </a>
      </div>
    </nav>
  )
}

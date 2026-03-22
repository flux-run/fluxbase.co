'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FluxIcon, FluxWordmark } from '@/components/FluxLogo'
import { useLatestVersion } from '@/lib/use-latest-version'

function GitHubStarButton() {
  const [count, setCount] = useState<string | null>(null)

  useEffect(() => {
    fetch('https://api.github.com/repos/flux-run/flux')
      .then((r) => r.json())
      .then((d) => {
        const n: number = d.stargazers_count
        if (!n) return
        setCount(n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))
      })
      .catch(() => {})
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--mg-border)', fontSize: '.8rem', fontWeight: 500 }}>
      <Link
        href="https://github.com/flux-run/flux"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px',
          background: 'rgba(255,255,255,0.05)',
          color: 'var(--mg-muted)',
          textDecoration: 'none',
          transition: 'color .15s',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.873 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
        </svg>
        Star
      </Link>
      {count !== null && (
        <Link
          href="https://github.com/flux-run/flux/stargazers"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center',
            padding: '5px 8px',
            background: 'rgba(255,255,255,0.03)',
            borderLeft: '1px solid var(--mg-border)',
            color: 'var(--mg-muted)',
            textDecoration: 'none',
            transition: 'color .15s',
          }}
        >
          {count}
        </Link>
      )}
    </div>
  )
}

const links = [
  { href: '/docs',          label: 'Docs'          },
  { href: '/docs/cli',      label: 'CLI Reference'  },
  { href: '/docs/quickstart', label: 'Quickstart'   },
]

export function NavBar() {
  const pathname = usePathname()
  const version = useLatestVersion()

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: 56,
      display: 'flex', alignItems: 'center', gap: 32,
      padding: '0 24px',
      background: 'rgba(10,10,10,0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em', color: '#fff' }}>flux</span>
      </Link>
      {version && (
        <Link
          href="https://github.com/flux-run/flux/releases/latest"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '.7rem', fontWeight: 600,
            padding: '2px 7px', borderRadius: 99,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid var(--mg-border)',
            color: 'var(--mg-muted)',
            textDecoration: 'none',
            letterSpacing: '.02em',
            marginLeft: -16,
          }}
        >
          {version}
        </Link>
      )}

      <div style={{ display: 'flex', gap: 24 }}>
        {links.map(({ href, label }) => (
          <Link key={href} href={href} style={{
            color: pathname === href || (href !== '/' && pathname?.startsWith(href))
              ? 'var(--mg-text)'
              : 'var(--mg-muted)',
            fontSize: '.875rem',
            textDecoration: 'none',
            transition: 'color .15s',
          }}>
            {label}
          </Link>
        ))}
      </div>

      <div style={{ marginLeft: 'auto' }}>
        <GitHubStarButton />
      </div>
      <Link href="/docs/quickstart" style={{
        background: '#fff',
        color: '#000', fontSize: '.82rem', fontWeight: 600,
        padding: '7px 16px', borderRadius: 6,
        textDecoration: 'none',
      }}>
        Get Started →
      </Link>
    </nav>
  )
}

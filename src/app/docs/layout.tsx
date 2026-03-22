'use client'

import { useState, useEffect } from 'react'
import { NavBar } from '@/components/marketing/NavBar'
import { DocsSidebar } from '@/components/docs/DocsSidebar'
import { CopyCodeBlocks } from '@/components/CopyCodeBlocks'

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close sidebar on route change (navigation)
  useEffect(() => {
    setSidebarOpen(false)
  }, [children])

  return (
    <div className="marketing" style={{ minHeight: '100dvh' }}>
      <NavBar />
      <CopyCodeBlocks />

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 39,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Mobile top bar with hamburger */}
      <div className="docs-mobile-bar">
        <button
          aria-label="Open navigation"
          onClick={() => setSidebarOpen(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.6)', padding: '8px',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: '.85rem',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
          Menu
        </button>
      </div>

      <div style={{ display: 'flex', paddingTop: 56 }}>
        <DocsSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="docs-main">
          <div className="docs-content">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

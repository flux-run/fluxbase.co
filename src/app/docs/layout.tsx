import { NavBar } from '@/components/marketing/NavBar'
import { DocsSidebar } from '@/components/docs/DocsSidebar'

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing" style={{ minHeight: '100dvh' }}>
      <NavBar />

      <div style={{ display: 'flex', paddingTop: 56 }}>
        <DocsSidebar />

        <main style={{
          flex: 1,
          marginLeft: 240,
          padding: '48px 48px 80px',
          minWidth: 0,
        }}>
          <div className="docs-content">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

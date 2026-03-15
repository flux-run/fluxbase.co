import { NavBar } from './NavBar'
import { Footer } from './Footer'

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing">
      <NavBar />
      <div style={{ paddingTop: 56 }}>
        <div style={{
          background: 'rgba(245,158,11,.08)',
          borderBottom: '1px solid rgba(245,158,11,.22)',
          padding: '9px 24px',
          textAlign: 'center',
          fontSize: '.82rem',
          color: 'rgba(245,158,11,.85)',
          lineHeight: 1.5,
        }}>
          🚧 CLI is in active development — some features are incomplete.{' '}
          <a href="/#waitlist" style={{ color: 'rgba(245,158,11,.95)', fontWeight: 600, textDecoration: 'underline' }}>
            Join the waitlist
          </a>{' '}
          for stable release notifications.
        </div>
        {children}
      </div>
      <Footer />
    </div>
  )
}

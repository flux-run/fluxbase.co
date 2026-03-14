import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { CodeWindow } from '@/components/marketing/CodeWindow'

export const metadata: Metadata = {
  title: 'Open Source — Flux',
  description: 'Flux is free and open source. Self-host on your own infrastructure. No cloud account, no usage limits, no vendor lock-in.',
}

const inner: React.CSSProperties = { maxWidth: 1040, margin: '0 auto', padding: '0 24px' }
const muted: React.CSSProperties = { color: 'var(--mg-muted)' }

export default function OpenSourcePage() {
  return (
    <MarketingLayout>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="hero" style={{ paddingBottom: 48 }}>
        <span className="eyebrow">Open Source</span>
        <h1 style={{ fontSize: 'clamp(2rem,5vw,3rem)' }}>
          Free forever.<br />
          <span className="gradient-text">Self-hosted. No limits.</span>
        </h1>
        <p style={{ maxWidth: 540, margin: '0 auto 24px', color: 'var(--mg-muted)', fontSize: '1.05rem' }}>
          Flux is open-source software you run on your own infrastructure. No cloud account, no usage-based pricing, no vendor lock-in. Your code, your data, your servers.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/docs/quickstart" className="btn-primary">Get Started →</Link>
          <Link href="https://github.com/flux-run/flux" className="btn-secondary">View on GitHub</Link>
        </div>
      </section>

      {/* ── What You Get ──────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid var(--mg-border)', padding: '64px 0', background: 'var(--mg-bg-surface)' }}>
        <div style={inner}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8 }}>Everything included. No tiers.</h2>
          <p style={{ ...muted, fontSize: '.95rem', maxWidth: 560, marginBottom: 40 }}>
            Every feature ships in the same binary. There is no &quot;enterprise edition&quot; or premium tier.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              { icon: '⚡', title: 'Functions', desc: 'TypeScript, Python, Go, Java, PHP, Rust, C#, Ruby. Drop a file, get an endpoint.' },
              { icon: '🗄️', title: 'Database', desc: 'Postgres with typed access via ctx.db. Every write recorded automatically.' },
              { icon: '📬', title: 'Queue', desc: 'Durable async jobs with retries, delay, and dead-letter queue.' },
              { icon: '⏰', title: 'Cron', desc: 'Schedule functions with cron syntax. One line of config.' },
              { icon: '🤖', title: 'Agents', desc: 'YAML-defined LLM agents that use your functions as tools. Every step traced.' },
              { icon: '🔍', title: 'Execution Recording', desc: 'Every request traced: spans, mutations, inputs/outputs. flux why, flux trace, flux replay.' },
              { icon: '🛡️', title: 'Gateway', desc: 'Auth, rate limiting, CORS, routing. Built into the binary.' },
              { icon: '🔧', title: 'CLI', desc: 'flux init, flux dev, flux deploy, flux trace, flux why — everything from the terminal.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ background: 'var(--mg-bg-elevated)', border: '1px solid var(--mg-border)', borderRadius: 10, padding: '22px 24px' }}>
                <div style={{ fontSize: '1.3rem', marginBottom: 10 }}>{icon}</div>
                <h3 style={{ fontSize: '.9rem', fontWeight: 700, marginBottom: 6, color: 'var(--mg-text)' }}>{title}</h3>
                <p style={{ fontSize: '.82rem', color: 'var(--mg-muted)', lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Deployment Options ─────────────────────────────────── */}
      <section style={{ borderTop: '1px solid var(--mg-border)', padding: '64px 0' }}>
        <div style={inner}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8 }}>Deploy anywhere.</h2>
          <p style={{ ...muted, fontSize: '.95rem', maxWidth: 560, marginBottom: 40 }}>
            Flux is a single binary + Postgres. Run it wherever you run containers.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Local development', cmd: 'flux dev', desc: 'Embedded Postgres, hot-reload, instant traces.' },
                { label: 'Docker / Docker Compose', cmd: 'docker compose up', desc: '2 containers: Flux + Postgres. Production-ready.' },
                { label: 'Kubernetes', cmd: 'helm install flux', desc: 'Helm chart with horizontal scaling. Postgres as StatefulSet or managed.' },
                { label: 'Any VPS', cmd: 'ssh + systemd', desc: 'Single binary on any Linux box. Automatic migrations.' },
              ].map(({ label, cmd, desc }) => (
                <div key={label} style={{ border: '1px solid var(--mg-border)', borderRadius: 8, padding: '16px 20px', background: 'var(--mg-bg-surface)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: '.9rem' }}>{label}</span>
                    <code style={{ fontSize: '.75rem', color: 'var(--mg-accent)' }}>{cmd}</code>
                  </div>
                  <p style={{ fontSize: '.8rem', color: 'var(--mg-muted)', margin: 0 }}>{desc}</p>
                </div>
              ))}
            </div>
            <CodeWindow label="docker-compose.yml">{`services:\n  postgres:\n    image: postgres:16\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n\n  flux:\n    image: flux/server\n    ports: [<span style="color:var(--mg-green);">"4000:4000"</span>]\n    environment:\n      DATABASE_URL: postgres://postgres@postgres/flux\n    depends_on:\n      - postgres\n\nvolumes:\n  pgdata:`}</CodeWindow>
          </div>
        </div>
      </section>

      {/* ── Why Open Source ────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid var(--mg-border)', padding: '64px 0', background: 'var(--mg-bg-surface)' }}>
        <div style={inner}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8 }}>Why open source matters for infrastructure.</h2>
          <p style={{ ...muted, fontSize: '.95rem', maxWidth: 560, marginBottom: 40 }}>
            Your backend framework is the foundation of your product. It should never be a vendor dependency.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {[
              { icon: '🔒', title: 'Your data stays with you', desc: 'Execution records, traces, and mutation logs live in your Postgres instance. Nothing is sent to any external service.' },
              { icon: '🔍', title: 'Full source code', desc: 'Read every line. Audit the security model. Understand exactly what the runtime does with your code and data.' },
              { icon: '🚫', title: 'No lock-in', desc: 'Your functions are standard TypeScript. Your data is in Postgres. If you leave Flux, you keep everything.' },
              { icon: '🤝', title: 'Community-driven', desc: 'Bug reports, feature requests, and contributions from the people who actually use it in production.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ background: 'var(--mg-bg-elevated)', border: '1px solid var(--mg-border)', borderRadius: 10, padding: '22px 24px' }}>
                <div style={{ fontSize: '1.3rem', marginBottom: 10 }}>{icon}</div>
                <h3 style={{ fontSize: '.9rem', fontWeight: 700, marginBottom: 6, color: 'var(--mg-text)' }}>{title}</h3>
                <p style={{ fontSize: '.82rem', color: 'var(--mg-muted)', lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className="cta-strip">
        <h2>Get started in 60 seconds.</h2>
        <p style={{ maxWidth: 480, margin: '0 auto 32px', color: 'var(--mg-muted)' }}>
          Install the CLI, create a project, and see the full execution trace — no account required.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/docs/quickstart" className="btn-primary">Quickstart →</Link>
          <Link href="https://github.com/flux-run/flux" className="btn-secondary">View on GitHub</Link>
        </div>
      </section>
    </MarketingLayout>
  )
}

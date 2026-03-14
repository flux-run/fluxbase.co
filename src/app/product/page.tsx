import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { CodeWindow } from '@/components/marketing/CodeWindow'

export const metadata: Metadata = {
  title: 'Product — Flux',
  description: 'Replay production traffic. Diff two executions. Root-cause any failure in one command. Flux is the backend runtime that makes production debugging deterministic.',
}

const inner: React.CSSProperties = { maxWidth: 1040, margin: '0 auto', padding: '0 24px' }
const muted: React.CSSProperties = { color: 'var(--mg-muted)' }
const section = (bg?: string): React.CSSProperties => ({
  borderTop: '1px solid var(--mg-border)', padding: '80px 0',
  ...(bg ? { background: bg } : {}),
})
const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }

export default function ProductPage() {
  return (
    <MarketingLayout>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="hero" style={{ paddingBottom: 48 }}>
        <span className="eyebrow">Product</span>
        <h1 style={{ fontSize: 'clamp(2rem,5vw,3rem)' }}>
          Every production question,<br />
          <span className="gradient-text">answered in one command.</span>
        </h1>
        <p style={{ maxWidth: 580, margin: '0 auto 16px', color: 'var(--mg-muted)' }}>
          Flux is a backend runtime that records every execution automatically. When something breaks, you don&apos;t guess.
          Replay the exact production traffic. Diff two executions. Bisect the commit that introduced the bug.
        </p>
        <p style={{ maxWidth: 500, margin: '0 auto 24px', fontSize: '.88rem', color: 'var(--mg-muted)', borderLeft: '2px solid var(--mg-accent)', paddingLeft: 14, textAlign: 'left' }}>
          Functions, database, queue, and cron are built in — because recording requires controlling the full stack.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/docs/quickstart" className="btn-primary">Get Started →</Link>
          <Link href="/cli" className="btn-secondary">CLI Reference</Link>
        </div>
      </section>

      {/* ── Execution Record ──────────────────────────────────── */}
      <section style={{ borderTop: '1px solid var(--mg-border)', padding: '48px 0', background: 'var(--mg-bg-elevated)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>One core concept: the execution record.</p>
          <p style={{ ...muted, fontSize: '.95rem', lineHeight: 1.7, marginBottom: 24 }}>
            Every request Flux handles becomes an execution record — a complete snapshot of what the request did: gateway spans, function spans, database mutations, inputs, outputs, tool latencies, and async hand-offs. The commands below are different ways to query and act on that record.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', fontSize: '.83rem' }}>
            {[
              ['inspect it', 'flux trace'],
              ['replay it', 'flux incident replay'],
              ['compare it', 'flux trace diff'],
              ['audit it', 'flux state history'],
            ].map(([verb, cmd]) => (
              <span key={verb} style={{ fontFamily: 'var(--font-geist-mono,monospace)', padding: '6px 16px', border: '1px solid var(--mg-border)', borderRadius: 20, color: 'var(--mg-muted)' }}>
                {verb}&nbsp;&nbsp;<span style={{ color: 'var(--mg-accent)' }}>{cmd}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Task-Oriented Design ─────────────────────────────── */}
      <section style={section('var(--mg-bg-surface)')}>
        <div style={inner}>
          <span className="section-label">Task-Oriented Design</span>
          <h2 className="section-h2">Start with the question, not the tool.</h2>
          <p style={{ ...muted, fontSize: '.95rem', maxWidth: 560, margin: '0 0 40px' }}>
            Flux CLI commands map directly to the questions developers ask when something breaks in production.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.9rem' }}>
              <thead>
                <tr>
                  {['Developer Question', 'Command', 'What it does'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 16px', borderBottom: '1px solid var(--mg-border)', color: 'var(--mg-muted)', fontSize: '.75rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {([
                  { group: 'Inspect', rows: [
                    ['Why did my request fail?',        'flux why <id>',        'Root cause, span tree, suggestions'],
                    ['What happened step by step?',     'flux trace <id>',      'Full span tree with latencies'],
                    ['How does my query get compiled?', 'flux explain',         'Dry-run with policy + SQL preview'],
                  ]},
                  { group: 'Replay', rows: [
                    ['What happens if I replay this?',  'flux incident replay', 'Safe re-run, side-effects off'],
                  ]},
                  { group: 'Compare', rows: [
                    ['How do two requests differ?',     'flux trace diff',      'Span-by-span comparison'],
                    ['Which commit introduced this bug?','flux bug bisect',     'Binary-searches git history'],
                  ]},
                  { group: 'Audit', rows: [
                    ['What changed in the database?',   'flux state history',   'Every row mutation, linked to request'],
                    ['Who set this field to this value?','flux state blame',    'Per-column last-write attribution'],
                  ]},
                ] as { group: string; rows: string[][] }[]).flatMap(({ group, rows }) => [
                  <tr key={`g-${group}`}>
                    <td colSpan={3} style={{ padding: '10px 16px 6px', fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--mg-accent)', background: 'var(--mg-bg-elevated)', borderBottom: '1px solid var(--mg-border)' }}>{group}</td>
                  </tr>,
                  ...rows.map(([q, cmd, desc]) => (
                    <tr key={cmd}>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--mg-border)', color: 'var(--mg-text)' }}>{q}</td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--mg-border)', whiteSpace: 'nowrap' }}><code>{cmd}</code></td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--mg-border)', color: 'var(--mg-muted)', fontSize: '.87rem' }}>{desc}</td>
                    </tr>
                  )),
                ])}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Deterministic Execution ──────────────────────────── */}
      <section id="deterministic-execution" style={section()}>
        <div style={inner}>
          <div style={grid2}>
            <div>
              <span className="section-label">Deterministic Execution</span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 12, color: 'var(--mg-text)' }}>Every request is recorded automatically.</h3>
              <p style={{ ...muted, fontSize: '.95rem', lineHeight: 1.7 }}>
                The Flux runtime captures a complete record of every request as it happens — gateway auth, function spans, every database query, tool latencies, async job hand-offs. Whether your function runs on Deno V8 (TypeScript) or Wasmtime (Python, Go, Java, PHP, Rust, C#, Ruby) — same recording, same traces.
              </p>
            </div>
            <CodeWindow label="automatic recording">{`<span style="color:var(--mg-muted);"># Every request produces:</span>\n\n  trace_requests      <span style="color:var(--mg-green);">→</span> span tree (gateway to db)\n  state_mutations     <span style="color:var(--mg-green);">→</span> every row change + request link\n  execution_spans     <span style="color:var(--mg-green);">→</span> timing, errors, tool calls\n\n<span style="color:var(--mg-muted);"># Nothing to configure. Zero SDK changes.</span>\n<span style="color:var(--mg-muted);"># The runtime records it all.</span>`}</CodeWindow>
          </div>
        </div>
      </section>

      {/* ── Time-Travel Debugging ────────────────────────────── */}
      <section id="time-travel-debugging" style={section('var(--mg-bg-surface)')}>
        <div style={inner}>
          <div style={grid2}>
            <CodeWindow label="flux trace debug 550e8400">{`<span style="color:var(--mg-green);">$</span> flux trace debug <span style="color:var(--mg-accent);">550e8400</span>\n\n  <span style="color:var(--mg-muted);">Step 1/4  gateway</span>\n  <span style="color:var(--mg-muted);">─────────────────────────────────────</span>\n  Input:   POST /signup  <span style="color:var(--mg-green);">{ email: "a@b.com" }</span>\n  Output:  <span style="color:var(--mg-green);">{ tenant_id: "t_123", passed: true }</span>\n  Time:    4ms\n\n  <span style="color:var(--mg-muted);">Step 2/4  create_user</span>\n  <span style="color:var(--mg-muted);">─────────────────────────────────────</span>\n  Input:   <span style="color:var(--mg-green);">{ email: "a@b.com" }</span>\n  Output:  <span style="color:var(--mg-green);">{ userId: "u_42" }</span>\n  Time:    81ms\n\n  <span style="color:var(--mg-muted);">↓ next  ↑ prev  e expand  q quit</span>`}</CodeWindow>
            <div>
              <span className="section-label">Time-Travel Debugging</span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 12, color: 'var(--mg-text)' }}>Step through any production request.</h3>
              <p style={{ ...muted, fontSize: '.95rem', lineHeight: 1.7 }}>
                <code>flux trace debug &lt;id&gt;</code> opens an interactive terminal UI where you can navigate each span of a production request. See the exact input and output at every step — what the gateway received, what the function returned, what the database wrote. All from the actual production execution.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mutation History ─────────────────────────────────── */}
      <section id="mutation-history" style={section()}>
        <div style={inner}>
          <div style={grid2}>
            <div>
              <span className="section-label">Data Mutation History</span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 12, color: 'var(--mg-text)' }}>See every change ever made to a row.</h3>
              <p style={{ ...muted, fontSize: '.95rem', lineHeight: 1.7 }}>
                <code>flux state history</code> shows every INSERT, UPDATE, and DELETE on any row, linked back to the request that caused it. <code>flux state blame</code> shows which request owns each column&apos;s current value. Instantly answer &quot;who or what set this field to this value?&quot;
              </p>
            </div>
            <CodeWindow label="flux state history users --id 42">{`<span style="color:var(--mg-green);">$</span> flux state history users --id 42\n\n  <span style="color:#f8f8f2;">users id=42</span>  (7 mutations)\n\n  <span style="color:var(--mg-muted);">2026-03-10 12:00:00</span>  INSERT  <span style="color:var(--mg-green);">email=a@b.com, plan=free</span>\n  <span style="color:var(--mg-muted);">2026-03-10 14:21:59</span>  UPDATE  name: null → Alice Smith  <span style="color:var(--mg-accent);">req:a3c91ef0</span>\n  <span style="color:var(--mg-muted);">2026-03-10 14:22:01</span>  UPDATE  plan: free → pro           <span style="color:var(--mg-accent);">req:4f9a3b2c</span>\n  <span style="color:var(--mg-muted);">2026-03-10 14:22:01</span>  UPDATE  plan: pro → null  <span style="color:var(--mg-muted);">(rolled back)</span>  <span style="color:var(--mg-red);">req:550e8400</span>\n\n<span style="color:var(--mg-muted);">$</span> flux state blame users --id 42\n\n  email    a@b.com     <span style="color:var(--mg-accent);">req:4f9a3b2c</span>  12:00:00\n  plan     free        <span style="color:var(--mg-red);">req:550e8400</span>  14:22:01  <span style="color:var(--mg-red);">✗ rolled back</span>`}</CodeWindow>
          </div>
        </div>
      </section>

      {/* ── Incident Replay ──────────────────────────────────── */}
      <section id="incident-replay" style={section('var(--mg-bg-surface)')}>
        <div style={inner}>
          <div style={grid2}>
            <CodeWindow label="flux incident replay 14:00..14:05">{`<span style="color:var(--mg-green);">$</span> flux incident replay 14:00..14:05\n\n  Replaying 23 requests from 14:00–14:05…\n\n  <span style="color:var(--mg-muted);">Side-effects: hooks off · events off · cron off</span>\n  <span style="color:var(--mg-muted);">Database writes: on · mutation log: on</span>\n\n  <span style="color:var(--mg-green);">✔</span>  <span style="color:var(--mg-accent);">req:4f9a3b2c</span>  POST /create_user   200  81ms\n  <span style="color:var(--mg-green);">✔</span>  <span style="color:var(--mg-accent);">req:a3c91ef0</span>  GET  /list_users    200  12ms\n  <span style="color:var(--mg-red);">✗</span>  <span style="color:var(--mg-accent);">req:550e8400</span>  POST /signup        500  44ms\n     <span style="color:var(--mg-red);">└─ Still failing: Stripe timeout</span>\n\n  23 replayed · 22 passing · 1 still failing`}</CodeWindow>
            <div>
              <span className="section-label">Incident Replay</span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 12, color: 'var(--mg-text)' }}>Test your fix against the exact incident.</h3>
              <p style={{ ...muted, fontSize: '.95rem', lineHeight: 1.7 }}>
                <code>flux incident replay</code> re-executes all requests from a time window against your current code. Outbound side-effects are disabled — no emails, no webhooks, no Slack. Database writes and mutation logs run normally. After your commit, replay the incident to confirm the fix before deploying.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Regression Detection ─────────────────────────────── */}
      <section id="regression-detection" style={section()}>
        <div style={inner}>
          <div style={grid2}>
            <div>
              <span className="section-label">Regression Detection</span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 12, color: 'var(--mg-text)' }}>Find the commit that introduced the bug.</h3>
              <p style={{ ...muted, fontSize: '.95rem', lineHeight: 1.7 }}>
                <code>flux bug bisect</code> binary-searches your git history comparing trace behaviour before and after each commit. It automatically identifies the first commit where a given request started failing. Like <code>git bisect</code>, but for production behaviour rather than a test suite.
              </p>
            </div>
            <CodeWindow label="flux bug bisect">{`<span style="color:var(--mg-green);">$</span> flux bug bisect --request <span style="color:var(--mg-accent);">550e8400</span>\n\n  Bisecting 42 commits (2026-03-01..2026-03-10)…\n\n  Testing <span style="color:var(--mg-muted);">abc123</span>…  <span style="color:var(--mg-green);">✔ passes</span>\n  Testing <span style="color:var(--mg-muted);">fde789</span>…  <span style="color:var(--mg-green);">✔ passes</span>\n  Testing <span style="color:var(--mg-muted);">def456</span>…  <span style="color:var(--mg-red);">✗ fails</span>\n\n  <span style="color:#f8f8f2;">FIRST BAD COMMIT</span>\n  <span style="color:var(--mg-accent);">def456</span>  "feat: add retry logic to stripe.charge"\n  <span style="color:var(--mg-muted);">2026-03-08 by alice@example.com</span>\n\n  <span style="color:var(--mg-green);">→</span> Compare before/after:\n     flux trace diff <span style="color:var(--mg-muted);">abc123:550e8400 def456:550e8400</span>`}</CodeWindow>
          </div>
        </div>
      </section>
      {/* ── Progressive Adoption ────────────────────────────── */}
      <section id="progressive-adoption" style={section('var(--mg-bg-surface)')}>
        <div style={inner}>
          <span className="section-label">Progressive Adoption</span>
          <h2 className="section-h2">Start with one function. Not a rewrite.</h2>
          <p style={{ ...muted, fontSize: '.95rem', maxWidth: 600, margin: '0 0 40px' }}>
            Flux is a runtime — your code runs inside it. That&apos;s what makes replay and mutation logging possible. But you don&apos;t adopt a runtime all at once. Here&apos;s the path:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 640 }}>
            {[
              { step: '1', title: 'Try it locally (5 minutes)', desc: 'flux init → flux dev → curl. You have execution traces before you finish reading the quickstart. No infra changes. Nothing deployed.', color: 'var(--mg-green)' },
              { step: '2', title: 'Move one endpoint (30 minutes)', desc: 'Pick a new or low-risk endpoint. Wrap it in defineFunction(). Deploy Flux on :4000 behind your existing proxy. Everything else stays on your current stack.', color: 'var(--mg-accent)' },
              { step: '3', title: 'Compare debugging speed', desc: 'Next time that endpoint fails in production, run flux why. Compare the experience to your Datadog/Sentry/grep workflow. The difference sells itself.', color: 'var(--mg-yellow)' },
              { step: '4', title: 'Migrate gradually', desc: 'Move more endpoints when you see the value. Flux and your existing stack run side-by-side behind the same proxy. No big-bang cutover.', color: '#c4b5fd' },
            ].map(({ step, title, desc, color }, i, arr) => (
              <div key={step} style={{ display: 'flex', gap: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ width: 32, height: 32, borderRadius: '50%', background: color, color: '#000', fontSize: '.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{step}</span>
                  {i < arr.length - 1 && <div style={{ width: 2, flex: 1, background: 'var(--mg-border)' }} />}
                </div>
                <div style={{ paddingBottom: i < arr.length - 1 ? 28 : 0 }}>
                  <p style={{ fontWeight: 700, fontSize: '.92rem', marginBottom: 4, color: 'var(--mg-text)' }}>{title}</p>
                  <p style={{ fontSize: '.85rem', color: 'var(--mg-muted)', lineHeight: 1.7, margin: 0 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 40 }}>
            <p style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--mg-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>Side-by-side deployment</p>
            <CodeWindow label="nginx.conf (route by route)">{`upstream existing_api {\n  server 127.0.0.1:3000;  <span style="color:var(--mg-muted);"># Express / FastAPI / Rails</span>\n}\nupstream flux_api {\n  server 127.0.0.1:4000;  <span style="color:var(--mg-muted);"># Flux</span>\n}\n\nserver {\n  listen 443 ssl;\n\n  <span style="color:var(--mg-muted);"># New endpoints → Flux</span>\n  location /api/signup  { proxy_pass http://flux_api; }\n  location /api/orders  { proxy_pass http://flux_api; }\n\n  <span style="color:var(--mg-muted);"># Everything else → existing stack</span>\n  location /api/        { proxy_pass http://existing_api; }\n}`}</CodeWindow>
          </div>
        </div>
      </section>

      {/* ── Performance ─────────────────────────────────────────── */}
      <section id="performance" style={section()}>
        <div style={inner}>
          <span className="section-label">Performance</span>
          <h2 className="section-h2">Full recording. Negligible overhead.</h2>
          <p style={{ ...muted, fontSize: '.95rem', maxWidth: 600, margin: '0 0 40px' }}>
            Recording is built into the runtime at the Rust level — not added as middleware on top. Spans flow through in-memory channels. Mutation logs piggyback on the same Postgres transaction as your data.
          </p>
          <div style={grid2}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { metric: '<0.1ms', label: 'Gateway routing', detail: 'DB route table cached in memory, invalidated via LISTEN/NOTIFY' },
                { metric: '<0.4ms', label: 'Recording overhead per request', detail: 'Span creation + mutation log INSERT inside the same transaction' },
                { metric: '~10µs', label: 'WASM instantiation (cached)', detail: 'Cranelift AOT compiles modules once, LRU cache of 256 entries' },
                { metric: '0ms', label: 'V8 warm start', detail: 'Deno isolates stay warm between requests. Cold start ~5ms on first deploy.' },
              ].map(({ metric, label, detail }) => (
                <div key={label} style={{ display: 'flex', gap: 16, padding: '14px 18px', border: '1px solid var(--mg-border)', borderRadius: 8, background: 'var(--mg-bg-surface)' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--mg-green)', fontFamily: 'var(--font-geist-mono,monospace)', minWidth: 72, flexShrink: 0 }}>{metric}</span>
                  <div>
                    <div style={{ fontSize: '.88rem', fontWeight: 600, marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: '.78rem', color: 'var(--mg-muted)' }}>{detail}</div>
                  </div>
                </div>
              ))}
            </div>
            <CodeWindow label="why it's fast">{`<span style="color:var(--mg-muted);">// All in the same process:</span>\n\n  Gateway  ── in-memory dispatch ──  Runtime\n     │                                  │\n     │    <span style="color:var(--mg-green);">no HTTP hops</span>                   │\n     │    <span style="color:var(--mg-green);">no serialization</span>               │\n     │    <span style="color:var(--mg-green);">no service mesh</span>                │\n     │                                  │\n  Data Engine ── same Postgres txn ──  Queue\n\n<span style="color:var(--mg-muted);">// Mutation log = 1 extra INSERT</span>\n<span style="color:var(--mg-muted);">// in the SAME transaction as your write.</span>\n<span style="color:var(--mg-muted);">// No extra round-trip. No eventual consistency.</span>`}</CodeWindow>
          </div>
        </div>
      </section>
      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className="cta-strip">
        <h2>Ready to debug production like it&apos;s local?</h2>
        <p style={{ maxWidth: 480, margin: '0 auto 32px', color: 'var(--mg-muted)' }}>
          Everything on this page is available when you run <code>flux dev</code>. No cloud account, no configuration, no SDK changes.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/docs/quickstart" className="btn-primary">Get Started →</Link>
          <Link href="/how-it-works" className="btn-secondary">How It Works</Link>
          <Link href="https://github.com/flux-run/flux" className="btn-secondary">GitHub</Link>
        </div>
      </section>
    </MarketingLayout>
  )
}

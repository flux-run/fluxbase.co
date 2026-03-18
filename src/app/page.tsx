import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { CodeWindow } from '@/components/marketing/CodeWindow'
import { WaitlistForm } from '@/components/marketing/WaitlistForm'

export const metadata: Metadata = {
  title: 'Flux — Reproduce Any Production Bug in One Command',
  description: 'Flux is an open-source backend runtime that records every execution automatically. Replay production traffic, diff two requests, root-cause any failure. One binary, one command: flux why.',
}

const inner: React.CSSProperties = { maxWidth: 1040, margin: '0 auto', padding: '0 24px' }
const muted: React.CSSProperties = { color: 'var(--mg-muted)' }
const section = (bg?: string): React.CSSProperties => ({
  borderTop: '1px solid var(--mg-border)', padding: '80px 0',
  ...(bg ? { background: bg } : {}),
})

export default function HomePage() {
  return (
    <MarketingLayout>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="hero" style={{ paddingBottom: 60 }}>
        <span className="eyebrow">Open Source · Self-Hosted · Postgres</span>
        <h1>
          Reproduce any production bug<br />
          <span className="gradient-text">in one command.</span>
        </h1>
        <p style={{ maxWidth: 600, margin: '0 auto 10px', fontSize: '1.05rem', color: 'var(--mg-muted)' }}>
          Flux is a backend runtime that records every execution automatically — inputs, outputs, database
          mutations, traces, timing. When something breaks, you don&apos;t grep logs. You run <code>flux why</code>.
        </p>
        <p style={{ maxWidth: 520, margin: '0 auto 36px', fontSize: '.9rem', color: 'var(--mg-muted)' }}>
          Stand-alone Rust binaries. One Postgres database. <strong style={{ color: 'var(--mg-text)' }}>No cloud account required.</strong>
        </p>
        <div style={{ maxWidth: 660, margin: '0 auto 40px' }}>
          <CodeWindow label="from zero to debugging in 60 seconds">{
            `<span style="color:var(--mg-green);">$</span> flux init my-app && cd my-app\n<span style="color:var(--mg-green);">$</span> flux dev\n\n  <span style="color:var(--mg-green);">✔</span> Postgres started at .flux/pgdata/\n  <span style="color:var(--mg-green);">✔</span> Flux running at <span style="color:var(--mg-accent);">http://localhost:4000</span>\n\n<span style="color:var(--mg-green);">$</span> curl -X POST localhost:4000/hello -d '{"name":"world"}'\n  <span style="color:var(--mg-muted);">→ {"message":"hello world"}  req:4f9a3b2c</span>\n\n<span style="color:var(--mg-green);">$</span> flux trace <span style="color:var(--mg-accent);">4f9a3b2c</span>\n\n  <span style="color:#f9a8d4;">server.route_match</span>          <span style="color:var(--mg-yellow);">+0ms</span>\n  <span style="color:#c4b5fd;">runtime.execution</span>            <span style="color:var(--mg-yellow);">+2ms</span>\n    <span style="color:#60a5fa;">db.query.users</span>             <span style="color:var(--mg-yellow);">+4ms</span>  <span style="color:var(--mg-muted);">(before/after captured)</span>\n  <span style="color:var(--mg-green);">✔</span> 200 OK                       <span style="color:var(--mg-yellow);">12ms total</span>`
          }</CodeWindow>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
          <Link href="/docs/quickstart" className="btn-primary">Get Started →</Link>
          <Link href="https://github.com/flux-run/flux" className="btn-secondary">GitHub</Link>
        </div>
        <div className="install-hint">
          <span className="prompt">$</span>
          curl -fsSL https://fluxbase.co/install | bash
        </div>
      </section>

      {/* ── The Debugging Workflow ──────────────────────────── */}
      <section style={section('var(--mg-bg-surface)')}>
        <div style={inner}>
          <span className="section-label">The Debugging Workflow</span>
          <h2 className="section-h2">From alert to root cause in 30 seconds.</h2>
          <p style={{ ...muted, fontSize: '.95rem', maxWidth: 560, margin: '0 0 40px' }}>
            A user reports &quot;signup failed&quot;. In any other framework, you&apos;re jumping between Datadog, Sentry, and a database console for an hour. In Flux, it&apos;s two commands.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <p style={{ fontSize: '.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--mg-muted)', marginBottom: 14 }}>Step 1 — spot the failure</p>
              <CodeWindow label="flux tail">{`<span style="color:var(--mg-green);">$</span> flux tail\n\n  Streaming live requests…\n\n  <span style="color:var(--mg-green);">✔</span>  POST /signup      201   88ms  <span style="color:var(--mg-muted);">req:4f9a3b2c</span>\n  <span style="color:var(--mg-green);">✔</span>  POST /login       200   12ms  <span style="color:var(--mg-muted);">req:a3c91ef0</span>\n  <span style="color:var(--mg-red);">✗</span>  POST /signup      500   44ms  <span style="color:var(--mg-accent);">req:550e8400</span>\n     <span style="color:var(--mg-red);">└─ CONFLICT on users.email</span>`}</CodeWindow>
            </div>
            <div>
              <p style={{ fontSize: '.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--mg-muted)', marginBottom: 14 }}>Step 2 — understand it</p>
              <CodeWindow label="flux why 550e8400">{`<span style="color:var(--mg-green);">$</span> flux why <span style="color:var(--mg-accent);">550e8400</span>\n\n  <span style="color:#f8f8f2;">FUNCTION</span>     create_user\n  <span style="color:#f8f8f2;">ERROR</span>        CONFLICT on users.email\n\n  <span style="color:#f8f8f2;">DB MUTATION</span>   INSERT INTO users <span style="color:var(--mg-red);">failed</span>\n               duplicate key (email = alice@example.com)\n\n  <span style="color:#f8f8f2;">FIX</span>          <span style="color:var(--mg-green);">→</span> Check for existing user before inserting`}</CodeWindow>
            </div>
          </div>
          <p style={{ marginTop: 20, textAlign: 'center', fontSize: '.85rem', color: 'var(--mg-muted)' }}>
            Want to go deeper?{' '}
            <Link href="/cli" style={{ color: 'var(--mg-accent)' }}>flux trace diff</Link>,{' '}
            <Link href="/cli" style={{ color: 'var(--mg-accent)' }}>flux state history</Link>, and{' '}
            <Link href="/cli" style={{ color: 'var(--mg-accent)' }}>flux incident replay</Link> give you full production time-travel.
          </p>
        </div>
      </section>

      {/* ── What You Get ──────────────────────────────────── */}
      <section style={section()}>
        <div style={inner}>
          <span className="section-label">What the Runtime Provides</span>
          <h2 className="section-h2">Recording needs control. Flux controls the full stack.</h2>
          <p style={{ ...muted, fontSize: '.95rem', maxWidth: 620, margin: '0 0 40px' }}>
            Deterministic recording is only possible when the runtime owns every layer — database, queue, execution. That&apos;s why Flux is a runtime, not an SDK. Here&apos;s what you get out of the box:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 8 }}>
            {[
              { icon: '⚡', label: 'Functions', hint: 'TypeScript via Deno V8. Rust, Go, Java, Python, PHP, AssemblyScript via WebAssembly (Wasmtime).' },
              { icon: '🗄️', label: 'Database', hint: 'Postgres with typed access via ctx.db. Every write recorded.' },
              { icon: '📬', label: 'Queue', hint: 'Async jobs with retries, delay, dead-letter. Built in.' },
              { icon: '⏰', label: 'Cron', hint: 'Schedule directly on a function. One line of config.' },
              { icon: '🔍', label: 'Execution Recording', hint: 'Every request traced automatically. flux why, flux trace, flux incident replay.' },
            ].map(({ icon, label, hint }) => (
              <div key={label} style={{ display: 'flex', gap: 14, padding: '18px 20px', border: '1px solid var(--mg-border)', borderRadius: 10, background: 'var(--mg-bg-surface)' }}>
                <span style={{ fontSize: '1.3rem', flexShrink: 0, marginTop: 1 }}>{icon}</span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '.88rem', marginBottom: 3 }}>{label}</p>
                  <p style={{ fontSize: '.8rem', color: 'var(--mg-muted)', lineHeight: 1.5, margin: 0 }}>{hint}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Difference ─────────────────────────────────── */}
      <section style={section()}>
        <div style={inner}>
          <span className="section-label">The Difference</span>
          <h2 className="section-h2">You shouldn&apos;t need 5 tools to debug one request.</h2>
          <p style={{ ...muted, fontSize: '.95rem', maxWidth: 560, margin: '0 0 40px' }}>
            Traditional stacks scatter evidence across Datadog, Sentry, CloudWatch, and a database console. Flux captures everything in one place.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'start' }}>
            <div style={{ border: '1px solid var(--mg-border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ background: 'var(--mg-bg-elevated)', borderBottom: '1px solid var(--mg-border)', padding: '14px 20px' }}>
                <span style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--mg-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Express + Prisma + BullMQ</span>
              </div>
              <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['6 dependencies to wire together', 'Logs scattered across services', 'Manual OpenTelemetry instrumentation', 'No connection between traces and DB writes', 'Production bugs: guess → deploy → pray'].map(t => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '.88rem', color: 'var(--mg-muted)' }}>
                    <span style={{ color: 'var(--mg-red)' }}>✗</span> {t}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ border: '1px solid var(--mg-accent)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ background: 'var(--mg-accent-dim)', borderBottom: '1px solid var(--mg-accent)', padding: '14px 20px' }}>
                <span style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--mg-accent)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Flux</span>
              </div>
              <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['flux dev', '— one command, everything runs'],
                  ['flux why <id>', '— root cause in seconds'],
                  ['flux trace <id>', '— full span tree + DB mutations'],
                  ['flux incident replay <id>', '— re-run against your fix'],
                  ['flux bug bisect', '— find the exact broken commit'],
                ].map(([cmd, desc]) => (
                  <div key={cmd} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '.88rem', color: 'var(--mg-muted)' }}>
                    <span style={{ color: 'var(--mg-green)' }}>✓</span>
                    <code>{cmd}</code> {desc}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why a Runtime ──────────────────────────────────── */}
      <section style={section()}>
        <div style={inner}>
          <span className="section-label">Why a Runtime, Not an SDK?</span>
          <h2 className="section-h2">&quot;Can&apos;t you just add this to Express?&quot;</h2>
          <p style={{ ...muted, fontSize: '.95rem', maxWidth: 620, margin: '0 0 16px' }}>
            No. Bolt-on tools can only observe what you manually instrument. A runtime observes everything by construction. Here&apos;s what&apos;s impossible with an SDK:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 40 }}>
            {[
              { impossible: 'Record DB mutations in the same transaction', why: 'An SDK sits outside the database driver. Flux\'s server wraps the query — mutation logging happens inside the same Postgres transaction as your write. Zero extra round-trips.' },
              { impossible: 'Replay production traffic safely', why: 'Replay requires controlling side-effects (email, webhooks, Stripe). Only a runtime can intercept outbound calls and disable them during replay.' },
              { impossible: 'Link every span to the exact code version', why: 'Flux knows which code SHA is running because it deployed it. An SDK sees function names, not deploy history.' },
              { impossible: 'Bisect across git history', why: 'flux bug bisect replays a request against each commit. This requires the runtime to re-deploy and re-execute — an SDK can\'t do that.' },
            ].map(({ impossible, why }) => (
              <div key={impossible} style={{ padding: '20px 22px', border: '1px solid var(--mg-border)', borderRadius: 10, background: 'var(--mg-bg-surface)' }}>
                <p style={{ fontWeight: 700, fontSize: '.85rem', marginBottom: 6, color: 'var(--mg-red)' }}>Impossible with an SDK:</p>
                <p style={{ fontWeight: 600, fontSize: '.88rem', marginBottom: 8, color: 'var(--mg-text)' }}>{impossible}</p>
                <p style={{ fontSize: '.8rem', color: 'var(--mg-muted)', lineHeight: 1.6, margin: 0 }}>{why}</p>
              </div>
            ))}
          </div>
          <div style={{ border: '1px solid var(--mg-accent)', borderRadius: 10, padding: '28px 32px', background: 'var(--mg-accent-dim)', maxWidth: 700 }}>
            <p style={{ fontSize: '.95rem', fontWeight: 700, marginBottom: 10, color: 'var(--mg-text)' }}>
              &quot;But that means I have to migrate.&quot;
            </p>
            <p style={{ fontSize: '.88rem', color: 'var(--mg-muted)', lineHeight: 1.7, marginBottom: 16 }}>
              Migration is wrapping, not rewriting. Your business logic stays identical. Here&apos;s an Express handler becoming a Flux function:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <CodeWindow label="Express (before)">{`app.post(<span style="color:var(--mg-green);">"/signup"</span>, <span style="color:var(--mg-muted);">async</span> (req, res) => {\n  <span style="color:var(--mg-muted);">const</span> user = <span style="color:var(--mg-muted);">await</span> db.users.create({\n    email: req.body.email,\n    plan: <span style="color:var(--mg-green);">"free"</span>,\n  });\n  <span style="color:var(--mg-muted);">await</span> queue.add(<span style="color:var(--mg-green);">"send_welcome"</span>,\n    { userId: user.id });\n  res.json({ id: user.id });\n});`}</CodeWindow>
              <CodeWindow label="Flux (after)">{`<span style="color:var(--mg-muted);">export default</span> defineFunction({\n  name: <span style="color:var(--mg-green);">"signup"</span>,\n  handler: <span style="color:var(--mg-muted);">async</span> ({ input, ctx }) => {\n    <span style="color:var(--mg-muted);">const</span> user = <span style="color:var(--mg-muted);">await</span> ctx.db.users.insert({\n      email: input.email,\n      plan: <span style="color:var(--mg-green);">"free"</span>,\n    });\n    <span style="color:var(--mg-muted);">await</span> ctx.queue.push(<span style="color:var(--mg-green);">"send_welcome"</span>,\n      { userId: user.id });\n    <span style="color:var(--mg-muted);">return</span> { id: user.id };\n  },\n});`}</CodeWindow>
            </div>
            <p style={{ fontSize: '.82rem', color: 'var(--mg-muted)', marginTop: 14, marginBottom: 0 }}>
              Same logic. Same TypeScript. <code>req.body</code> → <code>input</code>, <code>res.json</code> → <code>return</code>, <code>db</code> → <code>ctx.db</code>. The payoff: every request is now automatically traced, replayable, and debuggable.
            </p>
          </div>
          <div style={{ marginTop: 32, padding: '20px 24px', border: '1px solid var(--mg-border)', borderRadius: 10, background: 'var(--mg-bg-surface)', maxWidth: 700 }}>
            <p style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: 8, color: 'var(--mg-text)' }}>Start with one function. Not your whole backend.</p>
            <p style={{ fontSize: '.85rem', color: 'var(--mg-muted)', lineHeight: 1.7, margin: 0 }}>
              Flux runs on <code>:4000</code>. Your existing Express/FastAPI/Rails app runs on its port. Put both behind nginx and route new endpoints to Flux. Migrate one function at a time. No big-bang rewrite.
            </p>
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────── */}
      <section style={section('var(--mg-bg-surface)')}>
        <div style={inner}>
          <span className="section-label">How It Works</span>
          <h2 className="section-h2">Every request produces a complete record.</h2>
          <p style={{ ...muted, fontSize: '.95rem', maxWidth: 600, margin: '0 0 40px' }}>
            Write a function. Flux records the inputs, outputs, every database mutation (before &amp; after), every external call, and every span. No instrumentation code. No SDK. It&apos;s the runtime&apos;s primary output.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
            <div>
              <CodeWindow label="functions/create_user/index.ts">{`<span style="color:var(--mg-muted);">import</span> { defineFunction } <span style="color:var(--mg-muted);">from</span> <span style="color:var(--mg-green);">"@flux/functions"</span>;\n<span style="color:var(--mg-muted);">import</span> { z } <span style="color:var(--mg-muted);">from</span> <span style="color:var(--mg-green);">"zod"</span>;\n\n<span style="color:var(--mg-muted);">export default</span> defineFunction({\n  name: <span style="color:var(--mg-green);">"create_user"</span>,\n  input: z.object({ name: z.string(), email: z.string() }),\n  handler: <span style="color:var(--mg-muted);">async</span> ({ input, ctx }) => {\n    <span style="color:var(--mg-muted);">const</span> user = <span style="color:var(--mg-muted);">await</span> ctx.db.users.insert(input);\n    <span style="color:var(--mg-muted);">await</span> ctx.queue.push(<span style="color:var(--mg-green);">"send_welcome"</span>, { user_id: user.id });\n    <span style="color:var(--mg-muted);">return</span> { id: user.id };\n  },\n});`}</CodeWindow>
              <p style={{ fontSize: '.8rem', color: 'var(--mg-muted)', marginTop: 16 }}>
                That&apos;s it. No decorators, no route files, no ORM config. Drop the file, it becomes <code>POST /create_user</code>.
              </p>
            </div>
            <div>
              <CodeWindow label="what Flux records automatically">{`<span style="color:#f8f8f2;">ExecutionRecord</span> <span style="color:var(--mg-accent);">req:a3f9d2b1</span>\n\n  <span style="color:#f8f8f2;">function</span>    create_user\n  <span style="color:#f8f8f2;">input</span>       { name: "Alice", email: "alice@..." }\n  <span style="color:#f8f8f2;">output</span>      { id: "usr_7f3a" }\n  <span style="color:#f8f8f2;">duration</span>    22ms\n  <span style="color:#f8f8f2;">code_sha</span>    <span style="color:var(--mg-muted);">a1b2c3d</span>\n\n  <span style="color:#60a5fa;">spans</span>\n    server.route_match         +0ms\n    runtime.execution           +2ms\n    db.insert(users)            +4ms  <span style="color:var(--mg-green);">✔</span>\n    queue.push(send_welcome)    +12ms <span style="color:var(--mg-green);">✔</span>\n\n  <span style="color:#60a5fa;">db_mutations</span>\n    users INSERT  id=usr_7f3a\n      before: <span style="color:var(--mg-muted);">null</span>\n      after:  { name: "Alice", email: "alice@..." }`}</CodeWindow>
            </div>
          </div>
        </div>
      </section>

      {/* ── Multi-Language ─────────────────────────────────── */}
      <section style={section()}>
        <div style={inner}>
          <span className="section-label">Write in Any Language</span>
          <h2 className="section-h2">TypeScript by default. Any language via WebAssembly.</h2>
          <p style={{ ...muted, fontSize: '.95rem', maxWidth: 600, margin: '0 0 40px' }}>
            Write functions in TypeScript and they run on Deno V8. Need raw performance or a different language? Compile to WebAssembly and Flux runs it on Wasmtime — same tracing, same ctx API, same execution records.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, marginBottom: 40 }}>
            {[
              { lang: 'TypeScript', runtime: 'Deno V8', color: '#3178c6' },
              { lang: 'AssemblyScript', runtime: 'Wasmtime', color: '#007acc' },
              { lang: 'Rust', runtime: 'Wasmtime', color: '#dea584' },
              { lang: 'Java', runtime: 'TeaVM → Wasm', color: '#f89820' },
              { lang: 'Go', runtime: 'wasip1', color: '#00ADD8' },
              { lang: 'PHP', runtime: 'php-8.2-wasm', color: '#8892be' },
              { lang: 'Python', runtime: 'py2wasm', color: '#3776ab' },
            ].map(({ lang, runtime, color }) => (
              <div key={lang} style={{ textAlign: 'center', padding: '20px 12px', border: '1px solid var(--mg-border)', borderRadius: 10, background: 'var(--mg-bg-surface)' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color, marginBottom: 4 }}>{lang}</div>
                <div style={{ fontSize: '.7rem', color: 'var(--mg-muted)' }}>{runtime}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <CodeWindow label="functions/hello/flux.json (TypeScript)">{`{\n  "name": "hello",\n  "runtime": "deno"\n}\n\n<span style="color:var(--mg-muted);">// Drop index.ts \u2014 runs on V8 automatically</span>`}</CodeWindow>
            <CodeWindow label="functions/process/flux.json (Rust \u2192 Wasm)">{`{\n  "name": "process_image",\n  "runtime": "wasm",\n  "entry": "handler.wasm",\n  "build": "cargo build --target wasm32-wasip1\\n     --release && cp target/.../process.wasm\\n     handler.wasm",\n  "memory_mb": 64\n}\n\n<span style="color:var(--mg-muted);">// Same ctx.db, ctx.queue, ctx.fetch</span>\n<span style="color:var(--mg-muted);">// Same execution recording</span>`}</CodeWindow>
          </div>
          <p style={{ fontSize: '.82rem', color: 'var(--mg-muted)', marginTop: 20, textAlign: 'center' }}>
            Both runtimes share the same host API. Execution records, spans, and debugging commands work identically regardless of language.
          </p>
        </div>
      </section>

      {/* ── Architecture ───────────────────────────────────── */}
      <section style={section('var(--mg-bg-surface)')}>
        <div style={inner}>
          <span className="section-label">Architecture</span>
          <h2 className="section-h2">Three binaries. Zero operational complexity.</h2>
          <p style={{ ...muted, fontSize: '.95rem', maxWidth: 560, margin: '0 0 40px' }}>
            Flux runs as three independent, highly-optimized Rust binaries. Postgres holds all state. Scale horizontally by adding copies behind a load balancer.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'CLI', desc: 'developer debugging tools and deploy commands' },
                { label: 'Server', desc: 'gRPC server, execution store, async jobs' },
                { label: 'Runtime', desc: 'Deno V8 execution, Postgres queries, isolated state' },
              ].map(({ label, desc }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', border: '1px solid var(--mg-border)', borderRadius: 8, background: 'var(--mg-bg-surface)' }}>
                  <span style={{ fontSize: '.9rem', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: '.75rem', color: 'var(--mg-muted)' }}>{desc}</span>
                </div>
              ))}
              <div style={{ textAlign: 'center', padding: '10px', fontSize: '.8rem', color: 'var(--mg-muted)' }}>
                ↓ backed by a single source of truth ↓
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', border: '1px solid var(--mg-accent)', borderRadius: 8, background: 'var(--mg-accent-dim)' }}>
                <span style={{ fontSize: '.9rem', fontWeight: 600 }}>PostgreSQL</span>
                <span style={{ fontSize: '.75rem', color: 'var(--mg-accent)' }}>all database tables and execution state lives here</span>
              </div>
            </div>
            <div>
              <CodeWindow label="deployment: 2 containers">{`<span style="color:var(--mg-muted);"># docker-compose.yml</span>\nservices:\n  postgres:\n    image: postgres:16\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n\n  flux:\n    image: flux/server\n    ports: [<span style="color:var(--mg-green);">"4000:4000"</span>]\n    environment:\n      DATABASE_URL: postgres://postgres@postgres/flux\n    depends_on:\n      - postgres\n\nvolumes:\n  pgdata:`}</CodeWindow>
              <p style={{ fontSize: '.8rem', color: 'var(--mg-muted)', marginTop: 16 }}>
                Two containers. That&apos;s the entire production stack.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Performance ─────────────────────────────────────────── */}
      <section style={section()}>
        <div style={inner}>
          <span className="section-label">&quot;But what about the overhead?&quot;</span>
          <h2 className="section-h2">Recording adds &lt;1ms per request. Here&apos;s why.</h2>
          <p style={{ ...muted, fontSize: '.95rem', maxWidth: 620, margin: '0 0 40px' }}>
            When you hear &quot;every request traced, every mutation logged&quot; it sounds expensive. It isn&apos;t. The recording layer is built into the runtime at the Rust level — not bolted on as middleware.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 40 }}>
            {[
              { title: 'Rust architecture', desc: 'Flux runs across fast, compiled Rust binaries using a shared gRPC boundary.' },
              { title: 'Same-transaction mutation log', desc: 'Mutation records are written inside the same Postgres transaction as your data. One round-trip, not two. No eventual consistency.' },
              { title: 'Append-only writes', desc: 'Spans and mutations are INSERT-only into append-optimized tables. Postgres handles this at wire speed — no read-modify-write, no locking contention.' },
              { title: 'Cranelift AOT for WASM', desc: 'WebAssembly modules are compiled once via Cranelift and cached (LRU, 256 entries). Subsequent calls skip compilation entirely — instantiation takes microseconds.' },
              { title: 'Warm V8 isolates', desc: 'TypeScript functions run in pre-warmed Deno V8 isolates. Cold start only happens on first invocation after deploy. Subsequent calls reuse the warm isolate.' },
              { title: 'Configurable retention', desc: 'Execution records are auto-pruned after TRACE_RETENTION_DAYS (default 30). Old data is DELETE\'d, not archived. Your database stays lean.' },
            ].map(({ title, desc }) => (
              <div key={title} style={{ padding: '20px 22px', border: '1px solid var(--mg-border)', borderRadius: 10, background: 'var(--mg-bg-surface)' }}>
                <p style={{ fontWeight: 700, fontSize: '.88rem', marginBottom: 6, color: 'var(--mg-text)' }}>{title}</p>
                <p style={{ fontSize: '.8rem', color: 'var(--mg-muted)', lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <CodeWindow label="overhead breakdown (typical request)">{`<span style="color:var(--mg-green);">$</span> flux trace <span style="color:var(--mg-accent);">4f9a3b2c</span> --timing\n\n  <span style="color:#f8f8f2;">Your code</span>              <span style="color:var(--mg-yellow);">18ms</span>\n  <span style="color:#f8f8f2;">Recording overhead</span>     <span style="color:var(--mg-green);">0.4ms</span>\n    span creation         0.02ms\n    mutation log write    0.3ms  <span style="color:var(--mg-muted);">(same txn)</span>\n    trace finalization    0.08ms\n  <span style="color:#f8f8f2;">Total</span>                  <span style="color:var(--mg-yellow);">18.4ms</span>\n\n  <span style="color:var(--mg-muted);">Recording: 2.2% of total request time</span>`}</CodeWindow>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>
              <div style={{ padding: '16px 20px', border: '1px solid var(--mg-border)', borderRadius: 8, background: 'var(--mg-bg-surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: '.82rem', fontWeight: 600 }}>Server routing</span>
                  <span style={{ fontSize: '.78rem', fontFamily: 'var(--font-geist-mono,monospace)', color: 'var(--mg-green)' }}>&lt;0.1ms</span>
                </div>
                <div style={{ fontSize: '.76rem', color: 'var(--mg-muted)' }}>DB-backed route table + LISTEN/NOTIFY cache invalidation</div>
              </div>
              <div style={{ padding: '16px 20px', border: '1px solid var(--mg-border)', borderRadius: 8, background: 'var(--mg-bg-surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: '.82rem', fontWeight: 600 }}>WASM cold start</span>
                  <span style={{ fontSize: '.78rem', fontFamily: 'var(--font-geist-mono,monospace)', color: 'var(--mg-yellow)' }}>5–50ms</span>
                </div>
                <div style={{ fontSize: '.76rem', color: 'var(--mg-muted)' }}>Cranelift AOT compile (once). Cached after first call. Instantiation: ~10µs.</div>
              </div>
              <div style={{ padding: '16px 20px', border: '1px solid var(--mg-border)', borderRadius: 8, background: 'var(--mg-bg-surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: '.82rem', fontWeight: 600 }}>V8 cold start</span>
                  <span style={{ fontSize: '.78rem', fontFamily: 'var(--font-geist-mono,monospace)', color: 'var(--mg-yellow)' }}>~5ms</span>
                </div>
                <div style={{ fontSize: '.76rem', color: 'var(--mg-muted)' }}>First invocation after deploy. Warm isolate reuse: 0ms.</div>
              </div>
            </div>
          </div>
          <p style={{ fontSize: '.82rem', color: 'var(--mg-muted)', marginTop: 24, textAlign: 'center', maxWidth: 600, margin: '24px auto 0' }}>
            The recording cost is dominated by a single Postgres INSERT in the same transaction as your data. For most requests, overhead is under 1ms and under 3% of total latency.
          </p>
        </div>
      </section>
      {/* ── Privacy & Security ──────────────────────────────── */}
      <section style={section('var(--mg-bg-surface)')}>
        <div style={inner}>
          <span className="section-label">&quot;What does it record exactly?&quot;</span>
          <h2 className="section-h2">You control what gets captured. Here&apos;s the default.</h2>
          <p style={{ ...muted, fontSize: '.95rem', maxWidth: 620, margin: '0 0 40px' }}>
            Recording everything sounds scary. In practice, the defaults are safe and the controls are explicit.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ border: '1px solid var(--mg-border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ background: 'var(--mg-bg-elevated)', borderBottom: '1px solid var(--mg-border)', padding: '14px 20px' }}>
                <span style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--mg-green)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Recorded by default</span>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Span tree (function → DB → queue)', 'Timing for every operation', 'DB row changes (before/after values)', 'Queue job metadata', 'HTTP status code and route', 'Function input/output shapes'].map(t => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '.85rem', color: 'var(--mg-muted)' }}>
                    <span style={{ color: 'var(--mg-green)' }}>&#x2713;</span> {t}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ border: '1px solid var(--mg-border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ background: 'var(--mg-bg-elevated)', borderBottom: '1px solid var(--mg-border)', padding: '14px 20px' }}>
                <span style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--mg-red)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Never recorded</span>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Secret values (ctx.secrets.get returns opaque refs)', 'Authorization headers and tokens', 'Passwords or hashed credentials', 'Raw request bodies with sensitive fields (configurable redaction)'].map(t => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '.85rem', color: 'var(--mg-muted)' }}>
                    <span style={{ color: 'var(--mg-red)' }}>&#x2717;</span> {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 24, padding: '20px 24px', border: '1px solid var(--mg-border)', borderRadius: 10, background: 'var(--mg-bg-surface)', maxWidth: 700 }}>
            <p style={{ fontWeight: 700, fontSize: '.88rem', marginBottom: 8, color: 'var(--mg-text)' }}>You can redact any field.</p>
            <p style={{ fontSize: '.82rem', color: 'var(--mg-muted)', lineHeight: 1.7, margin: 0 }}>
              Use <code>ctx.redact()</code> to exclude fields from execution records. Common for PII columns, payment data, or medical records. Redacted fields show <code>[REDACTED]</code> in traces but the actual value still flows through your function normally.
            </p>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'Self-hosted', desc: 'Your server, your network. No data ever leaves your infrastructure.' },
              { label: 'Postgres-native', desc: 'Execution records live in your Postgres database. Standard backup, encryption, access control.' },
              { label: 'Auto-pruning', desc: 'TRACE_RETENTION_DAYS controls how long records are kept. Default 30 days. Old data is deleted, not archived.' },
            ].map(({ label, desc }) => (
              <div key={label} style={{ flex: '1 1 200px', fontSize: '.82rem', color: 'var(--mg-muted)', lineHeight: 1.6 }}>
                <span style={{ fontWeight: 700, color: 'var(--mg-text)' }}>{label}.</span> {desc}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Early Access / Waitlist ─────────────────────────── */}
      <section id="waitlist" style={section()}>
        <div style={inner}>
          <span className="section-label">Early Access</span>
          <h2 className="section-h2">Get notified when stable v1 ships.</h2>
          <p style={{ ...muted, fontSize: '.95rem', maxWidth: 560, margin: '0 0 10px' }}>
            The CLI and runtime are in active development. Join the waitlist — we&apos;ll send one email when the stable release is ready.
          </p>
          <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap', marginTop: 32 }}>
            <div style={{ flex: '1 1 300px' }}>
              <WaitlistForm source="homepage" />
            </div>
            <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: '⚡', label: 'Alpha CLI available now', hint: 'Install and experiment today — flux init, flux dev, flux deploy all work.' },
                { icon: '🔒', label: 'Stable release coming', hint: 'Full flux.toml hot-reload, production hardening, and signed binaries.' },
                { icon: '📣', label: 'One email, no spam', hint: "We'll notify you when it's ready. That's it." },
              ].map(({ icon, label, hint }) => (
                <div key={label} style={{ display: 'flex', gap: 12, fontSize: '.85rem' }}>
                  <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>{icon}</span>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--mg-text)' }}>{label}</span>
                    <span style={{ color: 'var(--mg-muted)' }}> — {hint}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid var(--mg-border)', padding: '80px 24px', textAlign: 'left' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'start', maxWidth: 900, margin: '0 auto' }}>
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 8, color: 'var(--mg-text)' }}>Get started in 60 seconds.</h2>
            <p style={{ maxWidth: 400, margin: '0 0 28px', color: 'var(--mg-muted)' }}>
              Install the CLI, create a project, write a function, and see the full execution trace — before you finish your coffee.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
              <Link href="/docs/quickstart" className="btn-primary">Quickstart →</Link>
              <Link href="https://github.com/flux-run/flux" className="btn-secondary">View on GitHub</Link>
            </div>
            <div className="install-hint" style={{ marginTop: 0 }}>
              <span className="prompt">$</span>
              curl -fsSL https://fluxbase.co/install | bash
            </div>
          </div>
          <div>
            <div style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--mg-muted)', marginBottom: 16 }}>Get up to speed</div>
            {[
              { n: 1, href: '/docs/quickstart',          label: 'Quickstart',      hint: '— project to trace in 5 minutes' },
              { n: 2, href: '/docs',                     label: 'Core Concepts',   hint: '— execution record, ctx, functions' },
              { n: 3, href: '/how-it-works',             label: 'How It Works',    hint: '— architecture, recording, replay' },
              { n: 4, href: '/cli',                      label: 'CLI Reference',   hint: '— every command, with examples' },
              { n: 5, href: '/docs/self-hosting',        label: 'Self-Hosting',    hint: '— Docker, Kubernetes, scaling' },
            ].map(({ n, href, label, hint }, i, arr) => (
              <div key={n}>
                <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,.12)', color: '#fff', fontSize: '.68rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</span>
                  <span style={{ fontWeight: 600, fontSize: '.9rem' }}>{label}</span>
                  <span style={{ fontSize: '.8rem', color: 'var(--mg-muted)' }}>{hint}</span>
                </Link>
                {i < arr.length - 1 && <div style={{ paddingLeft: 11, height: 16, borderLeft: '1px dashed rgba(255,255,255,.2)' }} />}
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}

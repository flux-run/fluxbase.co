import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documentation — Flux',
  description: 'Flux records every backend request so you can debug, replay, and resume failures. Get started in minutes.',
}

export default function Page() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
<h1>Flux Documentation</h1>
<p class="page-subtitle">Debug production failures by replaying them locally.</p>

<div style="background:var(--bg-elevated);border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:8px;padding:20px 24px;margin:0 0 36px;">
  <div style="font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-bottom:14px;">Get running in 60 seconds</div>
  <div style="display:flex;flex-direction:column;gap:0;">
    <div style="display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="flex-shrink:0;width:24px;height:24px;border-radius:50%;background:var(--accent-dim);color:var(--accent);font-size:.75rem;font-weight:700;display:flex;align-items:center;justify-content:center;">1</div>
      <div style="flex:1;font-size:.875rem;">Install flux CLI</div>
      <code style="font-size:.78rem;color:var(--accent);background:var(--bg);border:1px solid var(--border);padding:3px 8px;border-radius:4px;white-space:nowrap;">curl -fsSL https://fluxbase.co/install | bash</code>
    </div>
    <div style="display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="flex-shrink:0;width:24px;height:24px;border-radius:50%;background:var(--accent-dim);color:var(--accent);font-size:.75rem;font-weight:700;display:flex;align-items:center;justify-content:center;">2</div>
      <div style="flex:1;font-size:.875rem;">Start your app</div>
      <code style="font-size:.78rem;color:var(--accent);background:var(--bg);border:1px solid var(--border);padding:3px 8px;border-radius:4px;white-space:nowrap;">flux serve index.ts</code>
    </div>
    <div style="display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="flex-shrink:0;width:24px;height:24px;border-radius:50%;background:var(--accent-dim);color:var(--accent);font-size:.75rem;font-weight:700;display:flex;align-items:center;justify-content:center;">3</div>
      <div style="flex:1;font-size:.875rem;">Watch live traffic</div>
      <code style="font-size:.78rem;color:var(--accent);background:var(--bg);border:1px solid var(--border);padding:3px 8px;border-radius:4px;white-space:nowrap;">flux tail</code>
    </div>
    <div style="display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="flex-shrink:0;width:24px;height:24px;border-radius:50%;background:var(--accent-dim);color:var(--accent);font-size:.75rem;font-weight:700;display:flex;align-items:center;justify-content:center;">4</div>
      <div style="flex:1;font-size:.875rem;">Understand a failure</div>
      <code style="font-size:.78rem;color:var(--accent);background:var(--bg);border:1px solid var(--border);padding:3px 8px;border-radius:4px;white-space:nowrap;">flux why &lt;id&gt;</code>
    </div>
    <div style="display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="flex-shrink:0;width:24px;height:24px;border-radius:50%;background:var(--accent-dim);color:var(--accent);font-size:.75rem;font-weight:700;display:flex;align-items:center;justify-content:center;">5</div>
      <div style="flex:1;font-size:.875rem;">Test your fix safely</div>
      <code style="font-size:.78rem;color:var(--accent);background:var(--bg);border:1px solid var(--border);padding:3px 8px;border-radius:4px;white-space:nowrap;">flux replay &lt;id&gt;</code>
    </div>
    <div style="display:flex;align-items:center;gap:14px;padding:10px 0;">
      <div style="flex-shrink:0;width:24px;height:24px;border-radius:50%;background:var(--accent-dim);color:var(--accent);font-size:.75rem;font-weight:700;display:flex;align-items:center;justify-content:center;">6</div>
      <div style="flex:1;font-size:.875rem;">Apply fix with real IO</div>
      <code style="font-size:.78rem;color:var(--accent);background:var(--bg);border:1px solid var(--border);padding:3px 8px;border-radius:4px;white-space:nowrap;">flux resume &lt;id&gt;</code>
    </div>
  </div>
</div>

<h2>Start here</h2>

<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin:24px 0 40px;">
  <a href="/docs/quickstart" style="display:block;padding:20px 24px;border:2px solid var(--accent);border-radius:10px;background:var(--accent-dim);color:var(--text);text-decoration:none;">
    <div style="font-size:1.2rem;margin-bottom:8px;">🚀</div>
    <div style="font-weight:700;margin-bottom:4px;">Quickstart</div>
    <div style="font-size:.85rem;color:var(--muted);">From install to first replay in 5 minutes.</div>
  </a>
  <a href="/docs/install" style="display:block;padding:20px 24px;border:1px solid var(--border);border-radius:10px;background:var(--bg-surface);color:var(--text);text-decoration:none;">
    <div style="font-size:1.2rem;margin-bottom:8px;">⬇️</div>
    <div style="font-weight:700;margin-bottom:4px;">Install</div>
    <div style="font-size:.85rem;color:var(--muted);">CLI, server, and runtime setup.</div>
  </a>
</div>

<h2>How it works</h2>

<p>Flux runs alongside your existing TypeScript backend (Hono, Express-compatible). It records every incoming request — inputs, outputs, database calls, console logs — into Postgres. When something breaks, you have three commands:</p>

<table>
  <thead>
    <tr>
      <th>Command</th>
      <th>What it does</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><code>flux why &lt;id&gt;</code></td><td>Explains why the request failed — error, console output, which IO was reached</td></tr>
    <tr><td><code>flux trace &lt;id&gt;</code></td><td>Full execution trace with all recorded checkpoints</td></tr>
    <tr><td><code>flux replay &lt;id&gt;</code></td><td>Re-runs the request with your updated code. Never touches real IO — deterministic and safe</td></tr>
    <tr><td><code>flux resume &lt;id&gt;</code></td><td>Re-runs the request with real IO — commits to the database, calls external services</td></tr>
    <tr><td><code>flux tail</code></td><td>Stream live requests as they arrive</td></tr>
  </tbody>
</table>

<h2>Architecture</h2>

<p>Flux is three Rust binaries backed by a single Postgres database:</p>

<table>
  <thead>
    <tr><th>Binary</th><th>Role</th></tr>
  </thead>
  <tbody>
    <tr><td><code>flux-server</code></td><td>Stores execution records, checkpoints, logs. gRPC API.</td></tr>
    <tr><td><code>flux-runtime</code></td><td>Executes your TypeScript via Deno V8. Records all IO.</td></tr>
    <tr><td><code>flux</code> (CLI)</td><td>Developer tools: tail, why, trace, replay, resume.</td></tr>
  </tbody>
</table>

<p>No cloud account required. Self-hosted. Your data stays in your Postgres.</p>

<hr>

<h2>Writing your app</h2>

<p>Flux uses <strong>Hono</strong> as the HTTP framework and <code>flux:pg</code> for Postgres. These are the only dependencies you need:</p>

<pre><code><span class="kw">import</span> { Hono } <span class="kw">from</span> <span class="str">"npm:hono"</span>
<span class="kw">import</span> pg <span class="kw">from</span> <span class="str">"flux:pg"</span>

<span class="kw">const</span> app = <span class="kw">new</span> Hono()
<span class="kw">const</span> pool = <span class="kw">new</span> pg.Pool({ connectionString: Deno.env.get(<span class="str">"DATABASE_URL"</span>) })

app.post(<span class="str">"/orders"</span>, <span class="kw">async</span> (c) => {
  <span class="kw">const</span> body = <span class="kw">await</span> c.req.json()
  <span class="kw">const</span> result = <span class="kw">await</span> pool.query(
    <span class="str">"INSERT INTO orders (email) VALUES ($1) RETURNING *"</span>,
    [body.email]
  )
  <span class="kw">return</span> c.json(result.rows[0])
})

<span class="kw">export default</span> app</code></pre>

<p>Start it with:</p>

<pre><code><span class="shell-prompt">$</span> flux serve index.ts</code></pre>

<p>Every request is automatically recorded. No instrumentation needed.</p>
` }}
    />
  )
}

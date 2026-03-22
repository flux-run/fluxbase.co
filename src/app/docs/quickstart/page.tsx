import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Quickstart — Flux',
  description: 'Get Flux running in 5 minutes. Install the CLI, start your app, and debug your first failure with flux why and flux replay.',
}

export default function Page() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
<h1>Quickstart</h1>
<p class="page-subtitle">Install Flux and debug your first production failure in 5 minutes.</p>

<h2>1. Install</h2>

<pre><code><span class="shell-prompt">$</span> curl -fsSL https://fluxbase.co/install | bash</code></pre>

<p>This installs three binaries: <code>flux</code> (CLI), <code>flux-server</code>, and <code>flux-runtime</code>.</p>

<h2>2. Start the server</h2>

<p>The server stores execution records in Postgres. Point it at any Postgres database:</p>

<pre><code><span class="shell-prompt">$</span> flux server start --database-url postgres://user:pass@localhost:5432/flux</code></pre>

<h2>3. Write your app</h2>

<p>Flux works with standard TypeScript using <strong>Hono</strong> as the HTTP framework and <code>flux:pg</code> for Postgres. Create <code>index.ts</code>:</p>

<pre><code><span class="kw">import</span> { Hono } <span class="kw">from</span> <span class="str">"npm:hono"</span>
<span class="kw">import</span> pg <span class="kw">from</span> <span class="str">"flux:pg"</span>

<span class="kw">const</span> app = <span class="kw">new</span> Hono()
<span class="kw">const</span> pool = <span class="kw">new</span> pg.Pool({
  connectionString: Deno.env.get(<span class="str">"DATABASE_URL"</span>)
})

app.post(<span class="str">"/orders"</span>, <span class="kw">async</span> (c) => {
  <span class="kw">const</span> body = <span class="kw">await</span> c.req.json()
  console.log(<span class="str">"Incoming:"</span>, body)

  <span class="kw">const</span> result = <span class="kw">await</span> pool.query(
    <span class="str">"INSERT INTO orders (email, product_id) VALUES ($1, $2) RETURNING *"</span>,
    [body.email, body.productId]
  )
  <span class="kw">return</span> c.json(result.rows[0])
})

<span class="kw">export default</span> app</code></pre>

<h2>4. Serve</h2>

<pre><code><span class="shell-prompt">$</span> flux serve index.ts

  [ready] listening on http://localhost:8000</code></pre>

<h2>5. Watch live traffic</h2>

<p>In a second terminal:</p>

<pre><code><span class="shell-prompt">$</span> flux tail

  streaming live requests — ctrl+c to stop

  ✓  ok     POST /orders   88ms  a1b2c3d4
  ✗  error  POST /orders   21ms  e9f66586
     └─ HTTP Internal Server Error (500)</code></pre>

<h2>6. Understand the failure</h2>

<pre><code><span class="shell-prompt">$</span> flux why e9f66586

  POST /orders  ✗ error  21ms  e9f66586

  function threw before any IO
  error   Internal Server Error

  console
    › Incoming: {"email":"test@example.com","productId":"101"}
    ✗ Error: productId must be a number

  check input validation and early-exit logic</code></pre>

<h2>7. Fix &amp; replay (safe — no real IO)</h2>

<p>Edit your code. Then replay the original request against your fix:</p>

<pre><code><span class="shell-prompt">$</span> flux replay e9f66586

  replaying e9f66586
  ✓ using updated code

  STEP 0 — POST /orders

  execution
    ✗ original execution failed before reaching external IO
    ✓ replay progressed beyond original failure point

  ⏸ stopped at external boundary: POSTGRES

  reason
    no recorded checkpoint available for this postgres call
    replay never touches the real world

  ✓ your code fix is working — replay progressed further than the original

  next
    → run flux resume e9f66586 to continue with real IO</code></pre>

<div class="callout callout-info">
  <div class="callout-title">Why did replay stop at POSTGRES?</div>
  <p>Replay is deterministic and safe — it never makes live external calls. When the original request had no recorded DB checkpoint (it failed before reaching the DB), replay stops cleanly at the boundary. This confirms your code fix works without touching your database.</p>
</div>

<h2>8. Resume with real IO</h2>

<pre><code><span class="shell-prompt">$</span> flux resume e9f66586

  resuming e9f66586…

  ✓ database write applied (43ms)

  ✓ request succeeded (200)

  output
    id:     9b887ab1
    email:  test@example.com

  ✓ original failure recovered</code></pre>

<h2>Next steps</h2>

<ul>
  <li><a href="/docs/install">Full install guide</a> — server setup, auth, environment variables</li>
  <li><a href="/cli">CLI reference</a> — every command with examples</li>
</ul>
` }}
    />
  )
}

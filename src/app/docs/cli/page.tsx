import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CLI Reference — Flux',
  description: 'Complete Flux CLI reference: flux serve, tail, why, trace, replay, resume, server, auth.',
}

export default function Page() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
<h1>CLI Reference</h1>
<p class="page-subtitle">Every Flux command, with examples.</p>

<hr>

<h2>flux serve</h2>
<p>Start your TypeScript app under the Flux runtime. Every request is recorded automatically.</p>
<pre><code><span class="shell-prompt">$</span> flux serve index.ts

  [ready] listening on http://localhost:8000</code></pre>
<p>Options:</p>
<table>
  <thead><tr><th>Flag</th><th>Default</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>--port</code></td><td>8000</td><td>HTTP port to listen on</td></tr>
    <tr><td><code>--env</code></td><td>—</td><td>Path to .env file</td></tr>
    <tr><td><code>--token</code></td><td>env: FLUX_SERVICE_TOKEN</td><td>Auth token for the Flux server</td></tr>
    <tr><td><code>--server-url</code></td><td>http://localhost:50051</td><td>URL of the Flux server</td></tr>
  </tbody>
</table>

<hr>

<h2>flux tail</h2>
<p>Stream live requests as they arrive.</p>
<pre><code><span class="shell-prompt">$</span> flux tail

  streaming live requests — ctrl+c to stop

  ✓  ok     POST /orders   88ms  a1b2c3d4
  ✗  error  POST /orders   21ms  e9f66586
     └─ HTTP Internal Server Error (500)</code></pre>

<hr>

<h2>flux why &lt;id&gt;</h2>
<p>Understand why a request failed — error, console output, where in execution it died.</p>
<pre><code><span class="shell-prompt">$</span> flux why e9f66586

  POST /orders  ✗ error  21ms  e9f66586

  function threw before any IO
  error   Internal Server Error

  error body
    Internal Server Error

  console
    › Incoming: {"email":"test@example.com","productId":"101"}
    ✗ Error: productId must be a number
    at Array.&lt;anonymous&gt; (index.ts:45:11)

  check input validation and early-exit logic</code></pre>

<hr>

<h2>flux trace &lt;id&gt;</h2>
<p>Full execution trace — all recorded IO checkpoints, console output, request/response.</p>
<pre><code><span class="shell-prompt">$</span> flux trace e9f66586

  POST /orders  error  21ms  e9f66586
  error  HTTP Internal Server Error (500)

  request
    (hidden, use --verbose)

  console
    ✗  Error: productId must be a number

  no checkpoints recorded</code></pre>
<p>Add <code>--verbose</code> to show full request and response bodies.</p>

<hr>

<h2>flux replay &lt;id&gt;</h2>
<p>Re-run a recorded request against your current code. <strong>Safe — never makes real external calls.</strong> Stops cleanly at IO boundaries when no checkpoint is recorded.</p>
<pre><code><span class="shell-prompt">$</span> flux replay e9f66586

  replaying e9f66586
  ✓ using updated code

  ────────────────────────────

  STEP 0 — POST /orders

  input
    email:      test@example.com
    productId:  101

  execution
    ✗ original execution failed before reaching external IO
    ✓ replay progressed beyond original failure point

  ────────────────────────────

  ⏸ stopped at external boundary: POSTGRES

  reason
    no recorded checkpoint available for this postgres call
    replay never touches the real world

  progress vs original
    original: failed before POSTGRES boundary
    replay:   reached POSTGRES boundary → stopped cleanly

  ✓ your code fix is working — replay progressed further than the original

  next
    → run flux resume e9f66586 to continue with real IO</code></pre>

<div class="callout callout-info">
  <div class="callout-title">replay = investigation. resume = action.</div>
  Replay is deterministic and safe. It uses only recorded checkpoints and stops if something is missing. Use <code>flux resume</code> when you're ready to apply the fix for real.
</div>

<hr>

<h2>flux resume &lt;id&gt;</h2>
<p>Re-run a request with <strong>real IO</strong> — hit the database, call external services, write to the world. Confirms the fix recovers the original failure.</p>
<pre><code><span class="shell-prompt">$</span> flux resume e9f66586

  resuming e9f66586…

  ⚠  executing with real side effects
     • database writes will be applied

  STEP 0 — POST /orders

  input
    email:      test@example.com
    productId:  101

  execution
    ✓ validation passed
    ✓ database write applied

  ────────────────────────────

  result
    ✓ request succeeded (200)

  output
    id:     9b887ab1
    email:  test@example.com

  difference vs original
    original:  ✗ failed
    now:       ✓ completed successfully

  ✓ original failure recovered</code></pre>

<hr>

<h2>flux server</h2>
<p>Manage the Flux server (stores execution records in Postgres).</p>
<pre><code><span class="shell-prompt">$</span> flux server start --database-url postgres://user:pass@localhost:5432/flux

<span class="shell-prompt">$</span> flux server restart</code></pre>
<table>
  <thead><tr><th>Subcommand</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>flux server start</code></td><td>Start the server</td></tr>
    <tr><td><code>flux server restart</code></td><td>Restart a running server</td></tr>
  </tbody>
</table>

<hr>

<h2>flux auth</h2>
<p>Authenticate the CLI against a running Flux server.</p>
<pre><code><span class="shell-prompt">$</span> flux auth --url http://localhost:50051 --token dev-service-token

  authenticated against http://localhost:50051
  saved CLI auth config</code></pre>

<hr>

<h2>flux config</h2>
<p>Read CLI configuration values.</p>
<pre><code><span class="shell-prompt">$</span> flux config get token
dev-service-token

<span class="shell-prompt">$</span> flux config get url
http://localhost:50051</code></pre>

<hr>

<h2>The debugging workflow</h2>

<table>
  <thead><tr><th>Question</th><th>Command</th></tr></thead>
  <tbody>
    <tr><td>What requests are failing right now?</td><td><code>flux tail</code></td></tr>
    <tr><td>Why did this request fail?</td><td><code>flux why &lt;id&gt;</code></td></tr>
    <tr><td>What IO did it do?</td><td><code>flux trace &lt;id&gt;</code></td></tr>
    <tr><td>Does my fix work?</td><td><code>flux replay &lt;id&gt;</code></td></tr>
    <tr><td>Apply the fix for real?</td><td><code>flux resume &lt;id&gt;</code></td></tr>
  </tbody>
</table>
` }}
    />
  )
}

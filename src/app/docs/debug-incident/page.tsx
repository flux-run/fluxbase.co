import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Debug a Production Incident — Flux Docs',
  description: 'Step-by-step: go from a user report to root cause in under 30 seconds using flux tail and flux why.',
}

export default function Page() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
<h1>Debug a Production Incident</h1>
<p class="page-subtitle">From alert to root cause in under 30 seconds.</p>

<p><em>Scenario: a user reports that checkout failed. You have no idea why.</em></p>

<h2>Step 1 — Find the failing request</h2>

<p>Stream live requests and spot the failure:</p>

<pre><code>$ flux tail

  POST /checkout    201  120ms  req:4f9a3b2c
  POST /checkout    500   44ms  req:550e8400
     └─ Error: Stripe API timeout</code></pre>

<p>Copy the request ID from the error line: <code>req:550e8400</code>.</p>

<p>If the incident happened in the past, filter by time:</p>

<pre><code>$ flux tail --since 1h --filter status=500

  POST /checkout  500  44ms  req:550e8400  14:22:01
  POST /checkout  500  51ms  req:7a8b9c0d  14:22:44</code></pre>

<h2>Step 2 — Get the root cause</h2>

<pre><code>$ flux why 550e8400

  ROOT CAUSE   Stripe API timeout after 10s
  LOCATION     payments/create.ts:42
  DATA CHANGES users.id=42  plan: free → null  (rolled back)
  SUGGESTION   → Add 5s timeout + idempotency key retry</code></pre>

<p><code>flux why</code> reads the execution record and returns the first error in the span tree along with the exact file and line, any DB mutations that were made (including rollbacks), and a suggested fix.</p>

<h2>Step 3 (optional) — Inspect the full execution</h2>

<p>If you need more context — latencies, upstream spans, or the full input/output at each step:</p>

<pre><code>$ flux trace 550e8400

  server                    2ms
  └─ create_order           8ms
     ├─ db.insert(orders)   4ms
     ├─ stripe.charge     180ms  ← timeout here
     └─ send_slack          — skipped (upstream error)</code></pre>

<p>Step through interactively:</p>

<pre><code>$ flux trace debug 550e8400

  Step 1/4  server
  ──────────────────────────────────
  Input:   POST /checkout  { ... }
  Output:  { tenant_id: "t_123" }
  Time:    2ms

  ↓ next  ↑ prev  e expand  q quit</code></pre>

<h2>What to do next</h2>

<p>Once you understand the root cause:</p>
<ul>
  <li>Fix the code locally</li>
  <li><a href="/docs/replay-incident">Replay the incident</a> against your fix before deploying</li>
  <li>Deploy with <code>flux deploy</code></li>
  <li>Monitor with <code>flux tail</code> to confirm the fix holds</li>
</ul>

<hr>

<p><a href="/docs/common-tasks">← Common Tasks</a> &nbsp;·&nbsp; <a href="/docs/replay-incident">Replay a Production Incident →</a></p>
` }} />
  )
}

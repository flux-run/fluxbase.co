import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Compare Two Executions — Flux Docs',
  description: 'Use flux trace diff to compare two requests span-by-span and find exactly what changed between them.',
}

export default function Page() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
<h1>Compare Two Executions</h1>
<p class="page-subtitle">See span-by-span exactly what changed between two requests.</p>

<p><em>Scenario: the same endpoint started behaving differently after a deploy. You want to pinpoint what changed.</em></p>

<h2>Diff two request traces</h2>

<pre><code>$ flux trace diff 4f9a3b2c 550e8400

  SPAN              REQUEST A         REQUEST B
  ──────────────────────────────────────────────────────
  server            2ms               2ms               —
  create_order      81ms              44ms              faster
  ├─ db.insert      4ms               4ms               —
  ├─ stripe.charge  68ms              → timeout (10s)   ✗ changed
  └─ send_slack     7ms               — skipped         ✗ missing</code></pre>

<p>The diff shows every span and whether it changed in duration, result, or presence. <code>✗ changed</code> marks spans where the outcome differed; <code>✗ missing</code> marks spans that ran in one request but not the other.</p>

<h2>Compare requests from different commits</h2>

<p>After running <code>flux bug bisect</code> to find the first bad commit, you can diff the same request across commits:</p>

<pre><code>$ flux trace diff abc123:550e8400 def456:550e8400

  SPAN              COMMIT abc123    COMMIT def456
  ──────────────────────────────────────────────────────
  stripe.charge     68ms ✔           → timeout  ✗</code></pre>

<p>This confirms the commit <code>def456</code> changed <code>stripe.charge</code> behaviour — the span went from passing to timing out.</p>

<h2>Compare across environments</h2>

<pre><code># Dev vs production for the same endpoint
$ flux trace diff dev:4f9a3b2c prod:550e8400</code></pre>

<h2>Export a diff</h2>

<pre><code>$ flux trace diff 4f9a3b2c 550e8400 --format json > diff.json</code></pre>

<hr>

<p><a href="/docs/inspect-mutations">← Inspect Database Mutations</a> &nbsp;·&nbsp; <a href="/docs/find-regression">Find the Commit That Broke It →</a></p>
` }} />
  )
}

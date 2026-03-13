import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Production Guide — Flux Docs',
  description: 'Running Flux in production: performance, cold starts, concurrency, trace storage, data retention, and scaling.',
}

export default function Page() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
<h1>Production Guide</h1>
<p class="page-subtitle">Everything you need to know before running Flux in production.</p>

<nav style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;padding:16px 20px;margin:0 0 40px;">
  <div style="font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:10px;">On this page</div>
  <div style="display:flex;flex-direction:column;gap:4px;font-size:.875rem;">
    <a href="#performance" style="color:var(--accent);text-decoration:none;">Performance overhead</a>
    <a href="#cold-starts" style="color:var(--accent);text-decoration:none;">Cold starts &amp; isolate reuse</a>
    <a href="#concurrency" style="color:var(--accent);text-decoration:none;">Concurrency model</a>
    <a href="#trace-storage" style="color:var(--accent);text-decoration:none;">Trace storage</a>
    <a href="#replay-determinism" style="color:var(--accent);text-decoration:none;">How replay guarantees determinism</a>
    <a href="#retention" style="color:var(--accent);text-decoration:none;">Data retention</a>
    <a href="#scaling" style="color:var(--accent);text-decoration:none;">Scaling</a>
  </div>
</nav>

<div class="callout callout-info">
  <div class="callout-title">Running on your own infrastructure?</div>
  This page covers the Flux Cloud production environment. If you are self-hosting, see the <a href="/docs/self-hosting">Self-Hosting guide</a> — the operational model (stateless services, one Postgres) is the same, but scaling and configuration are in your hands.
</div>

<h2 id="performance">Performance overhead</h2>

<div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;padding:16px 20px;margin:0 0 24px;">
  <div style="font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:8px;">TL;DR</div>
  <p style="margin:0;">Span recording adds <strong>&lt;1ms</strong> to typical requests (async, off the critical path). Mutation logging adds <strong>~0.2ms per write</strong> batched in the same transaction. No SDK, no instrumentation — overhead is built into the infrastructure layer.</p>
</div>

<p>Recording every execution adds overhead at two points:</p>

<table>
  <thead>
    <tr><th>What is recorded</th><th>Overhead</th><th>How it is minimised</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>Span recording (gateway, function, tool calls)</td>
      <td>~0.1ms per span, async</td>
      <td>Written after the response is flushed — never on the critical path</td>
    </tr>
    <tr>
      <td>Mutation logging (DB writes)</td>
      <td>~0.2ms per mutation</td>
      <td>Batched in the same transaction at the Data Engine level — no extra round-trip to Postgres</td>
    </tr>
    <tr>
      <td>Request input recording</td>
      <td>~0.05ms</td>
      <td>Captured at gateway ingress before routing</td>
    </tr>
  </tbody>
</table>

<p><strong>Typical observed overhead</strong></p>
<ul>
  <li>p50 latency added: &lt;0.5ms</li>
  <li>p99 latency added: &lt;2ms</li>
  <li>No CPU overhead on the runtime isolate (recording runs in a separate Rust thread)</li>
</ul>

<p>If a span write fails (e.g. storage is temporarily unavailable), the request still completes normally. Recording failures are non-fatal and are retried asynchronously.</p>

<h2 id="cold-starts">Cold starts &amp; isolate reuse</h2>

<p><strong>Are functions warm?</strong> Yes — Deno V8 isolates are pre-warmed and pooled per project. A fresh isolate is initialised at deploy time and kept alive across requests.</p>

<p><strong>Are isolates reused?</strong> Yes, within a request window. The runtime reuses the same isolate for consecutive requests to the same function, similar to how Node.js reuses a process. Each request gets a fresh execution context (no shared state between requests) but the V8 heap is warmed.</p>

<p><strong>What causes a cold start?</strong></p>
<ul>
  <li>First deploy to a new environment</li>
  <li>Isolate eviction after a long period of inactivity (&gt;15 minutes on Free, &gt;1 hour on Builder+)</li>
  <li>Runtime update (triggered by Flux infrastructure, not your deployments)</li>
</ul>

<p><strong>Typical cold start time:</strong> 80–150ms for a function with no large dependencies.</p>

<h2 id="concurrency">Concurrency model</h2>

<p>Each function runs inside a sandboxed Deno V8 isolate. The runtime allocates isolates in a pool per project:</p>

<table>
  <thead>
    <tr><th>Plan</th><th>Concurrent requests per project</th><th>Isolate pool size</th></tr>
  </thead>
  <tbody>
    <tr><td>Free</td><td>10</td><td>2</td></tr>
    <tr><td>Builder</td><td>50</td><td>10</td></tr>
    <tr><td>Pro</td><td>200</td><td>40</td></tr>
    <tr><td>Enterprise</td><td>Custom</td><td>Custom</td></tr>
  </tbody>
</table>

<p>Requests above the concurrency limit are queued for up to 5 seconds, then return a <code>503</code> with a <code>Retry-After</code> header. Execution records are still created for queued and rejected requests.</p>

<h2 id="trace-storage">Trace storage</h2>

<p>Execution records are stored in three tables in your project's Postgres database, managed by the Data Engine:</p>

<table>
  <thead>
    <tr><th>Table</th><th>Contains</th><th>Indexed by</th></tr>
  </thead>
  <tbody>
    <tr><td><code>trace_requests</code></td><td>Request metadata: method, path, status, timing</td><td><code>request_id</code>, <code>created_at</code></td></tr>
    <tr><td><code>execution_spans</code></td><td>Span tree: name, parent, start, duration, error</td><td><code>request_id</code>, <code>span_id</code></td></tr>
    <tr><td><code>state_mutations</code></td><td>DB mutations: table, row, column, old value, new value</td><td><code>request_id</code>, <code>table_name</code>, <code>row_id</code></td></tr>
  </tbody>
</table>

<p>You can query these tables directly with standard Postgres tooling. They are owned by the <code>flux</code> schema and are read-only outside the Data Engine.</p>

<p><strong>Storage estimates</strong></p>
<ul>
  <li>~2–5 KB per execution record (spans only)</li>
  <li>~1 KB per database mutation</li>
  <li>A project with 1M monthly executions and 2 mutations/request uses roughly 7–10 GB/month before retention pruning</li>
</ul>

<h2 id="replay-determinism">How replay guarantees determinism</h2>

<p>Replay works because every execution record includes the <strong>complete input</strong> to the request — HTTP body, headers, auth context. Re-running that input against your current code produces a new execution from an identical starting point.</p>

<p>To prevent side-effects during replay, the runtime intercepts all outbound I/O at the isolate boundary:</p>

<ul>
  <li><strong>HTTP calls</strong> — intercepted; a stub returns a recorded response from the original trace (or fails with a clear error if no recording exists)</li>
  <li><strong>Email / SMS</strong> — intercepted; send calls are no-ops that return <code>{ status: 'stubbed' }</code></li>
  <li><strong>Webhooks</strong> — intercepted; HTTP POST to external URLs returns 200 without making a real request</li>
  <li><strong>Cron / async jobs</strong> — job enqueue calls are recorded but the jobs are not dispatched</li>
  <li><strong>Database writes</strong> — pass through normally; mutations are recorded in the mutation log for comparison</li>
</ul>

<p>Because external HTTP calls return the same recorded response from the original trace, your function sees the same data at every step — even if the external service would return different data today.</p>

<h2 id="retention">Data retention</h2>

<table>
  <thead>
    <tr><th>Plan</th><th>Execution records</th><th>Mutation log</th><th>Replay window</th></tr>
  </thead>
  <tbody>
    <tr><td>Free</td><td>14 days</td><td>14 days</td><td>14 days</td></tr>
    <tr><td>Builder</td><td>30 days</td><td>30 days</td><td>30 days</td></tr>
    <tr><td>Pro</td><td>90 days</td><td>90 days</td><td>90 days</td></tr>
    <tr><td>Enterprise</td><td>Custom</td><td>Custom</td><td>Custom</td></tr>
  </tbody>
</table>

<p>Records older than the retention window are pruned nightly. Pruning removes rows from <code>trace_requests</code>, <code>execution_spans</code>, and <code>state_mutations</code>. Your application data in other tables is never affected.</p>

<h2 id="scaling">Scaling</h2>

<p><strong>Gateway</strong> — The gateway is a Rust binary that scales horizontally. It is stateless; all state is in Postgres. Load balancing and zero-downtime deploys are handled by the Flux infrastructure layer.</p>

<p><strong>Runtime</strong> — The runtime pool scales vertically (more isolates per node) up to the plan concurrency limit, and horizontally beyond that on Pro and Enterprise plans.</p>

<p><strong>Data Engine</strong> — The Data Engine is co-located with your Postgres instance. Write throughput scales with your Postgres plan. For very high mutation volumes, the Data Engine batches mutation log writes to avoid write amplification.</p>

<p><strong>Trace storage</strong> — The <code>execution_spans</code> and <code>state_mutations</code> tables are partitioned by day. Reads for long time ranges are query-planned against partitions only; old partitions are dropped atomically at retention cutoff without locking live traffic.</p>

<hr>

<p style="display:flex;gap:16px;font-size:.875rem;">
  <a href="/docs/examples">← Examples</a>
  &nbsp;·&nbsp;
  <a href="/docs/self-hosting">Self-Hosting →</a>
</p>
` }} />
  )
}

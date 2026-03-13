import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'What is an Execution Record? — Flux Docs',
  description: 'Every request Flux handles produces an execution record — a complete snapshot of everything that request did.',
}

export default function Page() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
<h1>What is an Execution Record?</h1>
<p class="page-subtitle">The core primitive everything else in Flux is built on.</p>

<p>Every request Flux handles produces an <strong>execution record</strong> — a complete snapshot of everything that request did, stored automatically, queryable from the terminal.</p>

<p>This is the single concept that makes the rest of the platform possible: traces, replays, diffs, mutation history, and regression detection all query the same underlying record.</p>

<pre style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:6px;padding:20px 24px;font-size:.82rem;line-height:1.7;overflow-x:auto"><code style="color:var(--text)">┌─────────────────────────────────────────────────────────────┐
│  Execution Record                 request_id: 550e8400      │
├─────────────────────────────────────────────────────────────┤
│  INPUT       POST /signup  { email: "a@b.com" }             │
├─────────────────────────────────────────────────────────────┤
│  SPANS       gateway              2ms  ✔                    │
│              create_user         81ms  ✔                    │
│              ├─ db.insert(users)  4ms  ✔                    │
│              └─ stripe.charge     —    ✗ timeout (10s)      │
├─────────────────────────────────────────────────────────────┤
│  MUTATIONS   users id=42  plan: free → null  (rolled back)  │
├─────────────────────────────────────────────────────────────┤
│  OUTPUT      500  44ms  Error: Stripe API timeout           │
└─────────────────────────────────────────────────────────────┘</code></pre>

<h2>What an execution record contains</h2>

<table>
  <thead>
    <tr><th>Field</th><th>Description</th></tr>
  </thead>
  <tbody>
    <tr><td><code>request_id</code></td><td>Unique identifier — used in every <code>flux</code> command</td></tr>
    <tr><td><code>request_input</code></td><td>HTTP method, path, headers, body exactly as received</td></tr>
    <tr><td><code>span_tree</code></td><td>Ordered tree of spans: gateway auth, function execution, DB queries, tool calls, async hand-offs</td></tr>
    <tr><td><code>db_mutations</code></td><td>Every INSERT / UPDATE / DELETE during this request — table, row, old value, new value</td></tr>
    <tr><td><code>response</code></td><td>Status code, body, and latency of the final response</td></tr>
    <tr><td><code>errors</code></td><td>Any exceptions thrown, including stack trace and the span where they occurred</td></tr>
    <tr><td><code>timestamps</code></td><td>Wall-clock and monotonic time at every span boundary</td></tr>
  </tbody>
</table>

<h2>How it is produced</h2>

<p>The execution record is produced by the Flux runtime as a side-effect of executing the request — no instrumentation, no SDK, no configuration required. The record is written atomically at the end of the request (or on failure) and stored in the Data Engine.</p>

<pre><code>Client
  → Gateway      (records request input, auth span)
  → Runtime      (records function spans, tool calls, errors)
  → Data Engine  (records DB mutations, links them to request_id)
  → Response     (records status, body, total latency)

All spans assembled into execution record → stored by request_id</code></pre>

<h2>Querying execution records</h2>

<p>All <code>flux</code> debugging commands are queries against execution records:</p>

<table>
  <thead>
    <tr><th>Command</th><th>What it reads from the record</th></tr>
  </thead>
  <tbody>
    <tr><td><code>flux why &lt;id&gt;</code></td><td>Errors + span tree → root cause + suggestion</td></tr>
    <tr><td><code>flux trace &lt;id&gt;</code></td><td>Span tree → full execution timeline</td></tr>
    <tr><td><code>flux trace debug &lt;id&gt;</code></td><td>Span tree → interactive step-through</td></tr>
    <tr><td><code>flux trace diff &lt;a&gt; &lt;b&gt;</code></td><td>Two span trees → structural diff</td></tr>
    <tr><td><code>flux state history &lt;table&gt; --id &lt;row&gt;</code></td><td>DB mutations for a row across all records</td></tr>
    <tr><td><code>flux state blame &lt;table&gt; --id &lt;row&gt;</code></td><td>DB mutations → per-column last-write attribution</td></tr>
    <tr><td><code>flux incident replay &lt;from&gt;..&lt;to&gt;</code></td><td>Request inputs → re-execute against current code</td></tr>
    <tr><td><code>flux bug bisect --request &lt;id&gt;</code></td><td>Request input → binary-search git history</td></tr>
  </tbody>
</table>

<h2>Storage</h2>

<p>Execution records are stored in the Data Engine alongside your PostgreSQL data. Span data is written to <code>trace_requests</code> and <code>execution_spans</code>; mutation data to <code>state_mutations</code>. All three tables are indexed by <code>request_id</code>.</p>

<p>You can query them directly with <code>flux explain</code> or via standard PostgreSQL tooling — they are plain tables in your project database.</p>

<h2>Retention</h2>

<table>
  <thead>
    <tr><th>Plan</th><th>Execution record retention</th></tr>
  </thead>
  <tbody>
    <tr><td>Free</td><td>14 days</td></tr>
    <tr><td>Builder</td><td>30 days</td></tr>
    <tr><td>Pro</td><td>90 days</td></tr>
    <tr><td>Enterprise</td><td>Custom (up to unlimited)</td></tr>
  </tbody>
</table>

<h2>Performance overhead</h2>

<p>Recording an execution record adds:</p>
<ul>
  <li><strong>Span recording</strong>: ~0.1ms per span, written asynchronously after the response is sent</li>
  <li><strong>Mutation logging</strong>: one additional write per DB mutation, batched in the same transaction at the Data Engine level — no extra round-trip</li>
  <li><strong>Network overhead</strong>: zero — all recording is in-process</li>
</ul>

<p>In practice, p99 latency overhead is under 2ms for typical functions. The recording path is never on the critical path for the HTTP response.</p>

<hr>

<p><a href="/docs/concepts">← Core Concepts</a> &nbsp;·&nbsp; <a href="/docs/common-tasks">Common Tasks →</a></p>
` }} />
  )
}

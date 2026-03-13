import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tracing Model — Flux Docs',
  description: 'How Flux builds a span tree for every request: gateway spans, runtime spans, database spans, tool calls, and async job hand-offs.',
}

export default function Page() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
<h1>Tracing Model</h1>
<p class="page-subtitle">What a span is, how they form a tree, and how that tree becomes an execution record.</p>

<h2>What is a span?</h2>

<p>A span is a single unit of work with a name, a start time, a duration, and an outcome. Every step a request takes — from arriving at the gateway to the last database write — produces a span.</p>

<p>Spans are hierarchical: each span has a parent. The root span is always the gateway receiving the request. Everything that happens downstream is a child or grandchild of that root. This tree of spans is called the <strong>span tree</strong>, and it is the core of every execution record.</p>

<pre><code>root
└─ gateway                       ← root span (request arrived)
   └─ create_user                ← function execution span
      ├─ db.insert(users)        ← database span
      ├─ stripe.charge           ← outbound HTTP span
      └─ queue.enqueue(email)    ← async hand-off span</code></pre>

<h2>Span types</h2>

<p>Flux emits five categories of spans automatically — no instrumentation required.</p>

<h3>1. Gateway spans</h3>
<p>Emitted by the API gateway when a request arrives. Contains: auth result, tenant resolution, rate limit check outcome, and the injected <code>request_id</code>. Every other span in the tree descends from this one.</p>
<pre><code>gateway  2ms
  auth_check    0.4ms  ✔ API key valid
  rate_limit    0.1ms  ✔ 18/100 req/min used
  route_match   0.3ms  → create_user</code></pre>

<h3>2. Runtime spans</h3>
<p>Emitted by the Deno runtime for each function invocation. Captures start, end, return value shape, and any uncaught exception with stack trace. The runtime span wraps everything the function does.</p>
<pre><code>create_user  81ms
  [input]   { email: "a@b.com", name: "Alice" }
  [output]  { id: 42 }  201</code></pre>

<h3>3. Database spans</h3>
<p>Emitted by the Data Engine for every <code>ctx.db.query()</code> call. Contains: the compiled SQL, parameters, execution time, rows affected, and — for INSERT/UPDATE/DELETE — the before and after row values.</p>
<pre><code>db.insert(users)  4ms
  [sql]    INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *
  [rows]   1 inserted  id=42</code></pre>
<p>This is the source of the mutation log. Every DB span with a write operation automatically produces a <code>state_mutations</code> record linked to the <code>request_id</code>. See <a href="/docs/database#mutation-logging">Mutation logging</a>.</p>

<h3>4. Outbound HTTP spans</h3>
<p>Emitted whenever your function calls an external service via <code>fetch()</code> or a built-in provider like <code>ctx.stripe</code>, <code>ctx.email</code>, or <code>ctx.slack</code>. The span records the outbound URL, method, response status, and latency.</p>
<pre><code>stripe.charge  180ms  ✗ timeout
  [url]      https://api.stripe.com/v1/charges
  [method]   POST
  [status]   — (timed out after 10s)</code></pre>
<p>During <a href="/docs/replay-incident">incident replay</a>, outbound HTTP spans are stubbed — the runtime returns the recorded response instead of making a real request, so external services are never contacted.</p>

<h3>5. Async job hand-off spans</h3>
<p>Emitted when <code>ctx.queue.enqueue()</code> is called. Records the job type, the payload, and whether the enqueue committed or was rolled back. When the job runs, its own execution record starts a new span tree with the job span tree linked to its parent via a <code>parent_request_id</code>.</p>
<pre><code>queue.enqueue(send_welcome_email)  1ms
  [job]     send_welcome_email
  [payload] { userId: 42, email: "a@b.com" }
  [status]  committed  → job req:b3c4d5e6</code></pre>

<h2>How the span tree is assembled</h2>

<p>Each component — gateway, runtime, Data Engine — emits spans independently and writes them to the <code>execution_spans</code> table keyed by <code>request_id</code>. At query time (e.g. <code>flux trace</code>) the Data Engine reads all spans for that <code>request_id</code> and assembles them into the tree using parent span IDs.</p>

<pre><code>Client
  → Gateway          emits: root span + sub-spans
  → Runtime          emits: function span + tool-call spans
  → Data Engine      emits: db query spans + mutation records
  → Response         span tree assembled and stored atomically

request_id: 550e8400
  All spans → execution_spans WHERE request_id = '550e8400'
  All mutations → state_mutations WHERE request_id = '550e8400'</code></pre>

<p>The complete assembled record is what powers every <code>flux</code> debugging command:</p>

<table>
  <thead><tr><th>Command</th><th>What it reads</th></tr></thead>
  <tbody>
    <tr><td><code>flux trace &lt;id&gt;</code></td><td>Full span tree from <code>execution_spans</code></td></tr>
    <tr><td><code>flux trace debug &lt;id&gt;</code></td><td>Spans + input/output at each step</td></tr>
    <tr><td><code>flux trace diff &lt;a&gt; &lt;b&gt;</code></td><td>Two span trees compared structurally</td></tr>
    <tr><td><code>flux why &lt;id&gt;</code></td><td>First error span + upstream mutations</td></tr>
    <tr><td><code>flux state history</code></td><td><code>state_mutations</code> for a row across all records</td></tr>
    <tr><td><code>flux state blame</code></td><td>Last writing span per column</td></tr>
    <tr><td><code>flux incident replay</code></td><td><code>request_input</code> + recorded outbound responses</td></tr>
  </tbody>
</table>

<h2>Custom spans</h2>

<p>You can emit custom spans from your function code to annotate specific operations:</p>

<pre><code>export default async function handler(req, ctx) {
  // Wrap a block in a named span
  const prices = await ctx.trace.span('fetch_prices', async () => {
    return await fetch('https://prices.internal/list').then(r => r.json())
  })

  return new Response(JSON.stringify(prices))
}</code></pre>

<p>Custom spans appear in the trace tree alongside automatic spans and are queryable with the same commands.</p>

<hr>

<p><a href="/docs/execution-record">← Execution Record</a> &nbsp;·&nbsp; <a href="/docs/database">Database →</a></p>
` }} />
  )
}

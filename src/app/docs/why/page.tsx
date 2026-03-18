import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Why Flux Exists — Flux Docs',
  description: 'The problem Flux solves: production debugging across fragmented tools replaced by a single execution record per request.',
}

export default function Page() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
<h1>Why Flux Exists</h1>
<p class="page-subtitle">The problem with production debugging today — and the idea that fixes it.</p>

<h2>The problem</h2>

<p>A request fails in production. You get an alert. Now what?</p>

<p>With a traditional backend you open several tools in different tabs:</p>

<table>
  <thead><tr><th>Tool</th><th>What you find</th><th>What's missing</th></tr></thead>
  <tbody>
    <tr><td>Log aggregator</td><td>A stack trace with a timestamp</td><td>No request body, no DB state</td></tr>
    <tr><td>Metrics dashboard</td><td>A spike in p99 latency</td><td>No idea which request caused it</td></tr>
    <tr><td>Trace UI</td><td>Spans — if you remembered to instrument</td><td>Requires SDK setup, no DB mutations</td></tr>
    <tr><td>DB console</td><td>Current row state</td><td>No history of what changed it</td></tr>
    <tr><td>Queue dashboard</td><td>A failed job</td><td>No link back to the HTTP request that enqueued it</td></tr>
  </tbody>
</table>

<p>Each tool holds a fragment of evidence. None of them share a common identifier. You spend more time correlating evidence than understanding the bug.</p>

<p>This is the normal production debugging experience in 2026. It is slow, frustrating, and completely avoidable.</p>

<h2>The insight</h2>

<p>Every production bug is caused by a request that did something unexpected.</p>

<p>If you had a complete record of exactly what that request did — every span, every database write, every input and output — you could root-cause any bug in seconds instead of hours.</p>

<p>That record already exists in your system. It is scattered. Flux assembles it.</p>

<h2>The solution: execution history</h2>

<p>Flux runs your backend inside a runtime that records every request automatically — no instrumentation, no SDK, no configuration. The result is an <strong>execution record</strong>: a single object that contains everything that request did.</p>

<pre><code>Request: POST /signup  req:550e8400

  INPUT       { email: "a@b.com" }
  SPANS       server → create_user → stripe.charge → db.insert
  MUTATIONS   users.plan: free → null  (rolled back)
  ERROR       Stripe API timeout at payments/create.ts:42
  RESPONSE    500  44ms</code></pre>

<p>With that record, debugging collapses into one command:</p>

<pre><code>$ flux why 550e8400

  ROOT CAUSE   Stripe API timeout after 10s
  LOCATION     payments/create.ts:42
  DATA CHANGES users.id=42  plan: free → null  (rolled back)
  SUGGESTION   → Add 5s timeout + idempotency key retry</code></pre>

<p>And if you want to verify your fix before deploying, you can replay the exact requests that caused the incident against your current code:</p>

<pre><code>$ flux incident replay 14:00..14:05

  23 replayed · 22 passing · 1 still failing  ← fix not complete yet</code></pre>

<h2>The analogy</h2>

<p>Git records the history of your code. Every change is stored, attributable, diffable, and revertable.</p>

<p>Flux records the history of your code <em>executing</em>. Every request is stored, attributable, diffable, and replayable.</p>

<pre><code>Git       → what your code looked like
Flux  → what your code did</code></pre>

<p>These are complementary. Git tells you what changed. Flux tells you what happened when it ran.</p>

<h2>What this enables</h2>

<table>
  <thead><tr><th>Capability</th><th>Command</th><th>What was previously required</th></tr></thead>
  <tbody>
    <tr><td>Root-cause any failure</td><td><code>flux why &lt;id&gt;</code></td><td>Grep logs, correlate trace IDs manually</td></tr>
    <tr><td>See every DB change a request made</td><td><code>flux state history</code></td><td>DB console + guesswork</td></tr>
    <tr><td>Replay an incident safely</td><td><code>flux incident replay</code></td><td>Not possible — side-effects make it unsafe</td></tr>
    <tr><td>Find the breaking commit</td><td><code>flux bug bisect</code></td><td>Manual git bisect + redeploy loop</td></tr>
    <tr><td>Compare two executions</td><td><code>flux trace diff</code></td><td>Not possible across tools</td></tr>
  </tbody>
</table>

<h2>Open source and self-hosted</h2>

<p>Flux is open source (MIT). The runtime — server, runtime engine, queue — ships as a single binary. Run it on your own infrastructure with one Postgres database as the only dependency.</p>

<pre><code><span class="shell-prompt">$</span> flux init my-app && cd my-app
<span class="shell-prompt">$</span> flux dev   <span class="cm"># starts Flux + embedded Postgres on localhost:4000</span></code></pre>

<p>No cloud account. No API keys. No telemetry. Your data stays on your server.</p>

<h2>Why a runtime, not an SDK?</h2>

<p>The first question developers ask: <em>"Can't I just add a library to my Express app?"</em></p>

<p>No. Here's why:</p>

<table>
  <thead><tr><th>Capability</th><th>Bolt-on SDK</th><th>Flux runtime</th></tr></thead>
  <tbody>
    <tr><td>Trace spans</td><td>✔ (manual instrumentation)</td><td>✔ (automatic)</td></tr>
    <tr><td>Record DB mutations in the same transaction</td><td>✗ Sits outside the database driver</td><td>✔ Server wraps the query</td></tr>
    <tr><td>Replay production traffic with side-effects disabled</td><td>✗ Can't intercept outbound calls</td><td>✔ Runtime controls all I/O</td></tr>
    <tr><td>Bisect across git history</td><td>✗ Can't re-deploy and re-execute per commit</td><td>✔ Runtime manages deploys</td></tr>
    <tr><td>Link every span to exact code version</td><td>✗ No deploy awareness</td><td>✔ Knows the code SHA for every execution</td></tr>
  </tbody>
</table>

<p>An SDK can tell you <em>that</em> something failed. A runtime can tell you <em>exactly what happened</em> and let you <strong>replay it</strong>.</p>

<p>The tradeoff is explicit: your code runs inside Flux. But migration is wrapping, not rewriting — <code>req.body</code> becomes <code>input</code>, <code>res.json()</code> becomes <code>return</code>, <code>db.query()</code> becomes <code>ctx.db.query()</code>. Start with one endpoint. Run Flux alongside your existing stack. Migrate at your own pace.</p>

<h2>What Flux is not</h2>

<ul>
  <li><strong>Not a log aggregator.</strong> Logs are unstructured. Execution records are structured around request IDs and span trees.</li>
  <li><strong>Not an APM / metrics platform.</strong> APMs tell you something is wrong. Flux tells you exactly what happened and lets you replay it.</li>
  <li><strong>Not a distributed tracing system.</strong> Tracing requires SDK instrumentation. Flux records automatically at the runtime level.</li>
  <li><strong>Not a serverless platform.</strong> Flux runs your functions, but it's not a cloud compute layer. It's a self-hosted runtime where the primary value is execution history and debugging — not autoscaling to zero.</li>
</ul>

<hr>

<p><a href="/docs">← Documentation</a> &nbsp;·&nbsp; <a href="/docs/quickstart">Quickstart →</a></p>
` }} />
  )
}

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Architecture — Flux Docs',
  description: 'How Flux works: Server, Runtime, and Postgres — the complete backend flow stack.',
}

export default function Page() {
  return (
    <div
      dangerouslySetInnerHTML={{ __html: `<h1>Architecture</h1>
<p class="page-subtitle">How Flux works: the three components that turn your code into a fully observable, production-ready system.</p>

<h2>Overview</h2>
<p>Flux is built around a beautifully simple architecture. Instead of stringing together dozens of microservices, Flux consists of three core Rust binaries that work closely with your Postgres database. Each binary has a single responsibility and inherently records execution state.</p>

<div class="arch-diagram">
  Client / curl<br>
  &nbsp;&nbsp;&nbsp;&nbsp;↓<br>
  <strong style="color:var(--accent)">[ Server (flux-server) ]</strong> &nbsp;&nbsp;&nbsp;&nbsp;gRPC coordination · async queue · trace aggregation<br>
  &nbsp;&nbsp;&nbsp;&nbsp;↓ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;x-request-id propagated<br>
  <strong style="color:#f9a8d4">[ Runtime (flux-runtime) ]</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Deno isolate execution · ctx injection<br>
  &nbsp;&nbsp;&nbsp;&nbsp;↓ <br>
  <strong style="color:#60a5fa">[ Your PostgreSQL ]</strong> &nbsp;&nbsp;&nbsp;execution store · application state
</div>

<h2>The Three Binaries</h2>

<div class="arch-layer">
  <div class="arch-layer-badge">CLI (flux)</div>
  <div class="arch-layer-desc">
    <h3>Developer commands and tracing</h3>
    <p>The <code>flux</code> CLI is what you use on your workstation and in CI. It provides commands like <code>flux deploy</code> to push your code to the server, and observability commands like <code>flux trace</code>, <code>flux why</code>, and <code>flux incident replay</code> to pull and inspect the execution store.</p>
  </div>
</div>

<div class="arch-layer">
  <div class="arch-layer-badge">Server (flux-server)</div>
  <div class="arch-layer-desc">
    <h3>Coordination and infrastructure</h3>
    <p>The <code>flux-server</code> acts as the brains of the operation. It receives incoming network requests, schedules background execution tasks, handles distributed tracing, and commits execution records into the Postgres store.</p>
  </div>
</div>

<div class="arch-layer">
  <div class="arch-layer-badge">Runtime (flux-runtime)</div>
  <div class="arch-layer-desc">
    <h3>Function execution</h3>
    <p>The <code>flux-runtime</code> isolates every execution natively in Deno V8. It intercepts side effects — like a <code>fetch</code> call or a query to your database — to ensure everything is strictly tracked and appended as a span back to the server. The runtime has absolutely no access to the filesystem by default.</p>
  </div>
</div>

<h2>Request lifecycle</h2>
<p>Here is what happens on every synchronous API call:</p>
<ol>
  <li>Client sends a request directly to the <code>flux-server</code>.</li>
  <li>Server authenticates the request, generates an <code>x-request-id</code> (e.g. <code>9c3e7f1a</code>), and launches a request to the Runtime.</li>
  <li>Runtime spins up a Deno isolate, initialises context with <code>traceId = "9c3e7f1a"</code>, and calls your code.</li>
  <li>Your code executes <code>ctx.db.query(...)</code> or <code>fetch(...)</code>.</li>
  <li>Runtime executes the side-effect, pauses, and writes a span of the outcome back to the server.</li>
  <li>All completed spans are persisted to the execution store under <code>9c3e7f1a</code>.</li>
  <li><code>flux trace 9c3e7f1a</code> pulls the execution directly from Postgres to assemble the event tree.</li>
</ol>

<h2>Key design principles</h2>
<table>
  <thead><tr><th>Principle</th><th>What it means</th></tr></thead>
  <tbody>
    <tr><td><strong>Trace ID is the thread</strong></td><td>The <code>x-request-id</code> is the single thread that connects all executions. Everything triggered by an initial request shares the ID.</td></tr>
    <tr><td><strong>No user-side SDK</strong></td><td>You never import an observability SDK or add tracing logs. Spans are handled at the runtime level natively.</td></tr>
    <tr><td><strong>Async is first-class</strong></td><td>Background work is not an afterthought. The server operates an internal task queue so async function calls enjoy the same determinism and tracing as synchronous paths.</td></tr>
  </tbody>
</table>

<hr>
<p style="display:flex;gap:16px;font-size:.875rem;">
  <a href="/docs/observability">← Observability</a>
  <a href="/docs/tracing-model">Next: Tracing Model →</a>
</p>` }}
    />
  )
}


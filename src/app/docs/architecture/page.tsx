import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Architecture — Flux',
  description: 'How Flux works: three Rust binaries, Postgres-backed execution records, and the replay/resume model.',
}

export default function Page() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
<h1>Architecture</h1>
<p class="page-subtitle">Three Rust binaries. One Postgres database. No cloud required.</p>

<h2>Overview</h2>

<p>Flux is three independent binaries that work together:</p>

<table>
  <thead><tr><th>Binary</th><th>Role</th></tr></thead>
  <tbody>
    <tr><td><code>flux-runtime</code></td><td>Runs your TypeScript app via Deno V8. Records every request: inputs, outputs, console logs, IO checkpoints.</td></tr>
    <tr><td><code>flux-server</code></td><td>Stores execution records in Postgres. Serves the gRPC API that the CLI and runtime use.</td></tr>
    <tr><td><code>flux</code> (CLI)</td><td>Developer tools — <code>tail</code>, <code>why</code>, <code>trace</code>, <code>replay</code>, <code>resume</code>.</td></tr>
  </tbody>
</table>

<p>All state lives in a single Postgres database. No microservices, no cloud account, no data leaving your infrastructure.</p>

<h2>Request lifecycle</h2>

<p>When a request arrives:</p>
<ol>
  <li>The runtime executes your TypeScript handler (via Deno V8)</li>
  <li>Every Postgres query or Redis call goes through a recorded checkpoint</li>
  <li>Console output is captured</li>
  <li>On completion (success or error), the full execution record is sent to the server and stored in Postgres</li>
  <li><code>flux tail</code> streams this event in real-time</li>
</ol>

<h2>The replay / resume model</h2>

<p>This is the core of what makes Flux different:</p>

<table>
  <thead><tr><th>Command</th><th>Mode</th><th>What it does</th></tr></thead>
  <tbody>
    <tr>
      <td><code>flux replay</code></td>
      <td><strong>Safe</strong></td>
      <td>Re-runs the request using <em>recorded checkpoints</em> for all IO. The real database is never touched. Stops cleanly at IO boundaries where no checkpoint was recorded (e.g., when original request failed before reaching the DB).</td>
    </tr>
    <tr>
      <td><code>flux resume</code></td>
      <td><strong>Live</strong></td>
      <td>Re-runs the request with real IO — actually writes to Postgres, calls external services. Use this after <code>replay</code> confirms your fix works.</td>
    </tr>
  </tbody>
</table>

<div class="callout callout-info">
  <div class="callout-title">replay = investigation. resume = action.</div>
  <p>This separation is intentional. <code>replay</code> is always safe to run — it cannot accidentally mutate your database. <code>resume</code> has a confirmation prompt because it performs real side effects.</p>
</div>

<h2>What gets recorded</h2>

<p>For every request, Flux records:</p>
<ul>
  <li>HTTP method, path, status code, duration</li>
  <li>Request body and headers</li>
  <li>Console output (<code>console.log</code>, errors, stack traces)</li>
  <li>IO checkpoints: every Postgres query, Redis command, etc. — request + response</li>
  <li>Final output or error</li>
</ul>

<h2>Deployment</h2>

<p>Minimal production setup:</p>
<pre><code><span class="cm"># start the server</span>
<span class="shell-prompt">$</span> DATABASE_URL=postgres://... flux-server

<span class="cm"># serve your app</span>
<span class="shell-prompt">$</span> DATABASE_URL=postgres://... flux serve index.ts</code></pre>

<p>Or with Docker — two containers (your app + Postgres) is the complete stack.</p>
` }}
    />
  )
}

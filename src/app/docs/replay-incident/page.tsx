import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Replay a Production Incident — Flux Docs',
  description: 'Re-run a time window of production requests against your fixed code. Side-effects disabled. Verify your fix before deploying.',
}

export default function Page() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
<h1>Replay a Production Incident</h1>
<p class="page-subtitle">Verify your fix against the exact requests that caused the incident — before you deploy.</p>

<p><em>Scenario: you've fixed the Stripe timeout bug. You want to confirm the incident is resolved without deploying to production blind.</em></p>

<h2>Step 1 — Identify the incident time window</h2>

<p>From <code>flux tail</code>, your alert, or your monitoring tool, find the start and end time of the incident:</p>

<pre><code>$ flux tail --filter status=500 --since 2h

  POST /signup  500  44ms  req:550e8400  14:22:01
  POST /signup  500  51ms  req:7a8b9c0d  14:22:44
  POST /signup  500  38ms  req:1b2c3d4e  14:23:10

  # Incident window: 14:00 → 14:30</code></pre>

<h2>Step 2 — Replay that window against your current code</h2>

<pre><code>$ flux incident replay 14:00..14:30

  Replaying 47 requests from 14:00–14:30…

  Side-effects: hooks off · events off · cron off
  Database writes: on · mutation log: on

  ✔  req:4f9a3b2c  POST /create_user   200  81ms
  ✔  req:a3c91ef0  GET  /list_users    200  12ms
  ✔  req:550e8400  POST /signup        200  88ms  ← was 500
  ✔  req:7a8b9c0d  POST /signup        200  91ms  ← was 500

  47 replayed · 47 passing · 0 still failing  ✔ incident resolved</code></pre>

<p>All passing — safe to deploy.</p>

<h2>What is safe during replay</h2>

<table>
  <thead><tr><th>Side-effect type</th><th>During replay</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td>Outbound HTTP (webhooks, Stripe, Slack)</td><td>Stubbed</td><td>Returns the recorded response from the original trace</td></tr>
    <tr><td>Email / SMS sending</td><td>Disabled</td><td>Send calls return <code>{ status: "stubbed" }</code></td></tr>
    <tr><td>Cron / scheduled jobs</td><td>Disabled</td><td>No jobs are dispatched during replay</td></tr>
    <tr><td>Async job enqueue</td><td>Recorded, not dispatched</td><td>Jobs appear in mutation log but don't run</td></tr>
    <tr><td>Database reads</td><td>Live</td><td>Reads your current database state</td></tr>
    <tr><td>Database writes</td><td>Enabled</td><td>Mutations are recorded in the log for comparison</td></tr>
  </tbody>
</table>

<p><strong>Important:</strong> because database writes are enabled, replaying against a development database is recommended if your production schema is sensitive. Replay against production is safe for read-heavy workloads but will produce real DB mutations.</p>

<h2>Replay a single request</h2>

<p>If you only want to replay one specific request:</p>

<pre><code>$ flux incident replay --request 550e8400

  Replaying req:550e8400…
  ✔  POST /signup  200  88ms  ← was 500</code></pre>

<h2>How determinism works</h2>

<p>Replay uses the <code>request_input</code> from the original execution record (HTTP body, headers, auth context) as the input to the re-execution. Outbound API calls return the same recorded responses from the original trace, so your function sees identical data at every step — even if the external service would return different data today.</p>

<p>See the <a href="/docs/production#replay-determinism">production guide</a> for a detailed breakdown of the determinism guarantees.</p>

<hr>

<p><a href="/docs/debug-incident">← Debug a Production Incident</a> &nbsp;·&nbsp; <a href="/docs/inspect-mutations">Inspect Database Mutations →</a></p>
` }} />
  )
}

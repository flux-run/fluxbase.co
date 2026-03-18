import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Common Tasks — Flux Docs',
  description: 'Step-by-step workflows for the most common production debugging tasks: incidents, replays, mutations, regressions.',
}

export default function Page() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
<h1>Common Tasks</h1>
<p class="page-subtitle">Copy-paste workflows for the things you actually do in production.</p>

<nav style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;padding:16px 20px;margin:0 0 40px;">
  <div style="font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:10px;">On this page</div>
  <div style="display:flex;flex-direction:column;gap:4px;font-size:.875rem;">
    <a href="#debug-incident" style="color:var(--accent);text-decoration:none;">Debug a production incident</a>
    <a href="#replay-incident" style="color:var(--accent);text-decoration:none;">Replay a failed request</a>
    <a href="#inspect-mutations" style="color:var(--accent);text-decoration:none;">Inspect database mutations</a>
    <a href="#compare-executions" style="color:var(--accent);text-decoration:none;">Compare two executions</a>
    <a href="#find-regression" style="color:var(--accent);text-decoration:none;">Find the commit that broke a request</a>
  </div>
</nav>

<h2 id="debug-incident">Debug a production incident</h2>

<p><em>Scenario: a user reports that checkout failed. You have no idea why.</em></p>

<p><strong>Step 1</strong> — Stream live requests and find the failed request ID:</p>
<pre><code>$ flux tail

  POST /checkout    201  120ms  req:4f9a3b2c
  POST /checkout    500   44ms  req:550e8400
     └─ Error: Stripe API timeout</code></pre>

<p><strong>Step 2</strong> — Get the root cause instantly:</p>
<pre><code>$ flux why 550e8400

  ROOT CAUSE   Stripe API timeout after 10s
  LOCATION     payments/create.ts:42
  DATA CHANGES users.id=42  plan: free → null  (rolled back)
  SUGGESTION   → Add 5s timeout + idempotency key retry</code></pre>

<p><strong>Step 3</strong> — If you need to see the full execution:</p>
<pre><code>$ flux trace 550e8400

  server                    2ms
  └─ create_order           8ms
     ├─ db.insert(orders)   4ms
     ├─ stripe.charge     180ms  ← timeout here
     └─ send_slack          — skipped (upstream error)</code></pre>

<p>Total time from alert to root cause: under 30 seconds.</p>

<h2 id="replay-incident">Replay a failed request</h2>

<p><em>Scenario: you fixed the Stripe timeout bug. You want to verify the incident is resolved before deploying.</em></p>

<p><strong>Step 1</strong> — Identify the time window of the incident (from <code>flux tail</code> or your alert).</p>

<p><strong>Step 2</strong> — Replay that window against your current code:</p>
<pre><code>$ flux incident replay 14:00..14:05

  Replaying 23 requests from 14:00–14:05…

  Side-effects: hooks off · events off · cron off
  Database writes: on · mutation log: on

  ✔  req:4f9a3b2c  POST /create_user   200  81ms
  ✔  req:a3c91ef0  GET  /list_users    200  12ms
  ✗  req:550e8400  POST /signup        500  44ms
     └─ Still failing: Stripe timeout

  23 replayed · 22 passing · 1 still failing</code></pre>

<p><strong>What is safe during replay?</strong></p>

<table>
  <thead>
    <tr><th>Side-effect</th><th>During replay</th></tr>
  </thead>
  <tbody>
    <tr><td>Outbound HTTP (webhooks, Stripe, Slack)</td><td>Disabled — requests are stubbed</td></tr>
    <tr><td>Email sending</td><td>Disabled</td></tr>
    <tr><td>Cron / scheduled jobs</td><td>Disabled</td></tr>
    <tr><td>Database writes</td><td>Enabled — runs against current schema</td></tr>
    <tr><td>Mutation log</td><td>Enabled — can be compared to original</td></tr>
    <tr><td>Async job enqueueing</td><td>Disabled — jobs are recorded but not executed</td></tr>
  </tbody>
</table>

<p>Replay is always against your <strong>current deployed code</strong> for the current environment. It does not affect production data unless you explicitly target the production environment.</p>

<h2 id="inspect-mutations">Inspect database mutations</h2>

<p><em>Scenario: a database row is in a wrong state and you don't know what changed it.</em></p>

<p><strong>Get full mutation history for a row:</strong></p>
<pre><code>$ flux state history users --id 42

  users id=42  (4 mutations)

  2026-03-10 12:00  INSERT  email=a@b.com, plan=free
  2026-03-10 14:21  UPDATE  name: null → Alice Smith    req:a3c91ef0
  2026-03-10 14:22  UPDATE  plan: free → pro            req:4f9a3b2c
  2026-03-10 14:22  UPDATE  plan: pro → null (rollback) req:550e8400</code></pre>

<p><strong>Find which request owns each column's current value:</strong></p>
<pre><code>$ flux state blame users --id 42

  email   a@b.com   req:4f9a3b2c  12:00:00
  name    Alice     req:a3c91ef0  14:21:59
  plan    free      req:550e8400  14:22:01  ✗ rolled back</code></pre>

<p>Each <code>req:</code> ID can be passed to <code>flux why</code> or <code>flux trace</code> to understand exactly what caused that mutation.</p>

<h2 id="compare-executions">Compare two executions</h2>

<p><em>Scenario: the same endpoint started behaving differently after a deploy. You want to see exactly what changed.</em></p>

<p><strong>Diff two request traces span-by-span:</strong></p>
<pre><code>$ flux trace diff 4f9a3b2c 550e8400

  SPAN              BEFORE       AFTER
  ─────────────────────────────────────────────────────
  server            2ms          2ms          — same
  create_order      81ms         44ms         — faster
  ├─ db.insert      4ms          4ms          — same
  ├─ stripe.charge  68ms         → timeout    ✗ changed
  └─ send_slack     7ms          — skipped    ✗ missing</code></pre>

<p>You can diff any two requests — they don't need to be the same endpoint. This is useful for A/B comparisons or checking how behaviour changed across a deploy.</p>

<h2 id="find-regression">Find the commit that broke a request</h2>

<p><em>Scenario: a request that was passing last week is now failing. You have 40 commits to search through.</em></p>

<p><strong>Step 1</strong> — Find the failing request ID with <code>flux tail</code> or from your logs.</p>

<p><strong>Step 2</strong> — Run bisect:</p>
<pre><code>$ flux bug bisect --request 550e8400

  Bisecting 42 commits (2026-03-01..2026-03-10)…

  Testing abc123…  ✔ passes
  Testing fde789…  ✔ passes
  Testing def456…  ✗ fails

  FIRST BAD COMMIT
  def456  "feat: add retry logic to stripe.charge"
  2026-03-08 by alice@example.com

  → Compare before/after:
     flux trace diff abc123:550e8400 def456:550e8400</code></pre>

<p><strong>How bisect works:</strong></p>
<ol>
  <li>Checks out each commit in bisect order</li>
  <li>Re-runs the request input against the code at that commit</li>
  <li>Compares the response + span signature to determine pass/fail</li>
  <li>Continues until it isolates the first failing commit</li>
</ol>

<p>This requires your project to be a git repository with <code>flux</code> auth configured for CI use.</p>

<hr>

<p><a href="/docs/execution-record">← Execution Record</a> &nbsp;·&nbsp; <a href="/docs/examples">Examples →</a></p>
` }} />
  )
}

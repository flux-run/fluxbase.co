import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CLI Reference — Flux Docs',
  description: 'Complete reference for the flux CLI: every command, flag, argument, and example.',
}

export default function Page() {
  return (
    <div
      dangerouslySetInnerHTML={{ __html: `<h1>CLI Reference</h1>
<p class="page-subtitle">Complete reference for the <code>flux</code> command-line tool.</p>

<h2>Installation</h2>
<pre><code>$ curl -fsSL https://fluxbase.co/install | bash
$ flux --version</code></pre>

<h2>Command index</h2>
<table>
  <thead><tr><th>Command</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td colspan="2" style="color:var(--muted);font-size:.75rem;font-weight:700;letter-spacing:.08em;padding-top:12px">SETUP</td></tr>
    <tr><td><code>flux login</code></td><td>Authenticate with Flux</td></tr>
    <tr><td><code>flux create</code></td><td>Scaffold a new project from a template</td></tr>
    <tr><td><code>flux init</code></td><td>Link current directory to an existing project</td></tr>
    <tr><td><code>flux dev</code></td><td>Run functions locally with hot reload</td></tr>
    <tr><td><code>flux doctor</code></td><td>Check CLI config and connectivity</td></tr>
    <tr><td colspan="2" style="color:var(--muted);font-size:.75rem;font-weight:700;letter-spacing:.08em;padding-top:12px">DEPLOY</td></tr>
    <tr><td><code>flux deploy</code></td><td>Deploy functions to production</td></tr>
    <tr><td><code>flux invoke</code></td><td>Invoke a deployed function</td></tr>
    <tr><td colspan="2" style="color:var(--muted);font-size:.75rem;font-weight:700;letter-spacing:.08em;padding-top:12px">MONITORING</td></tr>
    <tr><td><code>flux tail</code></td><td>Stream live requests in real time</td></tr>
    <tr><td><code>flux logs</code></td><td>Query historical function logs</td></tr>
    <tr><td colspan="2" style="color:var(--muted);font-size:.75rem;font-weight:700;letter-spacing:.08em;padding-top:12px">DEBUGGING</td></tr>
    <tr><td><code>flux why</code></td><td>Root-cause why a request failed</td></tr>
    <tr><td><code>flux trace</code></td><td>Show the full span tree for a request</td></tr>
    <tr><td><code>flux trace debug</code></td><td>Step through a request span-by-span</td></tr>
    <tr><td><code>flux trace diff</code></td><td>Compare two requests span-by-span</td></tr>
    <tr><td colspan="2" style="color:var(--muted);font-size:.75rem;font-weight:700;letter-spacing:.08em;padding-top:12px">DATA</td></tr>
    <tr><td><code>flux state history</code></td><td>Show every mutation to a database row</td></tr>
    <tr><td><code>flux state blame</code></td><td>Show the last writer for each column</td></tr>
    <tr><td colspan="2" style="color:var(--muted);font-size:.75rem;font-weight:700;letter-spacing:.08em;padding-top:12px">INCIDENT TOOLS</td></tr>
    <tr><td><code>flux incident replay</code></td><td>Replay a traffic window against current code</td></tr>
    <tr><td><code>flux bug bisect</code></td><td>Binary-search commits to find a regression</td></tr>
    <tr><td colspan="2" style="color:var(--muted);font-size:.75rem;font-weight:700;letter-spacing:.08em;padding-top:12px">QUERY TOOLS</td></tr>
    <tr><td><code>flux explain</code></td><td>Preview the query plan for a <code>ctx.db</code> call</td></tr>
    <tr><td colspan="2" style="color:var(--muted);font-size:.75rem;font-weight:700;letter-spacing:.08em;padding-top:12px">PROJECT MANAGEMENT</td></tr>
    <tr><td><code>flux secrets</code></td><td>Manage project secrets</td></tr>
    <tr><td><code>flux project</code></td><td>Create, list, update, and delete projects</td></tr>
    <tr><td><code>flux api-key</code></td><td>Create, list, revoke, and rotate API keys</td></tr>
    <tr><td><code>flux db push</code></td><td>Apply pending schema migrations</td></tr>
    <tr><td><code>flux queue</code></td><td>Inspect dead-letter queue and replay jobs</td></tr>
  </tbody>
</table>

<!-- ─── SETUP ────────────────────────────────────────────────────────────── -->


<h2 id="flux-login">flux login</h2>
<p>Authenticate with your Flux instance. Saves a token to <code>~/.config/flux/config.toml</code>.</p>
<pre><code>flux login [--host &lt;url&gt;]</code></pre>
<pre><code>$ flux login --host http://localhost:4000
  ✔ Authenticated with localhost:4000</code></pre>

<hr>

<h2 id="flux-create">flux create</h2>
<p>Scaffold a new project from a built-in template.</p>
<pre><code>flux create &lt;name&gt; [--template &lt;slug&gt;]</code></pre>
<table>
  <thead><tr><th>Flag</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>--template</code>, <code>-t</code></td><td>Template slug. If omitted, shows interactive picker.</td></tr>
  </tbody>
</table>
<p><strong>Available templates:</strong></p>
<table>
  <thead><tr><th>Slug</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>todo-api</code></td><td>Full CRUD REST API with Postgres</td></tr>
    <tr><td><code>webhook-worker</code></td><td>Webhook receiver and event processor</td></tr>
    <tr><td><code>ai-backend</code></td><td>AI/LLM proxy with logging and caching</td></tr>
  </tbody>
</table>
<pre><code># Interactive picker
$ flux create my-app

# With template
$ flux create my-app --template todo-api</code></pre>

<hr>

<h2 id="flux-init">flux init</h2>
<p>Link the current directory to an existing Flux project. Creates a <code>.flux</code> config file.</p>
<pre><code>flux init --project &lt;project-id&gt;</code></pre>
<pre><code>$ flux init --project proj_abc123
  ✔ Linked to project "my-app"  (.flux)</code></pre>

<hr>

<h2 id="flux-dev">flux dev</h2>
<p>Run all functions in <code>functions/</code> locally with hot reload. Shares the same <code>ctx</code> API as production.</p>
<pre><code>flux dev [--port &lt;n&gt;]</code></pre>
<table>
  <thead><tr><th>Flag</th><th>Default</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>--port</code>, <code>-p</code></td><td><code>7700</code></td><td>Local port to listen on</td></tr>
    <tr><td><code>--no-db</code></td><td>false</td><td>Disable database; useful for pure logic testing</td></tr>
  </tbody>
</table>
<pre><code>$ flux dev
  ✔ Watching functions/   (5 functions)
  ✔ Listening on          http://localhost:7700</code></pre>

<hr>

<h2 id="flux-doctor">flux doctor</h2>
<p>Check CLI configuration and connectivity.</p>
<pre><code>flux doctor</code></pre>
<pre><code>$ flux doctor

  ✔ CLI version:        0.1.0
  ✔ Config file:        ~/.config/flux/config.toml
  ✔ Authenticated:      you@example.com
  ✔ API reachable:      http://localhost:4000  (42ms)
  ✔ Gateway reachable:  https://localhost:4000   (38ms)</code></pre>

<!-- ─── DEPLOY ──────────────────────────────────────────────────────────── -->

<h2 id="flux-deploy">flux deploy</h2>
<p>Bundle and deploy functions to production.</p>
<pre><code>flux deploy [--name &lt;fn-name&gt;] [--runtime &lt;runtime&gt;] [--dry-run]</code></pre>
<ul>
  <li>Run from the <strong>project root</strong> to deploy all functions in <code>functions/</code>.</li>
  <li>Run from inside a <strong>function directory</strong> (contains <code>flux.json</code>) to deploy just that function.</li>
</ul>
<table>
  <thead><tr><th>Flag</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>--name</code></td><td>Override function name (single-function mode)</td></tr>
    <tr><td><code>--runtime</code></td><td>Override runtime: <code>deno</code> (default) | <code>node</code></td></tr>
    <tr><td><code>--dry-run</code></td><td>Bundle and validate without uploading</td></tr>
    <tr><td><code>--env</code></td><td>Target environment: <code>production</code> (default) | <code>staging</code></td></tr>
  </tbody>
</table>
<pre><code># Deploy all functions
$ flux deploy

# Deploy a single function
$ flux deploy --name create_user

# Validate bundle without deploying
$ flux deploy --dry-run</code></pre>

<hr>

<h2 id="flux-invoke">flux invoke</h2>
<p>Invoke a deployed function directly, bypassing the gateway.</p>
<pre><code>flux invoke &lt;name&gt; [--payload &lt;json&gt;] [--gateway] [--env &lt;env&gt;]</code></pre>
<table>
  <thead><tr><th>Flag</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>--payload</code></td><td>JSON body to pass as input</td></tr>
    <tr><td><code>--gateway</code></td><td>Route through the API gateway (auth + rate-limiting apply)</td></tr>
    <tr><td><code>--env</code></td><td>Target environment: <code>production</code> (default) | <code>staging</code></td></tr>
  </tbody>
</table>
<pre><code>$ flux invoke create_user --payload '{"email":"a@b.com"}'

  201  81ms  req:4f9a3b2c
  { "id": 42, "email": "a@b.com" }</code></pre>

<!-- ─── MONITORING ──────────────────────────────────────────────────────── -->

<h2 id="flux-tail">flux tail</h2>
<p>Stream live requests and their outcomes in real time. This is the starting point for most debugging workflows.</p>
<pre><code>flux tail [--filter &lt;expr&gt;] [--since &lt;duration&gt;] [--last &lt;n&gt;]</code></pre>
<table>
  <thead><tr><th>Flag</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>--filter</code></td><td>Filter expression (repeatable). Keys: <code>status=&lt;code&gt;</code>, <code>path=&lt;path&gt;</code>, <code>function=&lt;name&gt;</code>, <code>type=job</code>, <code>req=&lt;id&gt;</code></td></tr>
    <tr><td><code>--since</code></td><td>Show requests from this far back. Examples: <code>1h</code>, <code>30m</code>, <code>24h</code></td></tr>
    <tr><td><code>--last</code></td><td>Number of recent requests to show before streaming</td></tr>
    <tr><td><code>--no-stream</code></td><td>Print batch and exit without streaming</td></tr>
  </tbody>
</table>
<pre><code># Stream all live requests
$ flux tail

  POST /signup        201  81ms   req:4f9a3b2c
  GET  /users         200  12ms   req:a3c91ef0
  POST /checkout      500  44ms   req:550e8400
     └─ Error: Stripe API timeout

# Only failures from the last hour
$ flux tail --filter status=500 --since 1h

# Only async job runs
$ flux tail --filter type=job

# Only requests to a specific path
$ flux tail --filter path=/stripe_webhook

# Combine filters
$ flux tail --filter path=/checkout --filter status=500 --since 1h</code></pre>

<hr>

<h2 id="flux-logs">flux logs</h2>
<p>Query historical function logs (stdout / stderr output from function code).</p>
<pre><code>flux logs [--function &lt;name&gt;] [--tail] [--limit &lt;n&gt;] [--since &lt;duration&gt;]</code></pre>
<table>
  <thead><tr><th>Flag</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>--function</code></td><td>Filter to a specific function name</td></tr>
    <tr><td><code>--tail</code></td><td>Keep streaming new log entries</td></tr>
    <tr><td><code>--limit</code></td><td>Max number of entries to return</td></tr>
    <tr><td><code>--since</code></td><td>How far back to query. Examples: <code>1h</code>, <code>30m</code></td></tr>
  </tbody>
</table>
<pre><code>$ flux logs --function create_user --limit 50 --since 1h</code></pre>

<!-- ─── DEBUGGING ──────────────────────────────────────────────────────── -->

<h2 id="flux-why">flux why</h2>
<p>Read the execution record for a request and return the root cause of failure, the exact file and line, any database mutations made (including rollbacks), and a suggested fix. The fastest way to go from request ID to root cause.</p>
<pre><code>flux why &lt;request-id&gt;</code></pre>
<table>
  <thead><tr><th>Argument</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>&lt;request-id&gt;</code></td><td>The <code>req:</code> ID from <code>flux tail</code> output or the <code>x-request-id</code> response header</td></tr>
  </tbody>
</table>
<pre><code>$ flux why 550e8400

  ROOT CAUSE   Stripe API timeout after 10s
  LOCATION     payments/create.ts:42
  DATA CHANGES users.id=42  plan: free → null  (rolled back)
  SUGGESTION   → Add 5s timeout + idempotency key retry</code></pre>

<hr>

<h2 id="flux-trace">flux trace</h2>
<p>Show the full span tree for a request — every function call, database query, outbound API call, and async hand-off with durations and outcomes.</p>
<pre><code>flux trace &lt;request-id&gt;</code></pre>
<pre><code>$ flux trace 550e8400

  gateway                   2ms
  └─ create_order           8ms
     ├─ db.insert(orders)   4ms
     ├─ stripe.charge     180ms  ✗ timeout
     └─ send_slack          —    skipped (upstream error)</code></pre>

<hr>

<h2 id="flux-trace-debug">flux trace debug</h2>
<p>Step through a request execution span-by-span in an interactive terminal UI. Shows the input and output at each step.</p>
<pre><code>flux trace debug &lt;request-id&gt;</code></pre>
<pre><code>$ flux trace debug 550e8400

  Step 2/4  create_order
  ──────────────────────────────────────────────
  Input:   { userId: 42, items: [...] }
  Output:  { orderId: "o_881" }
  Time:    8ms

  ↓ next  ↑ prev  e expand input/output  q quit</code></pre>

<hr>

<h2 id="flux-trace-diff">flux trace diff</h2>
<p>Compare two execution records span-by-span. Highlights spans that changed in duration, result, or presence. Useful for comparing a passing and failing version of the same request.</p>
<pre><code>flux trace diff &lt;request-id-a&gt; &lt;request-id-b&gt;
flux trace diff &lt;commit-a&gt;:&lt;request-id&gt; &lt;commit-b&gt;:&lt;request-id&gt;</code></pre>
<pre><code>$ flux trace diff 4f9a3b2c 550e8400

  SPAN              REQUEST A       REQUEST B
  ──────────────────────────────────────────────────────
  gateway           2ms             2ms               —
  create_order      81ms            44ms              faster
  ├─ db.insert      4ms             4ms               —
  ├─ stripe.charge  68ms ✔          → timeout (10s)   ✗ changed
  └─ send_slack     7ms ✔           — skipped         ✗ missing</code></pre>

<!-- ─── DATA ────────────────────────────────────────────────────────────── -->

<h2 id="flux-state-history">flux state history</h2>
<p>Show the full mutation history for a database row — every INSERT, UPDATE, and DELETE, each linked to the request that caused it.</p>
<pre><code>flux state history &lt;table&gt; --id &lt;row-id&gt; [--since &lt;duration&gt;] [--request &lt;id&gt;] [--format &lt;fmt&gt;]
flux state history --request &lt;id&gt;</code></pre>
<table>
  <thead><tr><th>Flag</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>--id</code></td><td>Row identifier (primary key value)</td></tr>
    <tr><td><code>--since</code></td><td>How far back to search</td></tr>
    <tr><td><code>--between</code></td><td>ISO timestamp range: <code>2026-03-10T14:00 2026-03-10T15:00</code></td></tr>
    <tr><td><code>--request</code>, <code>--filter req=&lt;id&gt;</code></td><td>Filter to mutations caused by a specific request</td></tr>
    <tr><td><code>--filter job=&lt;id&gt;</code></td><td>Filter to mutations caused by a specific job run</td></tr>
    <tr><td><code>--format</code></td><td><code>table</code> (default) | <code>json</code> | <code>csv</code></td></tr>
  </tbody>
</table>
<pre><code>$ flux state history users --id 42

  users id=42  (4 mutations)

  2026-03-10 12:00  INSERT  email=a@b.com, plan=free        req:1a2b3c4d
  2026-03-10 14:21  UPDATE  name: null → Alice Smith        req:a3c91ef0
  2026-03-10 14:22  UPDATE  plan: free → pro                req:4f9a3b2c
  2026-03-10 14:22  UPDATE  plan: pro → null  (rolled back) req:550e8400

# All tables mutated by one request
$ flux state history --request 550e8400</code></pre>

<hr>

<h2 id="flux-state-blame">flux state blame</h2>
<p>Show the last successful writer for each column of a database row — analogous to <code>git blame</code> but for database state.</p>
<pre><code>flux state blame &lt;table&gt; --id &lt;row-id&gt;</code></pre>
<pre><code>$ flux state blame users --id 42

  email   a@b.com   req:1a2b3c4d  2026-03-10 12:00
  name    Alice     req:a3c91ef0  2026-03-10 14:21
  plan    free      req:550e8400  2026-03-10 14:22  ✗ rolled back</code></pre>
<p>A <code>✗ rolled back</code> marker means the most recent write attempt was reverted — the displayed value is from the previous successful write.</p>

<!-- ─── INCIDENT TOOLS ─────────────────────────────────────────────────── -->

<h2 id="flux-incident-replay">flux incident replay</h2>
<p>Re-run a window of production traffic against your current code. Outbound HTTP calls are stubbed with recorded responses so external services are not contacted. Database writes are enabled by default.</p>
<pre><code>flux incident replay &lt;start&gt;..&lt;end&gt; [--request &lt;id&gt;] [--env &lt;env&gt;] [--no-db-writes]</code></pre>
<table>
  <thead><tr><th>Flag</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>--request</code></td><td>Replay a single request instead of a time window</td></tr>
    <tr><td><code>--env</code></td><td>Target environment for replay (<code>production</code> | <code>staging</code>)</td></tr>
    <tr><td><code>--no-db-writes</code></td><td>Dry-run: record mutations in the log but don't commit to DB</td></tr>
    <tr><td><code>--fail-if</code></td><td>Custom failure condition, e.g. <code>"status != 200"</code></td></tr>
  </tbody>
</table>
<pre><code># Replay an incident window
$ flux incident replay 14:00..14:30

  Replaying 47 requests from 14:00–14:30…
  Side-effects: stubbed · DB writes: on

  ✔  req:550e8400  POST /signup  200  88ms  ← was 500
  ✔  req:7a8b9c0d  POST /signup  200  91ms  ← was 500

  47 replayed · 47 passing · 0 still failing  ✔ incident resolved

# Replay a single request
$ flux incident replay --request 550e8400</code></pre>

<hr>

<h2 id="flux-bug-bisect">flux bug bisect</h2>
<p>Binary-search your git commit history to find the first commit where a given request started failing. Like <code>git bisect</code>, but it re-executes the request at each commit rather than asking you to test manually.</p>
<pre><code>flux bug bisect --request &lt;id&gt; [--since &lt;date&gt;] [--until &lt;date&gt;] [--fail-if &lt;expr&gt;]</code></pre>
<table>
  <thead><tr><th>Flag</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>--request</code></td><td>Request ID whose failure to bisect</td></tr>
    <tr><td><code>--since</code></td><td>Earliest commit date to search from</td></tr>
    <tr><td><code>--until</code></td><td>Latest commit date (defaults to now)</td></tr>
    <tr><td><code>--fail-if</code></td><td>Custom expression: <code>"span.stripe.charge.duration &gt; 5000"</code></td></tr>
  </tbody>
</table>
<pre><code>$ flux bug bisect --request 550e8400

  Bisecting 42 commits (2026-03-01..2026-03-10)…

  Testing abc123…  ✔ passes
  Testing fde789…  ✔ passes
  Testing def456…  ✗ fails

  FIRST BAD COMMIT
  def456  "feat: add retry logic to stripe.charge"
  2026-03-08  alice@example.com</code></pre>

<!-- ─── QUERY TOOLS ──────────────────────────────────────────────────────── -->

<h2 id="flux-explain">flux explain</h2>
<p>Preview the SQL query plan that a <code>ctx.db</code> call will produce, without executing it. Identifies missing indexes and estimates row counts.</p>
<pre><code>flux explain &lt;function-name&gt; [--payload &lt;json&gt;]</code></pre>
<pre><code>$ flux explain list_users --payload '{"limit":50}'

  Query #1   SELECT * FROM users WHERE tenant_id = $1 LIMIT 50
  Cost:      Seq Scan on users  (cost=0.00..1240.00)
  Warning:   Missing index on users.tenant_id
  Suggestion → CREATE INDEX ON users(tenant_id);</code></pre>

<!-- ─── PROJECT MANAGEMENT ──────────────────────────────────────────────── -->

<h2 id="flux-api-key">flux api-key</h2>
<p>Create and revoke API keys for your project. API keys are used as <code>Authorization: Bearer &lt;key&gt;</code> headers on requests to the gateway. See <a href="/docs/gateway">API Gateway</a> for details.</p>
<pre><code>flux api-key create --name &lt;name&gt; [--scopes &lt;scopes&gt;]
flux api-key list
flux api-key revoke &lt;id&gt;
flux api-key rotate &lt;id&gt;</code></pre>
<table>
  <thead><tr><th>Flag</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>--name</code></td><td>Human-readable label for the key (required for create)</td></tr>
    <tr><td><code>--scopes</code></td><td>Comma-separated permission scopes, e.g. <code>function:deploy,logs:read</code></td></tr>
  </tbody>
</table>
<pre><code>$ flux api-key create --name "production-server"
  ✔ Created  flx_live_abc123…  (production-server)

$ flux api-key list
  production-server   flx_live_abc…  created 2026-03-10
  ci-runner           flx_live_def…  created 2026-03-08

$ flux api-key revoke &lt;id&gt;
  ✔ Revoked</code></pre>

<hr>

<h2 id="flux-db-push">flux db push</h2>
<p>Apply SQL migrations from the <code>schemas/</code> directory to the connected Flux database. Migrations are tracked and applied idempotently.</p>
<pre><code>flux db push [--context &lt;name&gt;] [--dir &lt;dir&gt;]</code></pre>
<table>
  <thead><tr><th>Flag</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>--context</code></td><td>Named context to connect to (default: active context)</td></tr>
    <tr><td><code>--dir</code></td><td>Migrations directory (default: <code>schemas/</code>)</td></tr>
  </tbody>
</table>
<pre><code>$ flux db push

  Applying schemas/users.sql…    ✔
  Applying schemas/orders.sql…   ✔

  ✔ 2 migrations applied</code></pre>

<hr>

<h2 id="flux-secrets">flux secrets</h2>
<p>Manage encrypted project secrets. Secrets are available in functions via <code>ctx.env.KEY</code>.</p>
<pre><code>flux secrets set &lt;KEY&gt; &lt;value&gt;
flux secrets list
flux secrets delete &lt;KEY&gt;</code></pre>
<pre><code>$ flux secrets set STRIPE_SECRET_KEY sk_live_…
  ✔ Set STRIPE_SECRET_KEY

$ flux secrets list
  STRIPE_SECRET_KEY   sk_live_…***  set 2026-03-10
  SENDGRID_API_KEY    SG.***        set 2026-03-08</code></pre>

<hr>

<h2 id="flux-project">flux project</h2>
<p>Create, list, update, and delete Flux projects.</p>
<pre><code>flux project create --name &lt;name&gt;
flux project list
flux project update [--cors-origin &lt;url&gt;] [--name &lt;name&gt;]
flux project delete --id &lt;id&gt;</code></pre>
<table>
  <thead><tr><th>Subcommand / Flag</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>create --name</code></td><td>Create a new project with the given name</td></tr>
    <tr><td><code>list</code></td><td>List all projects in your account</td></tr>
    <tr><td><code>update --cors-origin</code></td><td>Add a CORS allowed origin (repeatable)</td></tr>
    <tr><td><code>update --name</code></td><td>Rename the current project</td></tr>
    <tr><td><code>delete --id</code></td><td>Permanently delete a project and all its data</td></tr>
  </tbody>
</table>
<pre><code>$ flux project list

  proj_abc123   my-app       production  3 functions
  proj_def456   my-app-dev   staging     3 functions

$ flux project update --cors-origin https://your-app.com
  ✔ Added CORS origin: https://your-app.com</code></pre>

<hr>

<h2 id="flux-queue">flux queue</h2>
<p>Inspect and manage the async job queue. See <a href="/docs/queue">Queue &amp; Async Jobs</a> for full docs.</p>
<pre><code>flux queue dead-letter list
flux queue dead-letter replay &lt;request-id&gt;</code></pre>
<pre><code>$ flux queue dead-letter list

  d5e6f7a8  send_welcome_email  failed 3×  last: user not found
  e6f7a8b9  send_invoice        failed 3×  last: Stripe 429</code></pre>

<hr>
<p><a href="/docs/observability">← Observability</a></p>
` }}
    />
  )
}

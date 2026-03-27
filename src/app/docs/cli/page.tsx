import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CLI Reference — Flux',
  description: 'Complete Flux CLI reference: every command, flag, and example sourced from the codebase.',
}

export default function Page() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
<h1>CLI Reference</h1>
<p class="page-subtitle">Every command, flag, and example — sourced from the codebase.</p>

<h2>Quick Reference</h2>

<table>
  <thead><tr><th>Command</th><th>What it does</th></tr></thead>
  <tbody>
    <tr><td><code>flux server start</code></td><td>Start the Flux server (stores recordings in Postgres)</td></tr>
    <tr><td><code>flux auth</code></td><td>Authenticate the CLI against a Flux server</td></tr>
    <tr><td><code>flux run &lt;file&gt;</code></td><td>Run a TS/JS file — as a script or a persistent HTTP server</td></tr>
    <tr><td><code>flux dev &lt;file&gt;</code></td><td>Dev server with hot reload on file changes</td></tr>
    <tr><td><code>flux tail</code></td><td>Stream live requests as they arrive</td></tr>
    <tr><td><code>flux logs</code></td><td>List recorded executions (filterable)</td></tr>
    <tr><td><code>flux why &lt;id&gt;</code></td><td>Understand why a request failed</td></tr>
    <tr><td><code>flux trace &lt;id&gt;</code></td><td>Full execution trace with IO checkpoints</td></tr>
    <tr><td><code>flux replay &lt;id&gt;</code></td><td>Re-run with recorded checkpoints — no real IO</td></tr>
    <tr><td><code>flux resume &lt;id&gt;</code></td><td>Re-run with real IO — commits to database</td></tr>
    <tr><td><code>flux config</code></td><td>Read/write CLI config (url, token)</td></tr>
    <tr><td><code>flux add &lt;pkg&gt;</code></td><td>Add npm packages to deno.json</td></tr>
    <tr><td><code>flux check</code></td><td>Check code compatibility with the Flux runtime</td></tr>
    <tr><td><code>flux status</code></td><td>Overall Flux health check</td></tr>
    <tr><td><code>flux ps</code></td><td>Show managed Flux processes</td></tr>
  </tbody>
</table>

<hr>

<h2>flux server</h2>

<p>Manages the Flux server process. The server stores all execution records in Postgres and exposes the gRPC API used by the CLI and runtime.</p>

<h3>flux server start</h3>
<pre><code><span class="shell-prompt">$</span> flux server start --database-url postgres://user:pass@localhost:5432/flux

  starting server binary ~/.flux/bin/flux-server</code></pre>

<table>
  <thead><tr><th>Flag</th><th>Default</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>--port</code></td><td>50051</td><td>gRPC port to listen on</td></tr>
    <tr><td><code>--database-url</code></td><td>env: DATABASE_URL</td><td>Postgres connection string (required)</td></tr>
    <tr><td><code>--service-token</code></td><td>env: FLUX_SERVICE_TOKEN, falls back to <code>dev-service-token</code></td><td>Auth token for clients</td></tr>
    <tr><td><code>--release</code></td><td>false</td><td>Use release-mode binary</td></tr>
  </tbody>
</table>

<h3>flux server restart</h3>
<p>Stops the running server then starts it fresh with the given flags.</p>
<pre><code><span class="shell-prompt">$</span> flux server restart --database-url postgres://user:pass@localhost:5432/flux</code></pre>

<hr>

<h2>flux auth</h2>
<p>Save credentials so every CLI command can reach the Flux server. Prompts for a token if not provided.</p>
<pre><code><span class="shell-prompt">$</span> flux auth --url http://localhost:50051

  Service token: ••••••••••
  authenticated against http://localhost:50051 using token auth
  saved CLI auth config
  server:  http://localhost:50051</code></pre>

<table>
  <thead><tr><th>Flag</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>--url &lt;URL&gt;</code></td><td>Flux server URL (required)</td></tr>
    <tr><td><code>--token &lt;TOKEN&gt;</code></td><td>Service token — if omitted, you'll be prompted</td></tr>
    <tr><td><code>--skip-verify</code></td><td>Save credentials without verifying against the server</td></tr>
  </tbody>
</table>

<hr>

<h2>flux config</h2>
<p>Read or write CLI config stored in <code>~/.flux/config.json</code>.</p>

<pre><code><span class="shell-prompt">$</span> flux config get
url=http://localhost:50051
token=dev-service-token

<span class="shell-prompt">$</span> flux config get token
dev-service-token

<span class="shell-prompt">$</span> flux config get url
http://localhost:50051

<span class="shell-prompt">$</span> flux config set token my-new-token
saved config value</code></pre>

<table>
  <thead><tr><th>Key</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>url</code> (alias: <code>server</code>)</td><td>Flux server URL</td></tr>
    <tr><td><code>token</code></td><td>Service token</td></tr>
  </tbody>
</table>

<hr>

<h2>flux run</h2>
<p>Run a TypeScript or JavaScript file using the Flux runtime. Works as:</p>
<ul>
  <li>A <strong>plain script</strong> (top-level code runs and exits)</li>
  <li>A <strong>persistent HTTP server</strong> if <code>export default</code> is a Hono app or <code>Deno.serve()</code> is called</li>
</ul>
<pre><code><span class="shell-prompt">$</span> flux run index.ts

<span class="cm"># with explicit input for a default handler</span>
<span class="shell-prompt">$</span> flux run index.ts --input '{"email":"test@example.com"}'

<span class="cm"># keep alive as HTTP server</span>
<span class="shell-prompt">$</span> flux run index.ts --serve --port 8080</code></pre>

<table>
  <thead><tr><th>Flag</th><th>Default</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>[ENTRY]</code></td><td>—</td><td>Entry TypeScript/JavaScript file</td></tr>
    <tr><td><code>--artifact &lt;FILE&gt;</code></td><td>—</td><td>Use a pre-built Flux artifact JSON instead of a file</td></tr>
    <tr><td><code>--input &lt;JSON&gt;</code></td><td><code>{}</code></td><td>JSON passed to the default handler</td></tr>
    <tr><td><code>--serve</code> / <code>--listen</code></td><td>false</td><td>Keep alive as HTTP listener</td></tr>
    <tr><td><code>--port</code></td><td>3000</td><td>HTTP port when serving</td></tr>
    <tr><td><code>--host</code></td><td>127.0.0.1</td><td>Bind host when serving</td></tr>
    <tr><td><code>--url</code></td><td>env: FLUX_SERVICE_TOKEN</td><td>Flux server URL (optional, for recording)</td></tr>
    <tr><td><code>--token</code></td><td>—</td><td>Service token (optional)</td></tr>
    <tr><td><code>--release</code></td><td>false</td><td>Use release-mode runtime binary</td></tr>
  </tbody>
</table>

<hr>

<h2>flux dev</h2>
<p>Like <code>flux run --serve</code> but with <strong>hot reload</strong> — restarts automatically on file changes.</p>
<pre><code><span class="shell-prompt">$</span> flux dev index.ts

  env       /Users/me/my-app/.env
  flux dev  /Users/me/my-app/index.ts
  watching  /Users/me/my-app
  [flux dev] started pid 12345</code></pre>

<table>
  <thead><tr><th>Flag</th><th>Default</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>[ENTRY]</code></td><td>—</td><td>Entry TypeScript/JavaScript file</td></tr>
    <tr><td><code>--port</code></td><td>3000</td><td>HTTP port</td></tr>
    <tr><td><code>--host</code></td><td>127.0.0.1</td><td>Bind host</td></tr>
    <tr><td><code>--poll-ms</code></td><td>500</td><td>How often to check for file changes (ms)</td></tr>
    <tr><td><code>--watch-dir</code></td><td>entry's parent dir</td><td>Directory to watch for changes</td></tr>
    <tr><td><code>--url</code></td><td>—</td><td>Flux server URL (optional)</td></tr>
    <tr><td><code>--token</code></td><td>env: FLUX_SERVICE_TOKEN</td><td>Service token (optional)</td></tr>
    <tr><td><code>--release</code></td><td>false</td><td>Use release-mode binary</td></tr>
  </tbody>
</table>

<hr>

<h2>flux tail</h2>
<p>Stream live requests as they arrive. Shows status, method, path, duration, and the short execution ID.</p>
<pre><code><span class="shell-prompt">$</span> flux tail

  streaming live requests — ctrl+c to stop

  ✓  ok     POST /orders   88ms  a1b2c3d4
  ✗  error  POST /orders   21ms  e9f66586
     └─ HTTP Internal Server Error (500)</code></pre>

<table>
  <thead><tr><th>Flag</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>--url &lt;URL&gt;</code></td><td>Flux server URL (overrides saved config)</td></tr>
    <tr><td><code>--token &lt;TOKEN&gt;</code></td><td>Service token (overrides saved config)</td></tr>
    <tr><td><code>--project-id &lt;ID&gt;</code></td><td>Filter to a specific project</td></tr>
  </tbody>
</table>

<hr>

<h2>flux logs</h2>
<p>List recorded executions from the server. Supports filtering by status, path, time, and free-text search.</p>
<pre><code><span class="shell-prompt">$</span> flux logs

  TIME      METHOD  PATH               STATUS   DURATION  ID
  14:22:01  POST    /orders            ✓ ok      88ms      a1b2c3d4
  14:22:09  POST    /orders            ✗ error   21ms      e9f66586

  showing last 50 — flux logs --limit 100 for more

<span class="cm"># Filter examples</span>
<span class="shell-prompt">$</span> flux logs --status error
<span class="shell-prompt">$</span> flux logs --path /orders
<span class="shell-prompt">$</span> flux logs --since 1h
<span class="shell-prompt">$</span> flux logs --search "productId"
<span class="shell-prompt">$</span> flux logs --limit 100</code></pre>

<table>
  <thead><tr><th>Flag</th><th>Default</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>--limit &lt;N&gt;</code></td><td>50</td><td>Max rows to show</td></tr>
    <tr><td><code>--status &lt;STATUS&gt;</code></td><td>—</td><td>Filter by status: <code>ok</code> or <code>error</code></td></tr>
    <tr><td><code>--path &lt;PATH&gt;</code></td><td>—</td><td>Filter by path substring</td></tr>
    <tr><td><code>--since &lt;DURATION&gt;</code></td><td>—</td><td>Only show entries newer than duration: <code>30m</code>, <code>2h</code>, <code>1d</code></td></tr>
    <tr><td><code>--search &lt;TEXT&gt;</code></td><td>—</td><td>Search across path, method, error, and execution ID</td></tr>
    <tr><td><code>--project-id &lt;ID&gt;</code></td><td>—</td><td>Filter to a specific project</td></tr>
    <tr><td><code>--url</code> / <code>--token</code></td><td>—</td><td>Override saved server config</td></tr>
  </tbody>
</table>

<hr>

<h2>flux why &lt;id&gt;</h2>
<p>Understand why a request failed — shows the error, console output, and a suggestion.</p>
<pre><code><span class="shell-prompt">$</span> flux why e9f66586

  POST /orders  ✗ error  21ms  e9f66586

  function threw before any IO
  error   Internal Server Error

  error body
    Internal Server Error

  console
    › "2026-03-22T08:36:09.048Z"
    › Incoming body: {"email":"test@example.com","productId":"101"}
    ✗ Error: productId must be a number
    at Array.&lt;anonymous&gt; (index.ts:45:11)

  check input validation and early-exit logic</code></pre>

<table>
  <thead><tr><th>Flag</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>EXECUTION_ID</code></td><td>Execution ID (required) — copy from <code>flux tail</code> or <code>flux logs</code></td></tr>
    <tr><td><code>--url</code> / <code>--token</code></td><td>Override saved server config</td></tr>
  </tbody>
</table>

<hr>

<h2>flux trace &lt;id&gt;</h2>
<p>Full execution trace: request/response bodies, console output, and every IO checkpoint (Postgres queries, HTTP calls, Redis commands, TCP connections, timers).</p>

<pre><code><span class="shell-prompt">$</span> flux trace e9f66586

  POST /orders  error  21ms  e9f66586
  error  HTTP Internal Server Error (500)

  request
    (hidden, use --verbose)

  response
    (hidden, use --verbose)

  console
    ✗  Error: productId must be a number

  no checkpoints recorded

<span class="cm"># Show full request/response bodies</span>
<span class="shell-prompt">$</span> flux trace e9f66586 --verbose

<span class="cm"># Example trace with Postgres checkpoint</span>
<span class="shell-prompt">$</span> flux trace a1b2c3d4

  POST /orders  ok  88ms  a1b2c3d4

  checkpoints
  [0] POSTGRES  localhost:5432  43ms  → 1 rows  INSERT INTO orders ...</code></pre>

<p>Checkpoint types shown: <code>POSTGRES</code>, <code>HTTP</code>, <code>TCP</code> / <code>TCP+TLS</code>, <code>REDIS</code>, <code>TIMER</code>.</p>

<table>
  <thead><tr><th>Flag</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>EXECUTION_ID</code></td><td>Execution ID (required)</td></tr>
    <tr><td><code>--verbose</code></td><td>Show full request/response bodies instead of "(hidden, use --verbose)"</td></tr>
    <tr><td><code>--url</code> / <code>--token</code></td><td>Override saved server config</td></tr>
  </tbody>
</table>

<hr>

<h2>flux replay &lt;id&gt;</h2>
<p><strong>Safe, no real IO.</strong> Re-runs a recorded request against your current code using only recorded checkpoints. Stops cleanly at IO boundaries where no checkpoint was recorded. Use this to verify a fix without touching your database.</p>

<pre><code><span class="shell-prompt">$</span> flux replay e9f66586

  replaying e9f66586
  ✓ using updated code

  STEP 0 — POST /orders

  execution
    ✗ original execution failed before reaching external IO
    ✓ replay progressed beyond original failure point

  ⏸ stopped at external boundary: POSTGRES
  reason
    no recorded checkpoint available for this postgres call
    replay never touches the real world

  ✓ your code fix is working — replay progressed further than the original

  next
    → run flux resume e9f66586 to continue with real IO

<span class="cm"># Show diff vs original execution</span>
<span class="shell-prompt">$</span> flux replay e9f66586 --diff

<span class="cm"># Start replay from a specific checkpoint index</span>
<span class="shell-prompt">$</span> flux replay e9f66586 --from-index 2</code></pre>

<table>
  <thead><tr><th>Flag</th><th>Default</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>EXECUTION_ID</code></td><td>—</td><td>Execution ID to replay (required)</td></tr>
    <tr><td><code>[ENTRY]</code></td><td>auto-detected</td><td>Entry file to use (defaults to project entry)</td></tr>
    <tr><td><code>--diff</code></td><td>false</td><td>Show comparison vs original execution</td></tr>
    <tr><td><code>--from-index &lt;N&gt;</code></td><td>—</td><td>Start replay from checkpoint index N</td></tr>
    <tr><td><code>--commit</code></td><td>false</td><td>Commit the result to the server</td></tr>
    <tr><td><code>--validate</code></td><td>false</td><td>Validate replay output matches original</td></tr>
    <tr><td><code>--explain</code></td><td>false</td><td>Explain the replay plan without running</td></tr>
    <tr><td><code>--ignore &lt;PATHS&gt;</code></td><td>—</td><td>Comma-separated paths to ignore during replay</td></tr>
    <tr><td><code>--verbose</code></td><td>false</td><td>Show detailed runtime output</td></tr>
    <tr><td><code>--port</code></td><td>3000</td><td>Runtime HTTP port</td></tr>
    <tr><td><code>--url</code> / <code>--token</code></td><td>—</td><td>Override saved server config</td></tr>
  </tbody>
</table>

<div class="callout callout-info">
  <div class="callout-title">replay = investigation. resume = action.</div>
  <p>Replay is deterministic and safe — it cannot mutate your database or call external services. Use <code>flux resume</code> when you're convinced the fix is correct.</p>
</div>

<hr>

<h2>flux resume &lt;id&gt;</h2>
<p><strong>Real IO — writes to database, calls external services.</strong> Re-runs a request from a checkpoint boundary with live execution. Generates a new execution ID so the original record is preserved.</p>

<pre><code><span class="shell-prompt">$</span> flux resume e9f66586

  resuming e9f66586…

  ⚠  executing with real side effects
     • database writes will be applied

  STEP 0 — POST /orders

  input
    email:      test@example.com
    productId:  101

  execution
    ✓ validation passed
    ✓ database write applied

  result
    ✓ request succeeded (200)

  output
    id:     9b887ab1
    email:  test@example.com

  difference vs original
    original:  ✗ failed
    now:       ✓ completed successfully

  ✓ original failure recovered

<span class="cm"># Resume from a specific checkpoint index</span>
<span class="shell-prompt">$</span> flux resume e9f66586 --from 2</code></pre>

<table>
  <thead><tr><th>Flag</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>EXECUTION_ID</code></td><td>Execution ID to resume (required)</td></tr>
    <tr><td><code>--from &lt;INDEX&gt;</code></td><td>Start from checkpoint index N (default: 0)</td></tr>
    <tr><td><code>--url</code> / <code>--token</code></td><td>Override saved server config</td></tr>
  </tbody>
</table>

<hr>

<h2>flux status</h2>
<p>Overall health check — shows whether the server is reachable and reports any issues.</p>
<pre><code><span class="shell-prompt">$</span> flux status</code></pre>

<hr>

<h2>flux ps</h2>
<p>Show managed Flux processes (server, runtimes).</p>
<pre><code><span class="shell-prompt">$</span> flux ps</code></pre>

<hr>

<h2>flux add</h2>
<p>Add npm packages to your project's <code>deno.json</code> import map.</p>
<pre><code><span class="shell-prompt">$</span> flux add hono zod

  adding   hono as npm:hono
  adding   zod as npm:zod
  updated  /Users/me/my-app/deno.json

<span class="cm"># Specific version</span>
<span class="shell-prompt">$</span> flux add hono@4.0.0

  adding   hono as npm:hono@4.0.0
  updated  /Users/me/my-app/deno.json</code></pre>

<p>Packages can be referenced as <code>npm:package</code> or <code>https://</code> URLs. After adding, import via the short name:</p>
<pre><code>import { Hono } from 'hono'   <span class="cm">// resolves from deno.json import map</span></code></pre>

<hr>

<h2>flux check</h2>
<p>Scan your TypeScript/JavaScript project for compatibility issues with the Flux runtime before running or deploying.</p>
<pre><code><span class="shell-prompt">$</span> flux check index.ts

  checked   /Users/me/my-app/index.ts
  modules   12
  artifact  a3f9c8...

<span class="cm"># With an error:</span>
  error [node_import] index.ts: node: imports are not supported: node:crypto

<span class="cm"># With a warning:</span>
  warning [unsupported_global] index.ts: Buffer may not be available in Flux runtime</code></pre>

<p>Exit code 1 = errors found. Exit code 0 = compatible. See <a href="/docs/compatibility">Compatibility</a> for the full list of diagnostic codes.</p>

<table>
  <thead><tr><th>Flag</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>[ENTRY]</code></td><td>Entry file to check (auto-detected if omitted)</td></tr>
  </tbody>
</table>

<hr>

<h2>The debugging workflow</h2>

<table>
  <thead><tr><th>Question</th><th>Command</th></tr></thead>
  <tbody>
    <tr><td>What requests are failing right now?</td><td><code>flux tail</code></td></tr>
    <tr><td>Show me recent failures</td><td><code>flux logs --status error</code></td></tr>
    <tr><td>Why did this request fail?</td><td><code>flux why &lt;id&gt;</code></td></tr>
    <tr><td>What IO did it do?</td><td><code>flux trace &lt;id&gt;</code></td></tr>
    <tr><td>See full request body</td><td><code>flux trace &lt;id&gt; --verbose</code></td></tr>
    <tr><td>Does my fix work?</td><td><code>flux replay &lt;id&gt;</code></td></tr>
    <tr><td>Show diff vs original</td><td><code>flux replay &lt;id&gt; --diff</code></td></tr>
    <tr><td>Apply the fix for real</td><td><code>flux resume &lt;id&gt;</code></td></tr>
  </tbody>
</table>
` }}
    />
  )
}

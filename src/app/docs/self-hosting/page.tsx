import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Self-Hosting — Flux Docs',
  description: 'Run Flux on your own infrastructure. One binary, one Postgres database, zero external dependencies.',
}

export default function Page() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
<h1>Self-Hosting Flux</h1>
<p class="page-subtitle">One binary. One Postgres database. Zero external dependencies.</p>

<nav style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;padding:16px 20px;margin:0 0 40px;">
  <div style="font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:10px;">On this page</div>
  <div style="display:flex;flex-direction:column;gap:4px;font-size:.875rem;">
    <a href="#overview" style="color:var(--accent);text-decoration:none;">Overview</a>
    <a href="#quickstart" style="color:var(--accent);text-decoration:none;">Quickstart (docker compose)</a>
    <a href="#single-binary" style="color:var(--accent);text-decoration:none;">Single binary</a>
    <a href="#configuration" style="color:var(--accent);text-decoration:none;">Configuration</a>
    <a href="#scaling" style="color:var(--accent);text-decoration:none;">Scaling</a>
    <a href="#postgres" style="color:var(--accent);text-decoration:none;">Postgres requirements</a>
  </div>
</nav>

<h2 id="overview">The Architecture</h2>
<p>The Flux execution server (<code>flux-server</code>) is a standalone Rust binary that manages orchestration and queuing. It spawns secure execution isolates (<code>flux-runtime</code>). All execution state lives in one Postgres database. There is no complex mesh, no default Redis dependency, no external queue — just the server, runtime isolates, and Postgres.</p>

<ul>
  <li>No distributed state to manage</li>
  <li>Single process, single port</li>
  <li>Any Postgres 14+ host works: RDS, Supabase, Neon, Fly Postgres, or your own server</li>
  <li>Open source — no license keys, no usage limits</li>
</ul>

<h2 id="quickstart">Quickstart</h2>

<p>The fastest way to run Flux is with Docker Compose.</p>

<h3>1. Download the compose file</h3>

<pre><code><span class="shell-prompt">$</span> curl -fsSL https://raw.githubusercontent.com/flux-run/flux/main/docker-compose.yml -o docker-compose.yml</code></pre>

<h3>2. Start everything</h3>

<pre><code><span class="shell-prompt">$</span> docker compose up -d</code></pre>

<p>This starts Flux and a Postgres instance. Flux runs migrations automatically on first startup.</p>

<h3>3. Deploy a function</h3>

<pre><code><span class="shell-prompt">$</span> flux init my-app && cd my-app
<span class="shell-prompt">$</span> flux dev</code></pre>

<p>That's it. Flux is running at <code>localhost:4000</code>.</p>

<h2 id="single-binary">Single binary</h2>

<p>If you prefer to run without Docker, download the binary directly:</p>

<pre><code><span class="shell-prompt">$</span> curl -fsSL https://fluxbase.co/install | bash
<span class="shell-prompt">$</span> export DATABASE_URL=postgres://user:password@localhost:5432/flux
<span class="shell-prompt">$</span> flux serve</code></pre>

<h3>1. Internal network</h3>
<p>The <code>flux-server</code> binary starts the backend and begins listening for CLI/client requests and execution triggers. Since it binds to internal ports by default, it expects a reverse proxy or load balancer to route external traffic to it safely.</p>

<h2 id="configuration">Configuration</h2>

<p>Flux is configured via environment variables or a <code>project.toml</code> file.</p>

<h3>Required</h3>

<table>
  <thead>
    <tr><th>Variable</th><th>Description</th></tr>
  </thead>
  <tbody>
    <tr><td><code>DATABASE_URL</code></td><td>Postgres connection string (<code>postgres://user:pass@host:5432/db</code>)</td></tr>
  </tbody>
</table>

<h3>Optional</h3>

<table>
  <thead>
    <tr><th>Variable</th><th>Default</th><th>Description</th></tr>
  </thead>
  <tbody>
    <tr><td><code>PORT</code></td><td>4000</td><td>Listen port</td></tr>
    <tr><td><code>RUNTIME_POOL_SIZE</code></td><td>4</td><td>V8 isolates in the pool</td></tr>
    <tr><td><code>TRACE_RETENTION_DAYS</code></td><td>30</td><td>Days before execution records are deleted</td></tr>
    <tr><td><code>MAX_FUNCTION_DURATION_MS</code></td><td>30000</td><td>Timeout per function execution</td></tr>
    <tr><td><code>LOG_LEVEL</code></td><td>info</td><td><code>trace</code> / <code>debug</code> / <code>info</code> / <code>warn</code> / <code>error</code></td></tr>
    <tr><td><code>RUST_LOG</code></td><td>—</td><td>Fine-grained module logging (e.g. <code>flux_server=debug</code>)</td></tr>
  </tbody>
</table>

<h2 id="scaling">Scaling</h2>

<h3>Single server</h3>

<p>One Flux binary handles thousands of concurrent requests. For most projects, a single instance on a $20/month VPS is more than enough.</p>

<h3>Multiple instances</h3>

<p>Because all state is in Postgres, you can run multiple Flux instances behind a load balancer. The server uses <code>LISTEN/NOTIFY</code> to coordinate route cache invalidation across instances.</p>

<pre><code><span class="cm"># Scale to 4 instances</span>
<span class="shell-prompt">$</span> docker compose up -d --scale flux=4</code></pre>

<h3>Kubernetes</h3>

<pre><code>apiVersion: apps/v1
kind: Deployment
metadata:
  name: flux
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: flux
          image: ghcr.io/flux-run/flux:latest
          ports:
            - containerPort: 4000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: flux-secrets
                  key: database-url</code></pre>

<h2 id="postgres">Postgres requirements</h2>

<p>Flux requires Postgres 14 or later. Recommended options by environment:</p>

<table>
  <thead>
    <tr><th>Environment</th><th>Recommended Postgres</th></tr>
  </thead>
  <tbody>
    <tr><td>Local development</td><td>Included <code>postgres</code> service in docker-compose</td></tr>
    <tr><td>Single VPS / Fly.io</td><td>Fly Postgres, Supabase, Neon</td></tr>
    <tr><td>AWS</td><td>RDS PostgreSQL or Aurora Postgres</td></tr>
    <tr><td>GCP / Azure</td><td>Cloud SQL / Azure Database for PostgreSQL</td></tr>
    <tr><td>On-prem</td><td>Any Postgres 14+ instance</td></tr>
  </tbody>
</table>

<hr>

<p style="display:flex;gap:16px;font-size:.875rem;">
  <a href="/docs/production">← Production Guide</a>
  &nbsp;·&nbsp;
  <a href="/docs/architecture">Architecture →</a>
</p>
` }} />
  )
}

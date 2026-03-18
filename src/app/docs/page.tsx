import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documentation — Flux',
  description: 'Flux documentation. Get started in 5 minutes: create a project, write a function, see the full execution trace.',
}

export default function Page() {
  return (
    <div
      dangerouslySetInnerHTML={{ __html: `<h1>Flux Documentation</h1>
<p class="page-subtitle">The backend framework where every execution is a record.</p>

<div style="background:var(--bg-elevated);border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:8px;padding:20px 24px;margin:0 0 36px;">
  <div style="font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-bottom:14px;">Get running in 60 seconds</div>
  <div style="display:flex;flex-direction:column;gap:0;">
    ${[
      ['1', 'Create a project',        'flux init my-app'],
      ['2', 'Start dev server',        'flux dev'],
      ['3', 'Write a function',        'functions/hello/index.ts'],
      ['4', 'See the trace',           'flux trace &lt;id&gt;'],
      ['5', 'Debug any failure',       'flux why &lt;id&gt;'],
    ].map(([n, label, cmd], i, arr) => `
      <div style="display:flex;align-items:center;gap:14px;padding:10px 0;${i < arr.length - 1 ? 'border-bottom:1px solid var(--border);' : ''}">
        <div style="flex-shrink:0;width:24px;height:24px;border-radius:50%;background:var(--accent-dim);color:var(--accent);font-size:.75rem;font-weight:700;display:flex;align-items:center;justify-content:center;">${n}</div>
        <div style="flex:1;font-size:.875rem;">${label}</div>
        <code style="font-size:.78rem;color:var(--accent);background:var(--bg);border:1px solid var(--border);padding:3px 8px;border-radius:4px;white-space:nowrap;">${cmd}</code>
      </div>`).join('')}
  </div>
</div>

<h2>Start here</h2>

<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin:24px 0 40px;">
  <a href="/docs/quickstart" style="display:block;padding:20px 24px;border:2px solid var(--accent);border-radius:10px;background:var(--accent-dim);color:var(--text);text-decoration:none;">
    <div style="font-size:1.2rem;margin-bottom:8px;">🚀</div>
    <div style="font-weight:700;margin-bottom:4px;">Quickstart</div>
    <div style="font-size:.85rem;color:var(--muted);">From zero to traced execution in 5 minutes.</div>
  </a>
  <a href="/docs/concepts" style="display:block;padding:20px 24px;border:1px solid var(--border);border-radius:10px;background:var(--bg-surface);color:var(--text);text-decoration:none;" onmouseenter="this.style.borderColor='var(--accent)'" onmouseleave="this.style.borderColor='var(--border)'">
    <div style="font-size:1.2rem;margin-bottom:8px;">💡</div>
    <div style="font-weight:700;margin-bottom:4px;">Core Concepts</div>
    <div style="font-size:.85rem;color:var(--muted);">Execution records, ctx, functions, database.</div>
  </a>
  <a href="/docs/functions" style="display:block;padding:20px 24px;border:1px solid var(--border);border-radius:10px;background:var(--bg-surface);color:var(--text);text-decoration:none;" onmouseenter="this.style.borderColor='var(--accent)'" onmouseleave="this.style.borderColor='var(--border)'">
    <div style="font-size:1.2rem;margin-bottom:8px;">⚡</div>
    <div style="font-weight:700;margin-bottom:4px;">Functions</div>
    <div style="font-size:.85rem;color:var(--muted);">TypeScript or any language via WebAssembly. ctx.db, ctx.queue.</div>
  </a>
  <a href="/docs/database" style="display:block;padding:20px 24px;border:1px solid var(--border);border-radius:10px;background:var(--bg-surface);color:var(--text);text-decoration:none;" onmouseenter="this.style.borderColor='var(--accent)'" onmouseleave="this.style.borderColor='var(--border)'">
    <div style="font-size:1.2rem;margin-bottom:8px;">🗄️</div>
    <div style="font-weight:700;margin-bottom:4px;">Database</div>
    <div style="font-size:.85rem;color:var(--muted);">Postgres access via ctx.db. Every write recorded.</div>
  </a>
  <a href="/docs/queue" style="display:block;padding:20px 24px;border:1px solid var(--border);border-radius:10px;background:var(--bg-surface);color:var(--text);text-decoration:none;" onmouseenter="this.style.borderColor='var(--accent)'" onmouseleave="this.style.borderColor='var(--border)'">
    <div style="font-size:1.2rem;margin-bottom:8px;">📬</div>
    <div style="font-weight:700;margin-bottom:4px;">Queue</div>
    <div style="font-size:.85rem;color:var(--muted);">Async jobs with retries, delay, dead-letter.</div>
  </a>
  <a href="/cli" style="display:block;padding:20px 24px;border:1px solid var(--border);border-radius:10px;background:var(--bg-surface);color:var(--text);text-decoration:none;" onmouseenter="this.style.borderColor='var(--accent)'" onmouseleave="this.style.borderColor='var(--border)'">
    <div style="font-size:1.2rem;margin-bottom:8px;">⌨️</div>
    <div style="font-weight:700;margin-bottom:4px;">CLI Reference</div>
    <div style="font-size:.85rem;color:var(--muted);">flux init, dev, deploy, trace, why, replay.</div>
  </a>
  <a href="/docs/self-hosting" style="display:block;padding:20px 24px;border:1px solid var(--border);border-radius:10px;background:var(--bg-surface);color:var(--text);text-decoration:none;" onmouseenter="this.style.borderColor='var(--accent)'" onmouseleave="this.style.borderColor='var(--border)'">
    <div style="font-size:1.2rem;margin-bottom:8px;">🏭</div>
    <div style="font-weight:700;margin-bottom:4px;">Self-Hosting</div>
    <div style="font-size:.85rem;color:var(--muted);">Docker, Kubernetes, scaling, production checklist.</div>
  </a>
</div>

<h2>Core Concepts</h2>

<p>Everything in Flux revolves around the <strong><a href="/docs/execution-record">execution record</a></strong> — a complete snapshot produced for every request: span tree, database mutations, inputs, outputs, and errors. All CLI commands are different ways to query that record.</p>

<h3>1. Execution Recording</h3>
<p>Every request is executed and recorded atomically. The runtime captures every span — server, function, database queries — and stores them indexed by request ID. There is no setup required; recording happens at the runtime level.</p>

<h3>2. Mutation Logging</h3>
<p>Every database write goes through the Server, which logs the mutation — table, row, old value, new value, and the request ID that caused it. <code>flux state history</code> and <code>flux state blame</code> query this log.</p>

<h3>3. Incident Replay</h3>
<p>Because the complete input to every request is recorded, any request can be deterministically re-executed. <code>flux incident replay</code> disables outbound side-effects while re-running database writes against the current code.</p>

<hr>

<h2>Architecture</h2>

<table>
  <thead>
    <tr>
      <th>Module</th>
      <th>Purpose</th>
      <th>Link</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Server</td>
      <td>Auth, rate limiting, CORS, routing, mutation logging</td>
      <td><a href="/docs/server">docs/server</a></td>
    </tr>
    <tr>
      <td>Runtime</td>
      <td>Deno V8 + Wasmtime execution, secrets</td>
      <td><a href="/docs/runtime">docs/runtime</a></td>
    </tr>
  </tbody>
</table>

<div style="margin-top: 2rem;">
<h3 style="font-size:1.1rem;margin:0 0 6px;color:var(--text)">Architecture &amp; Self-Hosting</h3>
<p style="font-size:.95rem;color:var(--muted);margin:0;line-height:1.6">Understand the <code>cli</code>, <code>server</code>, and <code>runtime</code> stack and how to run it on your own hardware.</p>
<p style="font-size:.85rem;color:var(--muted);margin-top:12px">Flux relies on optimized Rust binaries rather than microservice meshes. One Postgres database holds all execution state.</p>
</div>

<hr>

<h2>Debugging Reference</h2>

<table>
  <thead>
    <tr>
      <th>Question</th>
      <th>Command</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Why did this request fail?</td>            <td><code>flux why &lt;id&gt;</code></td></tr>
    <tr><td>What happened in this request?</td>        <td><code>flux trace &lt;id&gt;</code></td></tr>
    <tr><td>Step through it interactively?</td>        <td><code>flux trace debug &lt;id&gt;</code></td></tr>
    <tr><td>How did two requests differ?</td>          <td><code>flux trace diff &lt;a&gt; &lt;b&gt;</code></td></tr>
    <tr><td>What changed in the database?</td>         <td><code>flux state history &lt;table&gt; --id &lt;row&gt;</code></td></tr>
    <tr><td>Who set this field?</td>                   <td><code>flux state blame &lt;table&gt; --id &lt;row&gt;</code></td></tr>
    <tr><td>Replay the incident safely?</td>           <td><code>flux incident replay &lt;from&gt;..&lt;to&gt;</code></td></tr>
    <tr><td>Which commit broke it?</td>                <td><code>flux bug bisect --request &lt;id&gt;</code></td></tr>
  </tbody>
</table>` }}
    />
  )
}

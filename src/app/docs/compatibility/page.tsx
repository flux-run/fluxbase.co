import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Compatibility & Supported Services — Flux Docs',
  description: 'Learn which frameworks, databases, and I/O boundaries are supported and intercepted by Flux.',
}

export default function Page() {
  return (
    <div
      dangerouslySetInnerHTML={{ __html: `<h1>Compatibility & Supported Services</h1>
<p class="page-subtitle">Understand what works out-of-the-box and what anti-patterns to avoid for deterministic replays.</p>

<p>Flux operates by executing your code in a Deno V8 isolate. It allows standard web APIs, but intercepts specific I/O calls to write deterministic checkpoints to the execution store. As Flux is a runtime and not a framework, you can use standard HTTP fetch and generic TCP-based database drivers. However, side-effects that evade TCP socket interception or use non-deterministic host-level APIs will not be replayable.</p>

<!-- ─── SUPPORTED ──────────────────────────────────────────────────────────── -->

<h2 id="supported">What is Supported? <span style="color:var(--green)">✓</span></h2>

<h3>1. HTTP and REST Services</h3>
<ul>
  <li><strong>Native <code>fetch()</code>:</strong> You can use the standard web <code>fetch()</code> API. Flux intercepts these at the V8 isolate level.</li>
  <li><strong>HTTP Clients:</strong> Libraries that wrap <code>fetch()</code> (such as Axios, ky, or URLFetch) are natively supported.</li>
</ul>
<p><em>All outbound HTTP requests are buffered and checkpointed.</em></p>

<h3>2. Databases & TCP Protocols</h3>
<ul>
  <li><strong>Postgres:</strong> Native Postgres queries over plain TCP or TLS (using <code>rustls</code>). Libraries like <code>postgres.js</code> and <code>pg</code> that communicate over raw sockets are intercepted seamlessly.</li>
  <li><strong>Redis:</strong> Basic Redis interactions over standard TCP are supported and intercepted.</li>
</ul>

<h3>3. Frameworks</h3>
<ul>
  <li>Standard Deno web frameworks (like <strong>Hono</strong> or <strong>Oak</strong>) work perfectly as they strictly wrap standard HTTP request/response object lifecycles without relying on native Node.js binaries.</li>
</ul>

<hr>

<!-- ─── UNSUPPORTED ──────────────────────────────────────────────────────────── -->

<h2 id="unsupported">What is NOT Supported? <span style="color:var(--red)">✗</span></h2>
<p>To ensure that an execution trace is 100% deterministic and can be safely replayed, you must avoid side-effects that Flux cannot intercept:</p>

<h3>1. Local File System Writes</h3>
<ul>
  <li>Writing to disk using APIs like <code>Deno.writeFile</code> or <code>fs.writeFileSync</code> is <strong>not checkpointed</strong>.</li>
  <li><em>Why:</em> If you replay an execution, the file will be written again, breaking the idempotency guarantee of Flux replays.</li>
</ul>

<h3>2. Child Processes</h3>
<ul>
  <li>Spawning child processes using <code>Deno.Command</code> or similar <code>child_process</code> equivalents.</li>
  <li><em>Why:</em> Child process execution is non-deterministic and the internal I/O of the sub-process cannot be safely intercepted.</li>
</ul>

<h3>3. Non-TCP / Unix Sockets</h3>
<ul>
  <li>Communicating via local named pipes or Unix domain sockets (<code>/var/run/...</code>).</li>
  <li><em>Why:</em> Flux only intercepts native TCP/TLS socket connections. Local IPC mechanisms bypass the generic proxy layer.</li>
</ul>

<h3>4. Native Addons (N-API / C++)</h3>
<ul>
  <li>Custom C++ plugins or native addons break out of the Deno sandbox. Their network and system calls cannot be intercepted by the Flux runtime.</li>
</ul>

<div style="padding:32px 0 0;">
  <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:12px;padding:32px;">
    <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:8px;">Have a specific compatibility question?</h3>
    <p style="color:var(--muted);margin-bottom:20px;line-height:1.7;">Check out our issue tracker on GitHub if you need support for an additional protocol.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      <a class="btn-primary" href="https://github.com/flux-run/flux/issues">View GitHub Issues →</a>
    </div>
  </div>
</div>` }}
    />
  )
}

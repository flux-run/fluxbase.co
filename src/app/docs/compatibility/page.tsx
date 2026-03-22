import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Compatibility — Flux',
  description: 'What JavaScript and TypeScript patterns work in the Flux runtime. What flux check validates and npm package support.',
}

export default function Page() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
<h1>Compatibility</h1>
<p class="page-subtitle">What works in the Flux runtime, and how to check your code before running.</p>

<h2>The runtime model</h2>

<p>Flux runs your TypeScript and JavaScript in a <strong>Deno V8 isolate</strong>. It intercepts all external IO (Postgres, HTTP, TCP, Redis, timers) so it can record and replay them deterministically.</p>

<p>This means:</p>
<ul>
  <li>Standard Web APIs (<code>fetch</code>, <code>URL</code>, <code>crypto</code>, <code>TextEncoder</code> etc.) — ✓ supported</li>
  <li>TypeScript/ESM imports — ✓ supported</li>
  <li>npm packages (via <code>npm:</code> specifiers) — ✓ supported with caveats</li>
  <li>Node.js built-ins (<code>node:fs</code>, <code>node:http</code>, etc.) — ✗ not supported</li>
  <li>Browser-only globals (<code>window</code>, <code>document</code>, <code>localStorage</code>) — ✗ not available</li>
</ul>

<h2>flux check</h2>

<p>Run <code>flux check</code> to scan your project for compatibility issues before deploying.</p>

<pre><code><span class="shell-prompt">$</span> flux check index.ts

  checked   /Users/me/my-app/index.ts
  modules   12
  artifact  a3f9c8...

<span class="cm"># With an error:</span>
  error [node_import] index.ts: node: imports are not supported: node:crypto

<span class="cm"># Clean:</span>
  checked   /Users/me/my-app/index.ts
  modules   8
  artifact  b7d12e...</code></pre>

<table>
  <thead><tr><th>Flag</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td><code>[ENTRY]</code></td><td>Entry file to check (auto-detected if omitted)</td></tr>
  </tbody>
</table>

<h2>Diagnostic codes</h2>

<p>Errors block the dev/run/replay commands. Warnings are informational.</p>

<h3>Errors</h3>

<table>
  <thead><tr><th>Code</th><th>Cause</th><th>Fix</th></tr></thead>
  <tbody>
    <tr>
      <td><code>node_import</code></td>
      <td>Your code imports a <code>node:</code> built-in (<code>node:fs</code>, <code>node:crypto</code>, etc.)</td>
      <td>Use the Web API equivalent: <code>crypto.subtle</code> instead of <code>node:crypto</code>, <code>fetch</code> instead of <code>node:http</code></td>
    </tr>
    <tr>
      <td><code>unsupported_import</code></td>
      <td>An import specifier couldn't be resolved</td>
      <td>Check the import path is valid; use <code>npm:</code> prefix for npm packages</td>
    </tr>
    <tr>
      <td><code>load_failed</code></td>
      <td>A module file couldn't be read or fetched</td>
      <td>Check the file exists and the path is correct</td>
    </tr>
    <tr>
      <td><code>parse_failed</code></td>
      <td>Syntax error or unsupported JS/TS syntax</td>
      <td>Fix the syntax error in the indicated file</td>
    </tr>
  </tbody>
</table>

<h3>Warnings</h3>

<p>Warnings don't block execution but indicate patterns that may behave unexpectedly.</p>

<table>
  <thead><tr><th>Code</th><th>Globals detected</th><th>Note</th></tr></thead>
  <tbody>
    <tr>
      <td><code>unsupported_global</code></td>
      <td><code>Buffer</code>, <code>process</code>, <code>__dirname</code>, <code>__filename</code>, <code>global</code></td>
      <td>Node.js globals — not available in Deno V8. Use Web API equivalents or avoid them.</td>
    </tr>
    <tr>
      <td><code>unsupported_web_api</code></td>
      <td><code>window</code>, <code>document</code>, <code>navigator</code>, <code>localStorage</code>, <code>sessionStorage</code>, <code>Worker</code></td>
      <td>Browser-only APIs — not available in the server runtime.</td>
    </tr>
  </tbody>
</table>

<h2>npm packages</h2>

<p>Use <code>npm:</code> prefix in imports or add packages via <code>flux add</code>:</p>

<pre><code><span class="cm"># Add packages to deno.json</span>
<span class="shell-prompt">$</span> flux add hono zod

  adding   hono as npm:hono
  adding   zod as npm:zod
  updated  /Users/me/my-app/deno.json

<span class="cm"># Or import directly</span>
<span class="shell-prompt">$</span> cat index.ts
import { Hono } from 'npm:hono'
import { z } from 'npm:zod'</code></pre>

<p><code>flux check</code> analyses every npm package in your dependency tree and reports:</p>
<ul>
  <li><strong>Compatible</strong> — no problematic patterns found</li>
  <li><strong>Warning</strong> — uses Node.js globals or browser APIs (detected via source scan)</li>
  <li><strong>Incompatible</strong> — uses <code>node:</code> imports internally</li>
</ul>

<h3>Known compatible packages</h3>

<table>
  <thead><tr><th>Package</th><th>Use case</th></tr></thead>
  <tbody>
    <tr><td><code>hono</code></td><td>HTTP routing — the recommended framework</td></tr>
    <tr><td><code>zod</code></td><td>Input validation and schema parsing</td></tr>
    <tr><td><code>flux:pg</code></td><td>Built-in Postgres client (no npm needed)</td></tr>
  </tbody>
</table>

<h3>flux:pg — built-in Postgres</h3>

<p>Use <code>flux:pg</code> to connect to Postgres. It's built into the runtime — no npm package required, and all queries are recorded as checkpoints for replay.</p>

<pre><code>import { connect } from 'flux:pg'

const db = await connect(Deno.env.get('DATABASE_URL')!)

const rows = await db.query('SELECT * FROM orders WHERE id = $1', [id])</code></pre>

<h2>Supported Web APIs</h2>

<p>The Flux runtime is based on Deno, which supports the <a href="https://deno.land/api">Deno Web API surface</a>. Key APIs that work:</p>

<table>
  <thead><tr><th>API</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td><code>fetch</code></td><td>Recorded as an HTTP checkpoint — works and replays</td></tr>
    <tr><td><code>crypto.subtle</code></td><td>Web Crypto — use instead of <code>node:crypto</code></td></tr>
    <tr><td><code>TextEncoder</code> / <code>TextDecoder</code></td><td>Fully supported</td></tr>
    <tr><td><code>URL</code> / <code>URLSearchParams</code></td><td>Fully supported</td></tr>
    <tr><td><code>ReadableStream</code> / <code>WritableStream</code></td><td>Supported</td></tr>
    <tr><td><code>setTimeout</code> / <code>setInterval</code></td><td>Recorded as TIMER checkpoints — replays use recorded delay</td></tr>
    <tr><td><code>Deno.env.get()</code></td><td>Read environment variables</td></tr>
  </tbody>
</table>

<h2>Example: replacing Node.js patterns</h2>

<pre><code><span class="cm">// ✗ Node.js — won't work</span>
import crypto from 'node:crypto'
const id = crypto.randomUUID()

<span class="cm">// ✓ Web API — works in Flux</span>
const id = crypto.randomUUID()


<span class="cm">// ✗ Node.js — won't work</span>
import { readFileSync } from 'node:fs'
const data = readFileSync('./file.txt', 'utf8')

<span class="cm">// ✓ Deno — works in Flux</span>
const data = await Deno.readTextFile('./file.txt')


<span class="cm">// ✗ Node.js — won't work</span>
import http from 'node:http'

<span class="cm">// ✓ Hono + Flux — works</span>
import { Hono } from 'npm:hono'
const app = new Hono()
app.get('/health', (c) => c.json({ ok: true }))
export default app</code></pre>
` }}
    />
  )
}

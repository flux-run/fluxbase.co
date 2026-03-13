import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Inspect Database Mutations — Flux Docs',
  description: 'Use flux state history and flux state blame to audit every database change and trace it back to the request that caused it.',
}

export default function Page() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
<h1>Inspect Database Mutations</h1>
<p class="page-subtitle">Every INSERT, UPDATE, and DELETE linked to the request that caused it.</p>

<p><em>Scenario: a database row is in an unexpected state and you don't know what changed it or when.</em></p>

<h2>See the full mutation history for a row</h2>

<pre><code>$ flux state history users --id 42

  users id=42  (4 mutations)

  2026-03-10 12:00  INSERT  email=a@b.com, plan=free        req:1a2b3c4d
  2026-03-10 14:21  UPDATE  name: null → Alice Smith        req:a3c91ef0
  2026-03-10 14:22  UPDATE  plan: free → pro                req:4f9a3b2c
  2026-03-10 14:22  UPDATE  plan: pro → null  (rolled back) req:550e8400</code></pre>

<p>Every mutation is timestamped and linked to its <code>request_id</code>. The rollback on the last row tells you that <code>req:550e8400</code> attempted a change but the transaction was rolled back — likely due to an error.</p>

<h2>Find which request owns each column's current value</h2>

<pre><code>$ flux state blame users --id 42

  email   a@b.com   req:1a2b3c4d  2026-03-10 12:00
  name    Alice     req:a3c91ef0  2026-03-10 14:21
  plan    free      req:550e8400  2026-03-10 14:22  ✗ rolled back</code></pre>

<p><code>flux state blame</code> shows the last successful write to each column. The <code>✗ rolled back</code> marker means the most recent attempt was reverted — the current value comes from the previous successful write.</p>

<h2>Trace a mutation back to its request</h2>

<p>Each <code>req:</code> ID links directly to its execution record:</p>

<pre><code>$ flux why 550e8400

  ROOT CAUSE   Stripe API timeout after 10s
  LOCATION     payments/create.ts:42
  DATA CHANGES users.id=42  plan: free → null  (rolled back)</code></pre>

<p>Now you know exactly what caused the attempted mutation and why it was rolled back.</p>

<h2>Filter mutations by time range</h2>

<pre><code>$ flux state history users --id 42 --since 24h
$ flux state history orders --id 81b2 --between 2026-03-10T14:00 2026-03-10T15:00</code></pre>

<h2>Filter mutations by request</h2>

<pre><code># All tables mutated by a specific request
$ flux state history --request 550e8400

  users    id=42   plan: free → null  (rolled back)
  orders   id=81b2 status: pending → null  (rolled back)</code></pre>

<h2>Export mutation history</h2>

<pre><code>$ flux state history users --id 42 --format json > mutations.json
$ flux state history users --id 42 --format csv  > mutations.csv</code></pre>

<hr>

<p><a href="/docs/replay-incident">← Replay a Production Incident</a> &nbsp;·&nbsp; <a href="/docs/compare-executions">Compare Two Executions →</a></p>
` }} />
  )
}

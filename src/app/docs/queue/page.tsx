import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Queue & Async Jobs — Flux Docs',
  description: 'Durable async job processing in Flux: enqueue jobs, handle retries, inspect job execution records, and debug failed workers.',
}

export default function Page() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
<h1>Queue &amp; Async Jobs</h1>
<p class="page-subtitle">Durable background job processing — with execution records for every job run.</p>

<p>The Flux queue provides durable, at-least-once async job processing. Every job execution produces the same <a href="/docs/execution-record">execution record</a> as an HTTP request — spans, DB mutations, inputs, outputs, errors — so you can debug failed jobs with the same tools you use for HTTP requests.</p>

<h2>Enqueueing a job from a function</h2>

<pre><code>// functions/create_user.ts
export default async function handler(req, ctx) {
  const user = await ctx.db.insert('users', { email: req.body.email })

  // Enqueue an async job — returns immediately
  await ctx.queue.enqueue('send_welcome_email', {
    userId: user.id,
    email: req.body.email,
  })

  return new Response(JSON.stringify({ id: user.id }), { status: 201 })
}</code></pre>

<h2>Defining a worker</h2>

<pre><code>// functions/send_welcome_email.ts
export default async function handler(job, ctx) {
  const { userId, email } = job.data

  const user = await ctx.db.query(
    'SELECT name FROM users WHERE id = $1',
    [userId]
  )

  await ctx.email.send({
    to: email,
    template: 'welcome',
    data: { name: user.name },
  })
}
</code></pre>

<p>Workers are deployed alongside your functions with <code>flux deploy</code>. The runtime automatically routes enqueued jobs to the correct worker function.</p>

<h2>Execution records for jobs</h2>

<p>Every job run produces a full execution record. You can inspect it exactly like an HTTP request:</p>

<pre><code>$ flux tail --filter type=job

  JOB  send_welcome_email  done  220ms  req:b3c4d5e6
  JOB  send_welcome_email  done  180ms  req:c4d5e6f7
  JOB  send_welcome_email  error  44ms  req:d5e6f7a8
     └─ Error: user not found  (userId: u_99)</code></pre>

<pre><code>$ flux why d5e6f7a8

  ROOT CAUSE   Row not found: users WHERE id = 'u_99'
  LOCATION     send_welcome_email.ts:6
  JOB INPUT    { userId: 'u_99', email: 'a@b.com' }
  SUGGESTION   → Check that user row is committed before enqueueing job
               (consider using AFTER INSERT trigger or transactional enqueue)</code></pre>

<h2>Retry behaviour</h2>

<table>
  <thead><tr><th>Setting</th><th>Default</th><th>Description</th></tr></thead>
  <tbody>
    <tr><td>Max attempts</td><td>3</td><td>Job is marked failed after 3 consecutive errors</td></tr>
    <tr><td>Backoff</td><td>Exponential (1s, 4s, 16s)</td><td>Delay between retries</td></tr>
    <tr><td>Timeout per attempt</td><td>30s</td><td>Job is killed and retried if it exceeds this</td></tr>
    <tr><td>Dead-letter</td><td>Enabled</td><td>Failed jobs are moved to the dead-letter queue after max attempts</td></tr>
  </tbody>
</table>

<p>You can configure per-worker settings in your project config:</p>

<pre><code>// flux.config.ts
export default {
  workers: {
    send_welcome_email: {
      maxAttempts: 5,
      timeoutSeconds: 60,
      backoff: 'linear',
    },
  },
}</code></pre>

<h2>Dead-letter queue</h2>

<p>Jobs that exhaust all retries are moved to the dead-letter queue. You can inspect them:</p>

<pre><code>$ flux queue dead-letter list

  d5e6f7a8  send_welcome_email  failed 3×  last: user not found
  e6f7a8b9  send_invoice        failed 3×  last: Stripe 429 rate limit</code></pre>

<p>Each dead-letter entry has a full execution record for the last failed attempt. After fixing the underlying issue, you can re-enqueue them:</p>

<pre><code>$ flux queue dead-letter replay d5e6f7a8
  Re-enqueued  send_welcome_email  as req:f7a8b9c0</code></pre>

<h2>Transactional enqueue</h2>

<p>To avoid the race condition where a job is dispatched before the DB write it depends on is committed, use transactional enqueue:</p>

<pre><code>export default async function handler(req, ctx) {
  await ctx.db.transaction(async (tx) => {
    const user = await tx.insert('users', { email: req.body.email })

    // Job is enqueued atomically with the INSERT —
    // it will only be dispatched if the transaction commits
    await tx.queue.enqueue('send_welcome_email', { userId: user.id })
  })
}</code></pre>

<h2>Inspecting job history</h2>

<pre><code># All recent job executions
$ flux tail --filter type=job --last 1h

# Full trace for a specific job run
$ flux trace b3c4d5e6

# DB mutations caused by a job
$ flux state history users --filter req=b3c4d5e6</code></pre>

<hr>

<p><a href="/docs/database">← Database</a> &nbsp;·&nbsp; <a href="/docs/secrets">Secrets →</a></p>
` }} />
  )
}

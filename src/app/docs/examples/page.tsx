import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Examples — Flux Docs',
  description: 'Real-world examples: REST API, Stripe webhook handler, background worker.',
}

export default function Page() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
<h1>Examples</h1>
<p class="page-subtitle">Real backend patterns and how Flux records and debugs them.</p>

<nav style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;padding:16px 20px;margin:0 0 40px;">
  <div style="font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:10px;">On this page</div>
  <div style="display:flex;flex-direction:column;gap:4px;font-size:.875rem;">
    <a href="#full-lifecycle" style="color:var(--accent);text-decoration:none;">Full incident lifecycle</a>
    <a href="#rest-api" style="color:var(--accent);text-decoration:none;">Build a REST API</a>
    <a href="#stripe-webhook" style="color:var(--accent);text-decoration:none;">Handle Stripe webhooks</a>
    <a href="#background-worker" style="color:var(--accent);text-decoration:none;">Debug a background worker</a>
  </div>
</nav>

<h2 id="full-lifecycle">Full incident lifecycle</h2>

<p>This walkthrough shows the complete production debugging loop — from a customer reporting a bug, to root-cause, to verified fix — using a Stripe webhook as the example.</p>

<p><em>Scenario: a customer reports their subscription did not activate after payment. You have no idea why.</em></p>

<h3>Step 1 — Detect the failure</h3>

<pre><code>$ flux tail --filter path=/stripe_webhook --filter status=500

  POST /stripe_webhook  500  32ms  req:7c8d9e0f  09:14:22
     └─ Error: Row not found: subscriptions WHERE customer_id = 'cus_ABC'</code></pre>

<p>You have the failing request ID: <code>req:7c8d9e0f</code>.</p>

<h3>Step 2 — Root-cause</h3>

<pre><code>$ flux why 7c8d9e0f

  ROOT CAUSE   Row not found: subscriptions WHERE customer_id = 'cus_ABC'
  LOCATION     stripe_webhook.ts:6
  INPUT        Stripe event: payment_intent.succeeded
               customer_id: cus_ABC  amount: 4900
  DATA CHANGES subscriptions  UPDATE  0 rows affected
  SUGGESTION   → Customer row does not exist at webhook time
               Check that signup flow creates the row before payment</code></pre>

<h3>Step 3 — Confirm with full trace</h3>

<pre><code>$ flux trace debug 7c8d9e0f

  Step 1/3  gateway
    Input:   POST /stripe_webhook
    Output:  { tenant_id: 't_123', event_type: 'payment_intent.succeeded' }
    Time:    2ms

  Step 2/3  stripe_webhook
    Input:   { customer_id: 'cus_ABC', amount: 4900 }
    Error:   Row not found: subscriptions WHERE customer_id = 'cus_ABC'
    Time:    28ms

  Step 3/3  (skipped — upstream error)</code></pre>

<p>Now you understand the exact failure: the subscription row doesn't exist at webhook time, likely because signup and payment happen in the wrong order. You fix the signup function to create the subscription row before the payment is initiated.</p>

<h3>Step 4 — Verify without deploying to production</h3>

<pre><code>$ flux incident replay 09:00..09:20

  Replaying 7 requests from 09:00–09:20…
  Side-effects: email off · webhooks stubbed

  ✔  req:1a2b3c4d  POST /stripe_webhook  200  44ms
  ✔  req:7c8d9e0f  POST /stripe_webhook  200  51ms  ← was 500

  7 replayed · 7 passing · 0 still failing  ✔ incident resolved</code></pre>

<h3>Step 5 — Deploy and confirm live</h3>

<pre><code>$ flux deploy

$ flux tail --filter path=/stripe_webhook

  POST /stripe_webhook  200  48ms  req:d4e5f6a7
  POST /stripe_webhook  200  51ms  req:e5f6a7b8

  ✔ No more 500s</code></pre>

<p>Total time from "customer reports bug" to "verified fix deployed": under 10 minutes.</p>

<h2 id="rest-api">Build a REST API</h2>

<p>A typical <code>POST /users</code> function deployed to Flux:</p>

<pre><code>// functions/create_user.ts
export default async function handler(req, ctx) {
  const { email, name } = await req.json()

  if (!email) {
    return new Response(JSON.stringify({ error: 'email required' }), { status: 400 })
  }

  const user = await ctx.db.insert('users', { email, name, created_at: new Date() })
  return new Response(JSON.stringify({ id: user.id }), { status: 201 })
}
</code></pre>

<p>After <code>flux deploy</code> and a few requests, every execution is recorded automatically. You can inspect any of them:</p>

<pre><code>$ flux tail

  POST /create_user  201  81ms  req:4f9a3b2c
     users.id=u_42  insert

  POST /create_user  400  12ms  req:a1b2c3d4
     ← Error: email required

$ flux why a1b2c3d4

  ROOT CAUSE   Validation error: email required
  LOCATION     create_user.ts:5
  INPUT        { name: "Alice" }   ← email was missing
  SUGGESTION   → Add client-side validation or return clear error message</code></pre>

<p>The mutation log for the successful request:</p>

<pre><code>$ flux state history users --id u_42

  users id=u_42  (1 mutation)
  2026-03-10 09:14  INSERT  email=a@b.com, name=Alice  req:4f9a3b2c</code></pre>

<h2 id="stripe-webhook">Handle Stripe webhooks</h2>

<p>Stripe webhooks are ideal for Flux because failures are hard to reproduce — the exact payload that caused the failure is preserved in the execution record.</p>

<pre><code>// functions/stripe_webhook.ts
export default async function handler(req, ctx) {
  const event = await ctx.stripe.verifyWebhook(req)

  if (event.type === 'payment_intent.succeeded') {
    const { customer_id, amount } = event.data.object
    await ctx.db.update('subscriptions', { customer_id }, { status: 'active', paid_at: new Date() })
    await ctx.email.send({ to: customer_id, template: 'payment_success', data: { amount } })
  }

  return new Response('ok', { status: 200 })
}
</code></pre>

<p><strong>Debugging a failed webhook</strong></p>

<p>A customer reports their subscription didn't activate after paying. With a traditional setup you'd need to find the Stripe event ID in their dashboard, correlate it to your logs, and hope the payload was logged somewhere. With Flux:</p>

<pre><code>$ flux tail --filter path=/stripe_webhook --filter status=500

  POST /stripe_webhook  500  32ms  req:7c8d9e0f
     └─ Error: customer_id not found in subscriptions

$ flux why 7c8d9e0f

  ROOT CAUSE   Row not found: subscriptions WHERE customer_id = 'cus_ABC'
  LOCATION     stripe_webhook.ts:6
  INPUT        Stripe event: payment_intent.succeeded
               customer_id: cus_ABC
               amount: 4900
  DATA CHANGES subscriptions  UPDATE  0 rows affected
  SUGGESTION   → Check that customer record was created before payment completes</code></pre>

<p>The full Stripe payload is stored in the execution record — you can replay it:</p>

<pre><code>$ flux incident replay 09:00..09:05

  Replaying 3 Stripe webhook requests…
  Side-effects: email sending off

  ✔  req:1a2b3c4d  payment_intent.succeeded  200  44ms
  ✗  req:7c8d9e0f  payment_intent.succeeded  500  32ms
     └─ Still failing: customer_id not found</code></pre>

<h2 id="background-worker">Debug a background worker</h2>

<p>Async jobs enqueued via the Flux queue are treated as first-class requests — each job execution produces an execution record with its own ID.</p>

<pre><code>// functions/send_onboarding_email.ts
export default async function handler(job, ctx) {
  const { userId } = job.data

  const user = await ctx.db.query('SELECT email, name FROM users WHERE id = $1', [userId])
  if (!user) throw new Error(\`User \${userId} not found\`)

  await ctx.email.send({
    to: user.email,
    template: 'welcome',
    data: { name: user.name },
  })
}
</code></pre>

<p>If the job fails silently (no 5xx, just wrong behaviour):</p>

<pre><code>$ flux tail --filter function=send_onboarding_email

  JOB  send_onboarding_email  done  220ms  req:b3c4d5e6
  JOB  send_onboarding_email  done  180ms  req:c4d5e6f7

  # Both show "done" — but emails weren't sent?

$ flux trace c4d5e6f7

  queue.dispatch              2ms
  └─ send_onboarding_email  178ms
     ├─ db.query(users)        3ms   → { email: 'a@b.com', name: 'Alice' }
     ├─ email.send            170ms  → { status: 'queued', provider: 'sendgrid' }
     └─ response               1ms   200 OK

$ flux state history email_sends --filter job=c4d5e6f7

  # No rows — email.send returned 200 but SendGrid rejected it silently
  # → Check SendGrid logs with the provider message ID from the trace</code></pre>

<p>Because the entire job execution is recorded, you can walk through exactly what the worker did and compare it against a successful run with <code>flux trace diff</code>.</p>

<hr>

<p><a href="/docs/common-tasks">← Common Tasks</a> &nbsp;·&nbsp; <a href="/docs/production">Production Guide →</a></p>
` }} />
  )
}

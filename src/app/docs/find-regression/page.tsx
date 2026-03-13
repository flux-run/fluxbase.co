import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Find the Commit That Broke a Request — Flux Docs',
  description: 'Use flux bug bisect to binary-search your git history and identify the exact commit that introduced a production regression.',
}

export default function Page() {
  return (
    <div dangerouslySetInnerHTML={{ __html: `
<h1>Find the Commit That Broke a Request</h1>
<p class="page-subtitle">Binary-search your git history to isolate the first bad commit — like git bisect, but for production behaviour.</p>

<p><em>Scenario: a request that was passing last week is now failing. You have 40 commits between a known-good state and now.</em></p>

<h2>Step 1 — Find the failing request ID</h2>

<pre><code>$ flux tail --filter status=500

  POST /signup  500  44ms  req:550e8400</code></pre>

<h2>Step 2 — Run bisect</h2>

<pre><code>$ flux bug bisect --request 550e8400

  Bisecting 42 commits (2026-03-01..2026-03-10)…

  Testing abc123…  ✔ passes
  Testing fde789…  ✔ passes
  Testing def456…  ✗ fails

  FIRST BAD COMMIT
  def456  "feat: add retry logic to stripe.charge"
  2026-03-08  alice@example.com</code></pre>

<p>Bisect re-runs the request input from the execution record against your code at each commit, checking out each in binary search order. It stops at the first commit where the request outcome changed from passing to failing.</p>

<h2>Step 3 — Confirm what changed</h2>

<pre><code>$ flux trace diff abc123:550e8400 def456:550e8400

  SPAN              COMMIT abc123    COMMIT def456
  ──────────────────────────────────────────────────────
  stripe.charge     68ms ✔           → timeout (10s)  ✗</code></pre>

<p>The diff confirms exactly which span changed behaviour between the last good commit and the first bad one.</p>

<h2>Bisect options</h2>

<pre><code># Search a specific commit range
$ flux bug bisect --request 550e8400 --since 2026-03-01 --until 2026-03-10

# Bisect against a different environment
$ flux bug bisect --request 550e8400 --env staging

# Use a specific pass/fail criterion instead of status code
$ flux bug bisect --request 550e8400 --fail-if "span.stripe.charge.duration > 5000"</code></pre>

<h2>How bisect works</h2>

<ol>
  <li>Reads the <code>request_input</code> from the execution record (<code>550e8400</code>)</li>
  <li>Checks out each commit in binary search order</li>
  <li>Re-runs the request input against the code at that commit in an isolated sandbox</li>
  <li>Compares the response status and span tree signature to determine pass/fail</li>
  <li>Continues until it isolates the first failing commit</li>
</ol>

<p>Bisect requires your project to be a git repository with <code>flux</code> auth configured. It does not deploy to production — it runs in an isolated build environment per commit.</p>

<h2>Requirements</h2>

<ul>
  <li>Git repository with commit history covering the regression window</li>
  <li><code>FLUX_API_KEY</code> with CI scope (<code>flux auth ci</code>)</li>
  <li>The failing request must have an execution record within the retention window</li>
</ul>

<hr>

<p><a href="/docs/compare-executions">← Compare Two Executions</a> &nbsp;·&nbsp; <a href="/docs/common-tasks">All Common Tasks →</a></p>
` }} />
  )
}

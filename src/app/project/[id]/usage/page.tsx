"use client";
import { use, useEffect, useMemo, useState } from "react";
import { ArrowRight, Zap, CheckCircle2, AlertTriangle, TrendingUp, Clock, Database, DollarSign, ExternalLink } from "lucide-react";
import { useFluxApi } from "@/lib/api";
import { Execution } from "@/types/api";
import { LIMITS, OVERAGE, PRICING_TIERS, type PlanId } from "@/lib/pricing";

// ─── Plan config ─────────────────────────────────────────────────────────────
// TODO: replace with real plan fetched from billing API once available
const CURRENT_PLAN: PlanId = "free";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtMs(ms: number) {
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)} min`;
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(1)}s`;
  return `${ms}ms`;
}

function fmtPct(used: number, limit: number) {
  if (limit < 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function UsageBar({ pct, warn = 70, danger = 90 }: { pct: number; warn?: number; danger?: number }) {
  const color =
    pct >= danger ? "bg-red-500" : pct >= warn ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div className="h-1.5 w-full rounded-full bg-neutral-800/80 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function MetaRow({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-neutral-800/40 last:border-0">
      <span className="text-[10px] text-neutral-600 font-mono">{label}</span>
      <span className={`text-[10px] font-mono font-bold ${dim ? "text-neutral-600" : "text-neutral-300"}`}>{value}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function UsagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const api = useFluxApi(id);

  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);

  const plan = PRICING_TIERS.find((t) => t.id === CURRENT_PLAN)!;
  const limits = LIMITS[CURRENT_PLAN];

  useEffect(() => {
    if (!api.ready) return;
    api.getExecutions(id).then((data) => {
      setExecutions(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [api.ready, id]);

  const stats = useMemo(() => {
    const total = executions.length;
    const failed = executions.filter((e) => e.status !== "ok" && e.status !== "success").length;
    const succeeded = total - failed;
    const successRate = total > 0 ? Math.round((succeeded / total) * 100) : 100;

    const durations = executions.map((e) => e.duration_ms ?? 0).filter((d) => d > 0);
    const totalComputeMs = durations.reduce((s, d) => s + d, 0);
    const avgDurationMs = durations.length > 0 ? Math.round(totalComputeMs / durations.length) : 0;

    // Group by function name for top sources
    const byFn = new Map<string, number>();
    for (const e of executions) {
      const fn = e.function_name ?? "unknown";
      byFn.set(fn, (byFn.get(fn) ?? 0) + 1);
    }
    const topSources = [...byFn.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        name,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }));

    // Bucketize last 7 days
    const now = Date.now();
    const dayBuckets: number[] = Array(7).fill(0);
    for (const e of executions) {
      if (!e.started_at) continue;
      const daysAgo = Math.floor((now - new Date(e.started_at).getTime()) / 86_400_000);
      if (daysAgo >= 0 && daysAgo < 7) dayBuckets[daysAgo]++;
    }

    return {
      total,
      failed,
      succeeded,
      successRate,
      totalComputeMs,
      avgDurationMs,
      topSources,
      dayBuckets, // index 0 = today, 1 = yesterday, ...
    };
  }, [executions]);

  const execPct = fmtPct(stats.total, limits.executions);
  const nextPlan = PRICING_TIERS.find((t) => {
    const l = LIMITS[t.id];
    return l.executions > limits.executions || l.executions === -1;
  });

  // Rough cost estimate (free = $0; otherwise overage on top of base)
  const planPrice = plan.price ?? 0;
  const overageExecs = Math.max(0, stats.total - (limits.executions > 0 ? limits.executions : Infinity));
  const overageCost = Math.ceil(overageExecs / 1_000_000) * OVERAGE.pricePerMillionExec;
  const estimatedCost = planPrice + overageCost;

  const isAtLimit   = limits.executions > 0 && stats.total >= limits.executions;
  const isNearLimit = !isAtLimit && execPct >= 70;

  if (loading) {
    return (
      <div className="space-y-4 animate-in fade-in duration-300 pb-16">
        <div className="h-6 w-32 bg-neutral-900 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-neutral-900/40 rounded-xl border border-neutral-800/30 animate-pulse" />
          ))}
        </div>
        <div className="h-40 bg-neutral-900/40 rounded-xl border border-neutral-800/30 animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-52 bg-neutral-900/40 rounded-xl border border-neutral-800/30 animate-pulse" />
          <div className="h-52 bg-neutral-900/40 rounded-xl border border-neutral-800/30 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-16">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-white tracking-tight">Usage &amp; Billing</h1>
          <p className="text-[11px] text-neutral-600 font-mono mt-0.5">Current billing period · month-to-date</p>
        </div>
        <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded border ${
          CURRENT_PLAN === "free"
            ? "text-neutral-400 bg-neutral-900 border-neutral-700"
            : CURRENT_PLAN === "builder"
            ? "text-blue-400 bg-blue-950/40 border-blue-800/40"
            : CURRENT_PLAN === "startup"
            ? "text-violet-400 bg-violet-950/40 border-violet-800/40"
            : "text-emerald-400 bg-emerald-950/40 border-emerald-800/40"
        }`}>
          {plan.name} plan
        </span>
      </div>

      {/* ── Limit alert banner ─────────────────────────────────────────────── */}
      {isAtLimit && (
        <div className="flex items-center gap-3 rounded-xl border border-red-800/60 bg-red-950/20 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-red-300">Execution limit reached</p>
            <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
              New executions may be queued or delayed. Upgrade to remove the cap.
            </p>
          </div>
          {nextPlan && (
            <a
              href="/pricing"
              className="shrink-0 flex items-center gap-1.5 text-[9px] font-black text-white bg-red-600 hover:bg-red-500 rounded-lg px-3 py-1.5 transition-colors"
            >
              Upgrade <ArrowRight className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
      {isNearLimit && !isAtLimit && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-800/50 bg-amber-950/15 px-4 py-3">
          <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-amber-300">
              You&apos;re using Flux actively — consider upgrading to avoid interruptions
            </p>
            <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
              {execPct}% of your monthly execution quota used
            </p>
          </div>
          {nextPlan && (
            <a
              href="/pricing"
              className="shrink-0 flex items-center gap-1.5 text-[9px] font-black text-amber-400 hover:text-amber-300 border border-amber-800/50 hover:border-amber-700 rounded-lg px-3 py-1.5 transition-colors"
            >
              See plans <ArrowRight className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {/* Executions */}
        <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-neutral-500">
              <Zap className="w-3 h-3" />
              <span className="text-[9px] font-black uppercase tracking-widest">Executions</span>
            </div>
            <span className={`text-[8px] font-black ${execPct >= 90 ? "text-red-400" : execPct >= 70 ? "text-amber-400" : "text-neutral-600"}`}>
              {limits.executions > 0 ? `${execPct}%` : "∞"}
            </span>
          </div>
          <div>
            <p className="text-2xl font-black tabular-nums text-white leading-none">{fmtNum(stats.total)}</p>
            <p className="text-[9px] text-neutral-600 font-mono mt-1">
              {limits.executions > 0 ? `of ${fmtNum(limits.executions)} limit` : "unlimited"}
            </p>
          </div>
          {limits.executions > 0 && <UsageBar pct={execPct} />}
        </div>

        {/* Compute */}
        <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 px-4 py-4 space-y-3">
          <div className="flex items-center gap-1.5 text-neutral-500">
            <Clock className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase tracking-widest">Compute</span>
          </div>
          <div>
            <p className="text-2xl font-black tabular-nums text-white leading-none">{fmtMs(stats.totalComputeMs)}</p>
            <p className="text-[9px] text-neutral-600 font-mono mt-1">total runtime</p>
          </div>
          <p className="text-[9px] text-neutral-600 font-mono">avg {fmtMs(stats.avgDurationMs)} / exec</p>
        </div>

        {/* Success rate */}
        <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 px-4 py-4 space-y-3">
          <div className="flex items-center gap-1.5 text-neutral-500">
            <CheckCircle2 className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase tracking-widest">Success rate</span>
          </div>
          <div>
            <p className={`text-2xl font-black tabular-nums leading-none ${
              stats.successRate >= 95 ? "text-emerald-400"
              : stats.successRate >= 80 ? "text-amber-400"
              : "text-red-400"
            }`}>
              {stats.successRate}%
            </p>
            <p className="text-[9px] text-neutral-600 font-mono mt-1">
              {fmtNum(stats.failed)} failed · {fmtNum(stats.succeeded)} ok
            </p>
          </div>
          <UsageBar pct={100 - stats.successRate} warn={5} danger={20} />
        </div>

        {/* Estimated cost */}
        <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 px-4 py-4 space-y-3">
          <div className="flex items-center gap-1.5 text-neutral-500">
            <DollarSign className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase tracking-widest">Est. Cost</span>
          </div>
          <div>
            <p className="text-2xl font-black tabular-nums text-white leading-none">
              ${estimatedCost.toFixed(2)}
            </p>
            <p className="text-[9px] text-neutral-600 font-mono mt-1">
              this billing period
            </p>
          </div>
          {overageCost > 0 && (
            <p className="text-[9px] text-amber-500/80 font-mono">incl. ${overageCost.toFixed(2)} overage</p>
          )}
          {overageCost === 0 && planPrice === 0 && (
            <p className="text-[9px] text-emerald-600 font-mono">within free tier</p>
          )}
        </div>
      </div>

      {/* ── Plan + limits ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-neutral-800/40 flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Current Plan</span>
          <a
            href="/pricing"
            className="flex items-center gap-1 text-[8px] font-black text-neutral-600 hover:text-blue-400 transition-colors"
          >
            Compare plans <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
        <div className="px-4 py-4">
          <div className="flex items-start justify-between gap-6">
            {/* Plan name + price */}
            <div className="shrink-0">
              <p className="text-base font-black text-white">{plan.name}</p>
              <p className="text-2xl font-black text-white tabular-nums mt-1">
                {plan.price === null ? "Custom" : plan.price === 0 ? "Free" : `$${plan.price}`}
                {plan.price !== null && plan.price > 0 && (
                  <span className="text-[11px] font-bold text-neutral-500 ml-1">/mo</span>
                )}
              </p>
              <p className="text-[10px] text-neutral-600 font-mono mt-1 max-w-[160px] leading-relaxed">{plan.tagline}</p>
            </div>

            {/* Limits grid */}
            <div className="flex-1 grid grid-cols-3 gap-x-8 gap-y-3">
              {[
                {
                  label: "Executions",
                  used: stats.total,
                  limit: limits.executions,
                  fmt: fmtNum,
                },
                {
                  label: "Retention",
                  used: null,
                  limit: null,
                  text: limits.retentionDays > 0 ? `${limits.retentionDays} days` : "Custom",
                },
                {
                  label: "Team members",
                  used: null,
                  limit: null,
                  text: limits.members === -1 ? "Unlimited" : String(limits.members),
                },
                {
                  label: "Environments",
                  used: null,
                  limit: null,
                  text: limits.environments === -1 ? "Unlimited" : String(limits.environments),
                },
                {
                  label: "API keys",
                  used: null,
                  limit: null,
                  text: limits.apiKeys === -1 ? "Unlimited" : String(limits.apiKeys),
                },
                {
                  label: "Custom domains",
                  used: null,
                  limit: null,
                  text: limits.customDomains === 0 ? "Not included" : limits.customDomains === -1 ? "Unlimited" : String(limits.customDomains),
                },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[9px] text-neutral-600 font-mono">{item.label}</p>
                  {item.used !== null && item.limit !== null ? (
                    <>
                      <p className="text-[11px] font-black text-neutral-300 mt-0.5">
                        {item.fmt!(item.used)}
                        <span className="text-neutral-600 font-normal"> / {item.limit === -1 ? "∞" : item.fmt!(item.limit)}</span>
                      </p>
                      {item.limit > 0 && (
                        <div className="mt-1">
                          <UsageBar pct={fmtPct(item.used, item.limit)} />
                        </div>
                      )}
                    </>
                  ) : (
                    <p className={`text-[11px] font-black mt-0.5 ${
                      item.text === "Not included" ? "text-neutral-600" : "text-neutral-300"
                    }`}>{item.text}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-column detail ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">

        {/* Usage breakdown */}
        <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-neutral-800/40">
            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Usage Breakdown</span>
          </div>
          <div className="px-4 py-3 space-y-0">
            <p className="text-[8px] font-black uppercase tracking-widest text-neutral-700 mb-1.5">Executions</p>
            <MetaRow label="Total executions" value={stats.total.toLocaleString()} />
            <MetaRow label="Succeeded" value={`${stats.succeeded.toLocaleString()} (${stats.successRate}%)`} />
            <MetaRow label="Failed" value={`${stats.failed.toLocaleString()}`} dim={stats.failed === 0} />
            {limits.executions > 0 && (
              <MetaRow label="Remaining" value={`${Math.max(0, limits.executions - stats.total).toLocaleString()}`} dim={limits.executions - stats.total <= 0} />
            )}
            <p className="text-[8px] font-black uppercase tracking-widest text-neutral-700 mt-3 mb-1.5">Compute</p>
            <MetaRow label="Total runtime" value={fmtMs(stats.totalComputeMs)} />
            <MetaRow label="Avg per execution" value={fmtMs(stats.avgDurationMs)} />
            <p className="text-[8px] font-black uppercase tracking-widest text-neutral-700 mt-3 mb-1.5">Storage</p>
            <MetaRow label="Trace retention" value={limits.retentionDays > 0 ? `${limits.retentionDays} days` : "Custom"} />
            <MetaRow label="Log storage" value="included" dim />
          </div>
        </div>

        {/* Top sources + last 7 days */}
        <div className="space-y-3">

          {/* Top sources */}
          <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-neutral-800/40">
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Top Usage Sources</span>
            </div>
            {stats.topSources.length === 0 ? (
              <p className="px-4 py-4 text-[10px] text-neutral-600 font-mono">No executions recorded yet.</p>
            ) : (
              <div className="px-4 py-3 space-y-2.5">
                {stats.topSources.map((src) => (
                  <div key={src.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-mono text-neutral-400 truncate max-w-[65%]">{src.name}</span>
                      <span className="text-[9px] font-black text-neutral-400 shrink-0">
                        {fmtNum(src.count)} — {src.pct}%
                      </span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-neutral-800/70 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500/60"
                        style={{ width: `${src.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Last 7 days */}
          <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-neutral-800/40">
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Last 7 Days</span>
            </div>
            <div className="px-4 py-3 space-y-0">
              {["Today", "Yesterday", "2d ago", "3d ago", "4d ago", "5d ago", "6d ago"].map((label, i) => (
                <MetaRow
                  key={label}
                  label={label}
                  value={`${stats.dayBuckets[i].toLocaleString()} exec${stats.dayBuckets[i] !== 1 ? "s" : ""}`}
                  dim={stats.dayBuckets[i] === 0}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Cost estimation ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-neutral-800/40">
          <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Cost Estimation</span>
        </div>
        <div className="px-4 py-3">
          <p className="text-[9px] text-neutral-600 font-mono mb-3">
            You are charged for: execution count · compute duration · storage retained
          </p>
          <div className="space-y-0 divide-y divide-neutral-800/30">
            <div className="flex justify-between items-center py-2">
              <span className="text-[10px] font-mono text-neutral-500">Base plan ({plan.name})</span>
              <span className="text-[10px] font-black text-neutral-300 tabular-nums">
                {plan.price === 0 ? "$0.00" : `$${(plan.price ?? 0).toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[10px] font-mono text-neutral-500">
                Executions
                <span className="text-neutral-700 ml-1">({fmtNum(Math.min(stats.total, limits.executions > 0 ? limits.executions : stats.total))} included)</span>
              </span>
              <span className="text-[10px] font-black text-neutral-300 tabular-nums">$0.00</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[10px] font-mono text-neutral-500">
                Overage
                {overageExecs > 0 && (
                  <span className="text-neutral-700 ml-1">
                    ({fmtNum(overageExecs)} × ${OVERAGE.pricePerMillionExec}/M)
                  </span>
                )}
              </span>
              <span className={`text-[10px] font-black tabular-nums ${overageCost > 0 ? "text-amber-400" : "text-neutral-600"}`}>
                {overageCost > 0 ? `$${overageCost.toFixed(2)}` : "—"}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[10px] font-mono text-neutral-500">Compute duration</span>
              <span className="text-[10px] font-black text-neutral-600 tabular-nums">included</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[10px] font-mono text-neutral-500">Storage ({limits.retentionDays > 0 ? `${limits.retentionDays}-day` : "custom"} retention)</span>
              <span className="text-[10px] font-black text-neutral-600 tabular-nums">included</span>
            </div>
            <div className="flex justify-between items-center pt-3">
              <span className="text-[10px] font-black text-white">Estimated total</span>
              <span className="text-base font-black text-white tabular-nums">${estimatedCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Upgrade CTA ────────────────────────────────────────────────────── */}
      {nextPlan && (
        <div className="rounded-xl border border-blue-900/40 bg-blue-950/10 overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black text-white">
                Upgrade to {nextPlan.name}
                {nextPlan.price !== null && nextPlan.price > 0 && (
                  <span className="text-neutral-500 font-bold text-[11px] ml-1.5">${nextPlan.price}/mo</span>
                )}
              </p>
              <p className="text-[10px] text-neutral-500 font-mono mt-0.5 max-w-sm">{nextPlan.tagline}</p>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {[
                  `${LIMITS[nextPlan.id].executions === -1 ? "Unlimited" : fmtNum(LIMITS[nextPlan.id].executions)} executions/mo`,
                  `${LIMITS[nextPlan.id].retentionDays === -1 ? "Custom" : `${LIMITS[nextPlan.id].retentionDays}-day`} retention`,
                  `${LIMITS[nextPlan.id].members === -1 ? "Unlimited" : LIMITS[nextPlan.id].members} member${LIMITS[nextPlan.id].members !== 1 ? "s" : ""}`,
                ].map((feat) => (
                  <span key={feat} className="flex items-center gap-1 text-[9px] text-neutral-400 font-mono">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500/60" />
                    {feat}
                  </span>
                ))}
              </div>
            </div>
            <a
              href="/pricing"
              className="shrink-0 flex items-center gap-1.5 text-[10px] font-black text-white bg-blue-600 hover:bg-blue-500 rounded-lg px-4 py-2 transition-colors"
            >
              View plans <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

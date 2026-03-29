"use client";
import { use, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Zap, CheckCircle2, AlertTriangle, TrendingUp, Clock, Database, DollarSign, ExternalLink } from "lucide-react";
import { useFluxApi } from "@/lib/api";
import { ProjectObservabilityResult, ProjectUsageResult } from "@/types/api";
import { LIMITS, OVERAGE, PRICING_TIERS, type PlanId } from "@/lib/pricing";

type BillingPeriod = "mtd" | "lastMonth";

// ─── Plan config ─────────────────────────────────────────────────────────────
// TODO: replace with real plan fetched from billing API once available
const CURRENT_PLAN: PlanId = "free";
const ESTIMATED_STORAGE_BYTES_PER_EXECUTION = 8 * 1024;

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

function fmtBytes(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function monthRange(period: BillingPeriod) {
  const now = new Date();
  if (period === "mtd") {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: now,
    };
  }

  return {
    start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
  };
}

function nextBillingDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
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
  const searchParams = useSearchParams();
  const api = useFluxApi(id); 
  const fromReplay = searchParams.get("fromReplay") === "1";

  const [usageData, setUsageData] = useState<ProjectUsageResult | null>(null);
  const [observabilityData, setObservabilityData] = useState<ProjectObservabilityResult | null>(null);
  const [loading, setLoading] = useState(true); 
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("mtd");

  const plan = PRICING_TIERS.find((t) => t.id === CURRENT_PLAN)!;
  const limits = LIMITS[CURRENT_PLAN]; 

  useEffect(() => {
    if (!api.ready) return;
    let cancelled = false;

    setLoading(true);
    Promise.all([
      api.getProjectUsage(id, billingPeriod),
      api.getProjectObservability(id),
    ])
      .then(async ([usage, observability]) => {
        if (cancelled) return;
        let resolvedUsage = usage;

        // Fallback path to prevent empty usage dashboards if backend aggregation is unavailable.
        if (!resolvedUsage) {
          const rawExecutions = await api.getExecutions(id).catch(() => []);
          const rows = Array.isArray(rawExecutions) ? rawExecutions : [];
          const { start, end } = monthRange(billingPeriod);

          const filtered = rows.filter((execution) => {
            if (!execution.started_at) return false;
            const ts = new Date(execution.started_at).getTime();
            return ts >= start.getTime() && ts <= end.getTime();
          });

          const total = filtered.length;
          const failed = filtered.filter((execution) => execution.status !== "ok" && execution.status !== "success").length;
          const totalComputeMs = filtered.reduce((sum, execution) => sum + (execution.duration_ms ?? 0), 0);
          const avgDurationMs = total > 0 ? Math.round(totalComputeMs / total) : 0;

          const byPath = new Map<string, number>();
          for (const execution of filtered) {
            const path = execution.path ?? "unknown";
            byPath.set(path, (byPath.get(path) ?? 0) + 1);
          }

          const top_sources = [...byPath.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([source, count]) => ({
              source,
              count,
              pct: total > 0 ? Math.round((count / total) * 100) : 0,
            }));

          const trend = Array.from({ length: 7 }, (_, offset) => {
            const day = new Date();
            day.setHours(0, 0, 0, 0);
            day.setDate(day.getDate() - (6 - offset));
            const dayStart = day.getTime();
            const dayEnd = dayStart + 86_399_999;

            const dayRows = rows.filter((execution) => {
              if (!execution.started_at) return false;
              const ts = new Date(execution.started_at).getTime();
              return ts >= dayStart && ts <= dayEnd;
            });

            const y = day.getFullYear();
            const m = String(day.getMonth() + 1).padStart(2, "0");
            const d = String(day.getDate()).padStart(2, "0");

            return {
              day: `${y}-${m}-${d}`,
              executions: dayRows.length,
              compute_ms: dayRows.reduce((sum, execution) => sum + (execution.duration_ms ?? 0), 0),
            };
          });

          resolvedUsage = {
            period: billingPeriod,
            range: {
              start: start.toISOString(),
              end: end.toISOString(),
            },
            usage: {
              total_executions: total,
              failed_executions: failed,
              total_compute_ms: totalComputeMs,
              avg_duration_ms: avgDurationMs,
            },
            top_sources,
            trend,
          };
        }

        setUsageData(resolvedUsage);
        setObservabilityData(observability);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, api.ready, billingPeriod, id]);

  const stats = useMemo(() => {
    const usage = usageData?.usage;
    const total = usage?.total_executions ?? 0;
    const failed = usage?.failed_executions ?? 0;
    const totalComputeMs = usage?.total_compute_ms ?? 0;
    const avgDurationMs = usage?.avg_duration_ms ?? 0;
    const estimatedStorageBytes = total * ESTIMATED_STORAGE_BYTES_PER_EXECUTION;

    const topSources = (usageData?.top_sources ?? []).map((source) => ({
      name: source.source,
      count: source.count,
      pct: source.pct,
    }));

    const sortedTrendRows = [...(usageData?.trend ?? [])].sort((a, b) => a.day.localeCompare(b.day));
    const trendByDay = new Map(sortedTrendRows.map((row) => [row.day, row]));
    const toDayKey = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    const trend = Array.from({ length: 7 }, (_, index) => ({
      label: index === 6 ? "Today" : `${6 - index}d`,
      executions: (() => {
        const day = new Date();
        day.setDate(day.getDate() - (6 - index));
        const row = trendByDay.get(toDayKey(day));
        return row?.executions ?? 0;
      })(),
      computeMs: (() => {
        const day = new Date();
        day.setDate(day.getDate() - (6 - index));
        const row = trendByDay.get(toDayKey(day));
        return row?.compute_ms ?? 0;
      })(),
    }));

    const recent7 = sortedTrendRows.slice(-7);
    const previous7 = sortedTrendRows.slice(-14, -7);
    const recent7Total = recent7.reduce((sum, row) => sum + (row.executions ?? 0), 0);
    const previous7Total = previous7.reduce((sum, row) => sum + (row.executions ?? 0), 0);
    const usageGrowthPct = previous7Total > 0
      ? Math.round(((recent7Total - previous7Total) / previous7Total) * 100)
      : null;
    const isUsageIncreasing = usageGrowthPct !== null ? usageGrowthPct > 0 : recent7Total > 0;

    const range = usageData?.range
      ? {
          start: new Date(usageData.range.start),
          end: new Date(usageData.range.end),
        }
      : monthRange(billingPeriod);
    const monthDays = new Date(range.start.getFullYear(), range.start.getMonth() + 1, 0).getDate();
    const elapsedDays = billingPeriod === "mtd"
      ? Math.max(1, Math.ceil((range.end.getTime() - range.start.getTime()) / 86_400_000))
      : monthDays;

    return {
      total,
      failed,
      totalComputeMs,
      avgDurationMs,
      estimatedStorageBytes,
      topSources,
      trend,
      elapsedDays,
      monthDays,
      usageGrowthPct,
      isUsageIncreasing,
      projectedExecutions: billingPeriod === "mtd" ? Math.round((total / elapsedDays) * monthDays) : total,
      projectedComputeMs: billingPeriod === "mtd" ? Math.round((totalComputeMs / elapsedDays) * monthDays) : totalComputeMs,
      projectedStorageBytes: billingPeriod === "mtd" ? Math.round((estimatedStorageBytes / elapsedDays) * monthDays) : estimatedStorageBytes,
    };
  }, [billingPeriod, usageData]);

  const execPct = fmtPct(stats.total, limits.executions);
  const remainingExecutions = limits.executions > 0 ? Math.max(0, limits.executions - stats.total) : -1;
  const nextPlan = PRICING_TIERS.find((t) => {
    const l = LIMITS[t.id];
    return l.executions > limits.executions || l.executions === -1;
  });
  const planPrice = plan.price ?? 0;
  const overageExecs = Math.max(0, stats.total - (limits.executions > 0 ? limits.executions : Infinity));
  const overageCost = Math.ceil(overageExecs / 1_000_000) * OVERAGE.pricePerMillionExec;
  const estimatedCost = planPrice + overageCost;
  const projectedOverageExecs = Math.max(0, stats.projectedExecutions - (limits.executions > 0 ? limits.executions : Infinity));
  const projectedCost = planPrice + Math.ceil(projectedOverageExecs / 1_000_000) * OVERAGE.pricePerMillionExec;
  const isAtLimit = limits.executions > 0 && stats.total >= limits.executions;
  const isNearLimit = !isAtLimit && execPct >= 70;
  const predictedOverLimit = billingPeriod === "mtd" && limits.executions > 0 && stats.projectedExecutions > limits.executions;
  const daysUntilLimit = billingPeriod === "mtd" && limits.executions > 0 && stats.total > 0
    ? Math.max(0, Math.floor(remainingExecutions / Math.max(1, stats.total / stats.elapsedDays)))
    : null;
  const planTone = CURRENT_PLAN === "free"
    ? "text-neutral-400 bg-neutral-900 border-neutral-700"
    : CURRENT_PLAN === "builder"
      ? "text-blue-400 bg-blue-950/40 border-blue-800/40"
      : CURRENT_PLAN === "startup"
        ? "text-violet-400 bg-violet-950/40 border-violet-800/40"
        : "text-emerald-400 bg-emerald-950/40 border-emerald-800/40";
  const maxExecTrend = Math.max(1, ...stats.trend.map((point) => point.executions));
  const maxComputeTrend = Math.max(1, ...stats.trend.map((point) => point.computeMs));
  const primaryUsageSource = stats.topSources[0] ?? null;
  const usagePaceLabel = predictedOverLimit && daysUntilLimit !== null
    ? `At this pace, you will exceed your limit in ~${daysUntilLimit} day${daysUntilLimit === 1 ? "" : "s"}`
    : limits.executions > 0
      ? "At this pace, you will stay within your limit this month"
      : "At this pace, your plan has headroom for continued growth";
  const predictionTone = predictedOverLimit
    ? "text-amber-300 bg-amber-950/15 border-amber-800/40"
    : "text-emerald-300 bg-emerald-950/15 border-emerald-800/40";
  const includedLabel = CURRENT_PLAN === "free" ? "(Free)" : "(Included in plan)";
  const healthErrorRatePct = observabilityData ? Math.round(observabilityData.health.error_rate * 100) : null;
  const estimatedDebugHoursSaved = Math.max(1, Math.round(stats.failed * 0.25));
  const freeTierUrgencyLine = daysUntilLimit !== null
    ? daysUntilLimit <= 90
      ? `At this pace, you'll hit free tier limit in ~${daysUntilLimit} day${daysUntilLimit === 1 ? "" : "s"}`
      : "You're within free tier today, but production traffic typically grows 10-50x as usage scales"
    : null;

  if (loading) {
    return (
      <div className="space-y-4 animate-in fade-in duration-300 pb-16">
        <div className="h-24 bg-neutral-900/40 rounded-xl border border-neutral-800/30 animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-28 bg-neutral-900/40 rounded-xl border border-neutral-800/30 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-64 bg-neutral-900/40 rounded-xl border border-neutral-800/30 animate-pulse" />
          <div className="h-64 bg-neutral-900/40 rounded-xl border border-neutral-800/30 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-16">
      {fromReplay && (
        <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Replay completed</p>
          <p className="text-[11px] text-emerald-100 mt-1 font-mono">You just hit the value moment: failure replay with full context. This page shows when to unlock full replay for production debugging.</p>
        </div>
      )}

      <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 overflow-hidden">
        <div className="px-5 py-4 flex items-start justify-between gap-4 border-b border-neutral-800/40">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Usage & Billing</p>
            <h1 className="text-lg font-black text-white tracking-tight mt-1">Current bill</h1>
            <p className="text-[11px] text-neutral-600 font-mono mt-1">See what you are using, what it costs, and when you may need to upgrade.</p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-black/30 p-1 shrink-0">
            {[
              { id: "mtd", label: "MTD" },
              { id: "lastMonth", label: "Last month" },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setBillingPeriod(option.id as BillingPeriod)}
                className={`px-2.5 py-1 rounded-md text-[9px] font-black transition-colors ${billingPeriod === option.id ? "bg-neutral-800 text-white" : "text-neutral-600 hover:text-neutral-300"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-5 grid grid-cols-[1.2fr,0.8fr] gap-6 items-start">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded border ${planTone}`}>{plan.name} tier</span>
              <span className="text-[9px] text-neutral-600 font-mono">Next billing date: {nextBillingDate()}</span>
            </div>
            <p className="text-4xl font-black text-white tabular-nums leading-none">${estimatedCost.toFixed(2)}</p>
            <p className="text-[10px] text-neutral-500 font-mono mt-2">{billingPeriod === "mtd" ? "Month-to-date" : "Previous month"} bill estimate</p>
            <div className="mt-4 rounded-lg border border-neutral-800/50 bg-black/30 px-4 py-3">
              <div className="flex items-end justify-between gap-4 mb-2">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Usage vs limit</p>
                  {CURRENT_PLAN === "free" && limits.executions > 0 ? (
                    <>
                      <p className="text-sm font-black text-white mt-1">Free tier usage: {stats.total.toLocaleString()} / {limits.executions.toLocaleString()}</p>
                      <p className="text-[10px] text-neutral-500 font-mono mt-1">Remaining: {remainingExecutions.toLocaleString()} executions</p>
                      {stats.usageGrowthPct !== null && (
                        <p className={`text-[10px] font-mono mt-1 ${stats.isUsageIncreasing ? "text-amber-300/90" : "text-neutral-500"}`}>
                          Usage {stats.isUsageIncreasing ? "increasing" : "stable/decreasing"} week-over-week ({stats.usageGrowthPct > 0 ? "+" : ""}{stats.usageGrowthPct}%)
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm font-black text-white mt-1">
                      {limits.executions > 0 ? `${remainingExecutions.toLocaleString()} executions remaining this month` : "Unlimited executions on this plan"}
                    </p>
                  )}
                  <p className={`text-[10px] font-mono mt-1 ${predictedOverLimit ? "text-amber-400/90" : "text-emerald-400/90"}`}>
                    {usagePaceLabel}
                  </p>
                </div>
                <span className={`text-[10px] font-black ${execPct >= 90 ? "text-red-400" : execPct >= 70 ? "text-amber-400" : "text-emerald-400"}`}>{limits.executions > 0 ? `${execPct}% used` : "No cap"}</span>
              </div>
              {limits.executions > 0 && <UsageBar pct={execPct} />}
            </div>
            <p className="text-[9px] text-neutral-600 font-mono mt-3">
              {CURRENT_PLAN === "free"
                ? "No charges until you exceed free tier. No credit card required."
                : "No surprise billing. You always see usage before you pay."}
            </p>
          </div>

          <div className="rounded-lg border border-neutral-800/50 bg-black/30 px-4 py-4 space-y-2">
            <p className="text-[8px] font-black uppercase tracking-widest text-neutral-600">What you&apos;re paying for</p>
            <MetaRow label="Executions" value={`${stats.total.toLocaleString()} ${includedLabel}`} />
            <MetaRow label="Compute time" value={`${fmtMs(stats.totalComputeMs)} ${includedLabel}`} />
            <MetaRow label="Storage (est.)" value={`${fmtBytes(stats.estimatedStorageBytes)} ${includedLabel}`} />
            {primaryUsageSource && (
              <div className="pt-2 border-t border-neutral-800/40">
                <p className="text-[8px] font-black uppercase tracking-widest text-neutral-700 mb-1">Most usage comes from</p>
                <p className="text-[10px] font-mono text-neutral-300 truncate">{primaryUsageSource.name} <span className="text-neutral-600">→ {primaryUsageSource.pct}%</span></p>
              </div>
            )}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] font-black text-white">Total</span>
              <span className="text-[14px] font-black text-white tabular-nums">${estimatedCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {isAtLimit && (
        <div className="flex items-center gap-3 rounded-xl border border-red-800/60 bg-red-950/20 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-red-300">Execution limit reached</p>
            <p className="text-[10px] text-neutral-500 font-mono mt-0.5">New executions may be queued or delayed. Upgrade to remove the cap.</p>
          </div>
          {nextPlan && (
            <a href="/pricing" className="shrink-0 flex items-center gap-1.5 text-[9px] font-black text-white bg-red-600 hover:bg-red-500 rounded-lg px-3 py-1.5 transition-colors">
              Upgrade <ArrowRight className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
      {isNearLimit && !isAtLimit && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-800/50 bg-amber-950/15 px-4 py-3">
          <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-amber-300">You are approaching your monthly limit</p>
            <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{remainingExecutions.toLocaleString()} executions remain before your {plan.name} tier cap.</p>
          </div>
          {nextPlan && (
            <a href="/pricing" className="shrink-0 flex items-center gap-1.5 text-[9px] font-black text-amber-400 hover:text-amber-300 border border-amber-800/50 hover:border-amber-700 rounded-lg px-3 py-1.5 transition-colors">
              See plans <ArrowRight className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 px-4 py-4 space-y-3">
          <div className="flex items-center gap-1.5 text-neutral-500">
            <Zap className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase tracking-widest">Executions</span>
          </div>
          <div>
            <p className="text-2xl font-black tabular-nums text-white leading-none">{fmtNum(stats.total)}</p>
            <p className="text-[9px] text-neutral-600 font-mono mt-1">{limits.executions > 0 ? `${fmtNum(remainingExecutions)} remaining` : "unlimited"}</p>
          </div>
          {limits.executions > 0 && <UsageBar pct={execPct} />}
        </div>

        <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 px-4 py-4 space-y-3">
          <div className="flex items-center gap-1.5 text-neutral-500">
            <Clock className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase tracking-widest">Compute</span>
          </div>
          <div>
            <p className="text-2xl font-black tabular-nums text-white leading-none">{fmtMs(stats.totalComputeMs)}</p>
            <p className="text-[9px] text-neutral-600 font-mono mt-1">avg {fmtMs(stats.avgDurationMs)} / exec</p>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 px-4 py-4 space-y-3">
          <div className="flex items-center gap-1.5 text-neutral-500">
            <Database className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase tracking-widest">Storage</span>
          </div>
          <div>
            <p className="text-2xl font-black tabular-nums text-white leading-none">{fmtBytes(stats.estimatedStorageBytes)}</p>
            <p className="text-[9px] text-neutral-600 font-mono mt-1">estimated · {limits.retentionDays > 0 ? `${limits.retentionDays}-day retention` : "custom retention"}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 px-4 py-3 shadow-[0_0_24px_rgba(245,158,11,0.12)]">
        <p className="text-[9px] font-black uppercase tracking-widest text-amber-300">Value captured</p>
        <p className="text-base font-black text-white mt-1">
          {stats.failed.toLocaleString()} production failures captured
        </p>
        <p className="text-[11px] text-amber-100/90 font-mono mt-1">All replayable with full context -&gt; each one means faster root cause.</p>
        <p className="text-[10px] text-neutral-500 font-mono mt-1">Estimated impact: ~{estimatedDebugHoursSaved}h of debugging time saved.</p>
        <p className="text-[10px] text-emerald-300 font-mono mt-1">Replay any failure in seconds.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 px-4 py-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Without Flux</p>
          <p className="text-[10px] text-neutral-500 font-mono mt-1">Logs across services, missing input/output context, harder failure reproduction.</p>
        </div>
        <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/10 px-4 py-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-300">With Flux</p>
          <p className="text-[10px] text-emerald-200/90 font-mono mt-1">Full execution replay, exact failure point, faster root cause in production.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-neutral-800/40">
            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Cost Breakdown</span>
          </div>
          <div className="px-4 py-3">
            <div className="space-y-0 divide-y divide-neutral-800/30">
              <div className="flex justify-between items-center py-2">
                <span className="text-[10px] font-mono text-neutral-500">Base plan ({plan.name})</span>
                <span className="text-[10px] font-black text-neutral-300 tabular-nums">{plan.price === 0 ? "$0.00" : `$${(plan.price ?? 0).toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[10px] font-mono text-neutral-500">Executions</span>
                <span className="text-[10px] font-black text-neutral-300 tabular-nums">
                  {CURRENT_PLAN === "free" ? `$${(OVERAGE.pricePerMillionExec / 10).toFixed(2)} / 100K over` : "$0.00"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[10px] font-mono text-neutral-500">Compute time</span>
                <span className="text-[10px] font-black text-neutral-300 tabular-nums">{CURRENT_PLAN === "free" ? "usage-based" : "$0.00"}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[10px] font-mono text-neutral-500">Storage retained</span>
                <span className="text-[10px] font-black text-neutral-300 tabular-nums">{CURRENT_PLAN === "free" ? "~$0.05 / GB·mo" : "$0.00"}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[10px] font-mono text-neutral-500">Overage</span>
                <span className={`text-[10px] font-black tabular-nums ${overageCost > 0 ? "text-amber-400" : "text-neutral-600"}`}>{overageCost > 0 ? `$${overageCost.toFixed(2)}` : "—"}</span>
              </div>
              <div className="flex justify-between items-center pt-3">
                <span className="text-[10px] font-black text-white">Total</span>
                <span className="text-base font-black text-white tabular-nums">${estimatedCost.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-neutral-800/40">
            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Prediction</span>
          </div>
          <div className="px-4 py-3 space-y-2">
            <p className="text-sm font-black text-white">At current usage</p>
            <p className="text-[10px] text-neutral-400 font-mono">→ You will use ~{fmtNum(stats.projectedExecutions)} executions this month</p>
            <div className={`rounded-lg border px-3 py-2 mt-2 ${predictionTone}`}>
              <p className="text-[10px] font-black">{predictedOverLimit ? `You may exceed your ${plan.name} tier` : `You are within your ${plan.name} tier`}</p>
            </div>
            {CURRENT_PLAN === "free" && billingPeriod === "mtd" && daysUntilLimit !== null && (
              <>
                <p className="text-[10px] text-neutral-300 font-mono">→ {freeTierUrgencyLine}</p>
                <p className="text-[10px] text-amber-300 font-mono">→ Upgrade before interruptions to keep debugging flow uninterrupted</p>
              </>
            )}
            {observabilityData && (
              <p className="text-[10px] text-neutral-400 font-mono">
                → Health ({observabilityData.health.severity}): {observabilityData.health.message}
              </p>
            )}
            <p className="text-[10px] text-neutral-400 font-mono">→ Estimated cost: ${projectedCost.toFixed(2)}</p>
            <p className="text-[10px] text-neutral-400 font-mono">→ Estimated storage: {fmtBytes(stats.projectedStorageBytes)}</p>
            <p className="text-[10px] text-neutral-400 font-mono">→ Estimated compute: {fmtMs(stats.projectedComputeMs)}</p>
            {predictedOverLimit && daysUntilLimit !== null && (
              <div className="mt-3 rounded-lg border border-amber-800/40 bg-amber-950/15 px-3 py-2">
                <p className="text-[10px] font-black text-amber-300">You may exceed your {plan.name} tier soon</p>
                <p className="text-[9px] text-neutral-500 font-mono mt-1">At the current pace, you may hit the limit in ~{daysUntilLimit} day{daysUntilLimit === 1 ? "" : "s"}.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-neutral-800/40">
            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Usage Trend</span>
          </div>
          <div className="px-4 py-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[8px] font-black uppercase tracking-widest text-neutral-700">Executions / day</span>
                <span className="text-[8px] text-neutral-600 font-mono">last 7 days</span>
              </div>
              <div className="flex items-center gap-4 mb-3 text-[9px] font-mono text-neutral-500">
                <span>Today: {stats.trend[6]?.executions ?? 0} executions</span>
                <span>Yesterday: {stats.trend[5]?.executions ?? 0}</span>
              </div>
              <div className="grid grid-cols-7 gap-2 items-end h-28">
                {stats.trend.map((point) => (
                  <div key={`exec-${point.label}`} className="flex flex-col items-center gap-1 h-full justify-end">
                    <div className="w-full rounded-md bg-neutral-900/60 border border-neutral-800/40 overflow-hidden flex items-end h-full">
                      <div className="w-full bg-blue-500/60" style={{ height: `${(point.executions / maxExecTrend) * 100}%` }} />
                    </div>
                    <span className="text-[8px] text-neutral-700 font-mono">{point.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[8px] font-black uppercase tracking-widest text-neutral-700">Compute / day</span>
                <span className="text-[8px] text-neutral-600 font-mono">runtime trend</span>
              </div>
              <div className="flex items-center gap-4 mb-3 text-[9px] font-mono text-neutral-500">
                <span>Today: {fmtMs(stats.trend[6]?.computeMs ?? 0)}</span>
                <span>Yesterday: {fmtMs(stats.trend[5]?.computeMs ?? 0)}</span>
              </div>
              <div className="grid grid-cols-7 gap-2 items-end h-24">
                {stats.trend.map((point) => (
                  <div key={`compute-${point.label}`} className="flex flex-col items-center gap-1 h-full justify-end">
                    <div className="w-full rounded-md bg-neutral-900/60 border border-neutral-800/40 overflow-hidden flex items-end h-full">
                      <div className="w-full bg-emerald-500/60" style={{ height: `${(point.computeMs / maxComputeTrend) * 100}%` }} />
                    </div>
                    <span className="text-[8px] text-neutral-700 font-mono">{point.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-neutral-800/40">
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Top Usage Sources</span>
            </div>
            {stats.topSources.length === 0 ? (
              <p className="px-4 py-4 text-[10px] text-neutral-600 font-mono">No executions recorded yet.</p>
            ) : (
              <div className="px-4 py-3 space-y-2.5">
                {stats.topSources.map((source) => (
                  <div key={source.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-mono text-neutral-400 truncate max-w-[65%]">{source.name}</span>
                      <span className="text-[9px] font-black text-neutral-400 shrink-0">{fmtNum(source.count)} — {source.pct}%</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-neutral-800/70 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500/60" style={{ width: `${source.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-neutral-800/40 flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Plan Details</span>
              <a href="/pricing" className="flex items-center gap-1 text-[8px] font-black text-neutral-600 hover:text-blue-400 transition-colors">
                Compare plans <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <div className="px-4 py-3 space-y-0">
              <MetaRow label="Plan" value={plan.name} />
              <MetaRow label="Executions / month" value={limits.executions === -1 ? "Unlimited" : fmtNum(limits.executions)} />
              <MetaRow label="Retention" value={limits.retentionDays === -1 ? "Custom" : `${limits.retentionDays} days`} />
              <MetaRow label="Environments" value={limits.environments === -1 ? "Unlimited" : String(limits.environments)} />
              <MetaRow label="Team members" value={limits.members === -1 ? "Unlimited" : String(limits.members)} />
              <MetaRow label="API keys" value={limits.apiKeys === -1 ? "Unlimited" : String(limits.apiKeys)} />
            </div>
          </div>
        </div>
      </div>

      {nextPlan && (
        <div className="rounded-xl border border-blue-900/40 bg-blue-950/10 overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black text-white">Upgrade to {nextPlan.name}{nextPlan.price !== null && nextPlan.price > 0 && <span className="text-neutral-500 font-bold text-[11px] ml-1.5">${nextPlan.price}/mo</span>}</p>
              <p className="text-[10px] text-neutral-500 font-mono mt-0.5 max-w-sm">Why upgrade now? Unlock full debugging context for production issues.</p>
              {observabilityData && (observabilityData.health.severity === "critical" || observabilityData.health.severity === "warning") && healthErrorRatePct !== null && (
                <div className="mt-2 rounded-lg border border-amber-800/40 bg-amber-950/20 px-3 py-2">
                  <p className="text-[10px] font-black text-amber-300">{healthErrorRatePct}% of your executions are failing</p>
                  <p className="text-[9px] text-neutral-500 font-mono mt-1">Without full replay, failures take longer to diagnose and issues may repeat in production.</p>
                  <p className="text-[9px] text-amber-200 font-mono mt-1">Upgrade to see full execution context instantly.</p>
                </div>
              )}
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                <span className="flex items-center gap-1 text-[9px] text-neutral-400 font-mono"><CheckCircle2 className="w-2.5 h-2.5 text-emerald-500/60" />Full execution replay for failed requests</span>
                <span className="flex items-center gap-1 text-[9px] text-neutral-400 font-mono"><CheckCircle2 className="w-2.5 h-2.5 text-emerald-500/60" />{LIMITS[nextPlan.id].retentionDays === -1 ? "Custom" : `${LIMITS[nextPlan.id].retentionDays}-day`} retention for production history</span>
                <span className="flex items-center gap-1 text-[9px] text-neutral-400 font-mono"><CheckCircle2 className="w-2.5 h-2.5 text-emerald-500/60" />{LIMITS[nextPlan.id].executions === -1 ? "Unlimited" : fmtNum(LIMITS[nextPlan.id].executions)} executions for production workloads</span>
              </div>
              <p className="text-[9px] text-neutral-500 font-mono mt-2">Without upgrade: limited replay data, short retention (14 days), slower diagnosis, and repeat production issues.</p>
              <p className="text-[9px] text-emerald-300/90 font-mono mt-1">Replay any failure in seconds with full context.</p>
              {billingPeriod === "mtd" && daysUntilLimit !== null && execPct >= 20 && (
                <p className="text-[9px] text-blue-300/80 font-mono mt-2">You may need this in ~{daysUntilLimit} day{daysUntilLimit === 1 ? "" : "s"} at the current pace.</p>
              )}
            </div>
            <a href="/pricing" className="shrink-0 flex items-center gap-1.5 text-[10px] font-black text-white bg-blue-600 hover:bg-blue-500 rounded-lg px-4 py-2 transition-colors">
              Unlock full replay <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

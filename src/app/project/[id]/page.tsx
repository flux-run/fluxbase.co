"use client";
import { useState, use, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  RefreshCw,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  Zap,
  Activity,
} from "lucide-react";
import { useFluxApi } from "@/lib/api";
import { ProjectOverviewResult } from "@/types/api";

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ErrorClassBadge({ cls }: { cls: string }) {
  const map: Record<string, { color: string; label: string }> = {
    infra:    { color: "text-violet-400 bg-violet-950/50 border-violet-800/50", label: "Infra" },
    external: { color: "text-blue-400 bg-blue-950/50 border-blue-800/50",      label: "External" },
    runtime:  { color: "text-amber-400 bg-amber-950/50 border-amber-800/50",   label: "Runtime" },
    user:     { color: "text-orange-400 bg-orange-950/50 border-orange-800/50", label: "User" },
  };
  const m = map[cls] ?? { color: "text-neutral-400 bg-neutral-900 border-neutral-800", label: cls };
  return (
    <span className={`shrink-0 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${m.color}`}>
      {m.label}
    </span>
  );
}

function SectionLabel({
  icon: Icon,
  label,
  count,
  color,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{label}</span>
      {count > 0 && (
        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border border-current/20 ${color}`}>
          {count}
        </span>
      )}
    </div>
  );
}

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { session } = useAuth();
  const router = useRouter();

  const [overview, setOverview] = useState<ProjectOverviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const api = useFluxApi(id);

  const load = useCallback(
    async (silent = false) => {
      if (!api.ready) return;
      if (!silent) setLoading(true);
      try {
        const data = await api.getProjectOverview(id);
        if (data) setOverview(data);
        setLastRefreshed(new Date());
      } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e));
        if (err.message.includes("Unauthorized") || err.message.includes("401")) {
          localStorage.removeItem("flux_token");
          router.push("/signup");
        }
      } finally {
        setLoading(false);
      }
    },
    [id, session, api]
  );

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 10_000);
    return () => clearInterval(interval);
  }, [load]);

  const health = overview?.health;

  if (loading) {
    return (
      <div className="py-6 space-y-8 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div className="w-40 h-5 bg-neutral-800 rounded animate-pulse" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-20 h-7 bg-neutral-900 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="w-28 h-3 bg-neutral-800 rounded animate-pulse" />
            <div className="border border-neutral-900 rounded-xl p-4 animate-pulse space-y-2.5">
              <div className="w-3/4 h-3 bg-neutral-800/60 rounded" />
              <div className="w-1/2 h-2 bg-neutral-800/40 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const isHealthy =
    !health || (health.activeIncidents === 0 && health.functionsFailing === 0);

  return (
    <div className="py-6 space-y-8 animate-in fade-in duration-300 pb-20">
      {/* ── HEALTH HEADER ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-base font-black text-white tracking-tight">Production Overview</h1>
          <p className="text-[10px] text-neutral-600 font-mono mt-0.5">
            {lastRefreshed ? `refreshed ${timeAgo(lastRefreshed.toISOString())}` : "loading..."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {health && (
            <>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold ${
                  health.activeIncidents > 0
                    ? "border-red-900/50 bg-red-950/40 text-red-400"
                    : "border-neutral-800/50 bg-neutral-900/30 text-neutral-500"
                }`}
              >
                <AlertCircle className="w-3 h-3" />
                {health.activeIncidents} incident{health.activeIncidents !== 1 ? "s" : ""}
              </div>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold ${
                  health.functionsFailing > 0
                    ? "border-orange-900/50 bg-orange-950/40 text-orange-400"
                    : "border-neutral-800/50 bg-neutral-900/30 text-neutral-500"
                }`}
              >
                <Zap className="w-3 h-3" />
                {health.functionsFailing} fn failing
              </div>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold ${
                  health.trafficImpactPct > 5
                    ? "border-red-900/50 bg-red-950/40 text-red-400"
                    : health.trafficImpactPct > 0
                    ? "border-amber-900/50 bg-amber-950/40 text-amber-400"
                    : "border-neutral-800/50 bg-neutral-900/30 text-neutral-500"
                }`}
              >
                <TrendingUp className="w-3 h-3" />
                {health.trafficImpactPct}% traffic
              </div>
            </>
          )}
          <button
            onClick={() => load(true)}
            className="p-1.5 text-neutral-700 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* all-clear banner */}
      {!loading && isHealthy && overview && (
        <div className="border border-emerald-900/30 bg-emerald-950/15 rounded-xl px-4 py-4 flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <div>
            <p className="text-xs font-bold text-emerald-300">All clear</p>
            <p className="text-[10px] text-neutral-600 mt-0.5">No active incidents, regressions, or pending verifications</p>
          </div>
        </div>
      )}

      {/* ── ACTIVE INCIDENTS ───────────────────────────────────────── */}
      <div>
        <SectionLabel
          icon={AlertCircle}
          label="Active Incidents"
          count={overview?.incidents.length ?? 0}
          color="text-red-400"
        />
        {!overview?.incidents.length ? (
          <div className="border border-neutral-900/40 rounded-xl px-4 py-5 flex items-center gap-3">
            <Activity className="w-4 h-4 text-neutral-800 shrink-0" />
            <p className="text-[11px] text-neutral-700">No active incidents</p>
          </div>
        ) : (
          <div className="space-y-2">
            {overview.incidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => router.push(`/project/${id}/functions/${inc.functionId}`)}
                className="group border border-red-900/40 bg-red-950/20 rounded-xl px-4 py-3 cursor-pointer hover:border-red-800/60 hover:bg-red-950/30 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <ErrorClassBadge cls={inc.errorClass} />
                      <span className="text-[9px] font-bold text-neutral-500 font-mono truncate">
                        {inc.functionName}
                      </span>
                      {inc.deployId && (
                        <span className="text-[9px] text-neutral-700 font-mono ml-auto shrink-0">
                          deploy {inc.deployId}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] font-bold text-red-200/90 leading-tight truncate">
                      {inc.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[9px] text-neutral-600 font-mono">
                        {inc.totalErrors.toLocaleString()} errors /{" "}
                        {inc.totalExecs.toLocaleString()} execs
                      </span>
                      <span className="text-[9px] text-neutral-700 font-mono">
                        last {timeAgo(inc.lastSeen)}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div
                      className={`text-xl font-black tabular-nums leading-none ${
                        inc.failureRatePct >= 50
                          ? "text-red-400"
                          : inc.failureRatePct >= 20
                          ? "text-red-500/70"
                          : "text-orange-400/70"
                      }`}
                    >
                      {inc.failureRatePct}%
                    </div>
                    <div className="text-[8px] text-neutral-700 mt-0.5">failure rate</div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-800 shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── BROKE AFTER DEPLOY ─────────────────────────────────────── */}
      <div>
        <SectionLabel
          icon={TrendingUp}
          label="Broke After Deploy"
          count={overview?.brokenAfterDeploy.length ?? 0}
          color="text-orange-400"
        />
        {!overview?.brokenAfterDeploy.length ? (
          <div className="border border-neutral-900/40 rounded-xl px-4 py-5">
            <p className="text-[11px] text-neutral-700">No regressions detected</p>
          </div>
        ) : (
          <div className="space-y-2">
            {overview.brokenAfterDeploy.map((item) => (
              <div
                key={item.functionId}
                onClick={() => router.push(`/project/${id}/functions/${item.functionId}`)}
                className="group border border-orange-900/40 bg-orange-950/20 rounded-xl px-4 py-3 cursor-pointer hover:border-orange-800/60 hover:bg-orange-950/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-black text-orange-300">{item.functionName}</span>
                      {item.deployId && (
                        <span className="text-[9px] text-neutral-600 font-mono">
                          deploy {item.deployId}
                        </span>
                      )}
                      <span className="text-[9px] text-neutral-700 font-mono ml-auto">
                        {timeAgo(item.deployedAt)}
                      </span>
                    </div>
                    {item.topIssue && (
                      <p className="text-[11px] text-neutral-400 leading-tight truncate">
                        {item.topIssue}
                      </p>
                    )}
                    <div className="text-[9px] text-neutral-700 mt-1 font-mono">
                      prev {item.prevExecs} exec{item.prevExecs !== 1 ? "s" : ""} · now {item.currentExecs} exec{item.currentExecs !== 1 ? "s" : ""}
                    </div>
                  </div>
                  {/* Before → After */}
                  <div className="shrink-0 flex items-center gap-2">
                    <div className="text-center">
                      <div className="text-sm font-black text-neutral-500 tabular-nums">
                        {item.prevFailurePct}%
                      </div>
                      <div className="text-[7px] text-neutral-700 uppercase">before</div>
                    </div>
                    <div className="text-neutral-700 text-xs">→</div>
                    <div className="text-center">
                      <div className="text-sm font-black text-orange-400 tabular-nums">
                        {item.currentFailurePct}%
                      </div>
                      <div className="text-[7px] text-neutral-700 uppercase">after</div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-800 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── VERIFICATION QUEUE ─────────────────────────────────────── */}
      <div>
        <SectionLabel
          icon={ShieldCheck}
          label="Verification Queue"
          count={overview?.verificationQueue.length ?? 0}
          color="text-amber-400"
        />
        {!overview?.verificationQueue.length ? (
          <div className="border border-neutral-900/40 rounded-xl px-4 py-5">
            <p className="text-[11px] text-neutral-700">Nothing pending verification</p>
          </div>
        ) : (
          <div className="space-y-2">
            {overview.verificationQueue.map((item, i) => (
              <div
                key={`${item.functionId}-${i}`}
                onClick={() => router.push(`/project/${id}/functions/${item.functionId}`)}
                className="group border border-amber-900/30 bg-amber-950/15 rounded-xl px-4 py-3 cursor-pointer hover:border-amber-800/50 hover:bg-amber-950/25 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <ErrorClassBadge cls={item.errorClass} />
                      <span className="text-[9px] font-bold text-neutral-500">{item.functionName}</span>
                      <span
                        className={`shrink-0 text-[8px] font-black uppercase px-1.5 py-0.5 rounded ml-auto border ${
                          item.verifyStatus === "waiting"
                            ? "text-neutral-500 bg-neutral-900 border-neutral-800"
                            : "text-amber-400 bg-amber-950/50 border-amber-800/40"
                        }`}
                      >
                        {item.verifyStatus}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-tight truncate mb-2">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-neutral-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500/60 rounded-full transition-all duration-500"
                          style={{ width: `${item.progressPct}%` }}
                        />
                      </div>
                      <span className="text-[8px] font-bold text-neutral-600 tabular-nums shrink-0">
                        {item.progress}/{item.required}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-800 shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── RECENTLY FIXED ─────────────────────────────────────────── */}
      <div>
        <SectionLabel
          icon={CheckCircle2}
          label="Recently Fixed"
          count={overview?.recentFixes.length ?? 0}
          color="text-emerald-400"
        />
        {!overview?.recentFixes.length ? (
          <div className="border border-neutral-900/40 rounded-xl px-4 py-5">
            <p className="text-[11px] text-neutral-700">No recent fixes to show</p>
          </div>
        ) : (
          <div className="space-y-2">
            {overview.recentFixes.map((item, i) => (
              <div
                key={`${item.functionId}-${i}`}
                onClick={() => router.push(`/project/${id}/functions/${item.functionId}`)}
                className="group border border-emerald-900/30 bg-emerald-950/15 rounded-xl px-4 py-3 cursor-pointer hover:border-emerald-800/50 hover:bg-emerald-950/25 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <ErrorClassBadge cls={item.errorClass} />
                      <span className="text-[9px] font-bold text-neutral-500">{item.functionName}</span>
                      <span
                        className={`shrink-0 text-[8px] font-black uppercase px-1.5 py-0.5 rounded ml-auto border ${
                          item.confidence === "high"
                            ? "text-emerald-400 bg-emerald-950/50 border-emerald-800/40"
                            : item.confidence === "medium"
                            ? "text-teal-400 bg-teal-950/50 border-teal-800/40"
                            : "text-neutral-500 bg-neutral-900 border-neutral-800"
                        }`}
                      >
                        {item.confidence} confidence
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-tight truncate">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[9px] text-neutral-700 font-mono">
                        last failed {timeAgo(item.lastFailedAt)}
                      </span>
                      <span className="text-[9px] text-emerald-700 font-mono">
                        {item.execsSinceFix} clean exec{item.execsSinceFix !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-800 shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
"use client";
import { useState, use, useEffect, useCallback, useMemo } from "react";
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
  ArrowRight,
  Flame,
  Target,
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

function VerifyStatusBadge({ item }: { item: { progress: number; required: number; verifyStatus: string } }) {
  const status = item.progress >= item.required ? "verified" : item.verifyStatus === "waiting" ? "pending" : "partial";
  const style =
    status === "verified"
      ? "text-emerald-400 bg-emerald-950/50 border-emerald-800/40"
      : status === "pending"
      ? "text-neutral-500 bg-neutral-900 border-neutral-800"
      : "text-amber-400 bg-amber-950/50 border-amber-800/40";
  return (
    <span className={`shrink-0 text-[7px] font-black uppercase px-1 py-0.5 rounded ml-auto border ${style}`}>
      {status}
    </span>
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
  const isBroken = !!health && (health.activeIncidents > 0 || health.functionsFailing > 0);

  // Group incidents by errorClass for cross-function display
  type IncidentGroup = {
    cls: string;
    incidents: ProjectOverviewResult["incidents"];
    combinedImpact: number; // failureRate × execs × recencyWeight
    maxTrafficPct: number;
    affectedFns: string[];
    trafficContributionPct: number; // this group's share of all impacted traffic
  };

  const incidentGroups = useMemo((): IncidentGroup[] => {
    if (!overview?.incidents.length) return [];
    const map = new Map<string, ProjectOverviewResult["incidents"]>();
    for (const inc of overview.incidents) {
      const key = inc.errorClass;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(inc);
    }
    const totalErrors = overview.incidents.reduce((s, i) => s + i.totalErrors, 0) || 1;
    const overallTrafficImpactPct = overview.health?.trafficImpactPct ?? 0;
    const recencyWeight = (lastSeen: string) => {
      const hoursAgo = (Date.now() - new Date(lastSeen).getTime()) / 3_600_000;
      return hoursAgo < 1 ? 1.5 : hoursAgo < 6 ? 1.2 : hoursAgo < 24 ? 1.0 : 0.7;
    };
    return [...map.entries()]
      .map(([cls, incs]) => {
        const groupErrors = incs.reduce((s, i) => s + i.totalErrors, 0);
        const topLastSeen = incs.reduce((t, i) => i.lastSeen > t ? i.lastSeen : t, incs[0].lastSeen);
        return {
          cls,
          incidents: incs,
          combinedImpact: incs.reduce((s, i) => s + i.failureRatePct * i.totalExecs, 0) * recencyWeight(topLastSeen),
          maxTrafficPct: Math.max(...incs.map((i) => i.trafficImpactPct)),
          affectedFns: [...new Set(incs.map((i) => i.functionName))],
          trafficContributionPct: Math.round((groupErrors / totalErrors) * overallTrafficImpactPct),
        };
      })
      .sort((a, b) => b.combinedImpact - a.combinedImpact);
  }, [overview?.incidents, overview?.health]);

  // Suggested focus: the group with highest combined impact, cross-referenced with regressions
  const suggestedFocus = useMemo(() => {
    if (!isBroken || incidentGroups.length === 0) return null;
    const top = incidentGroups[0];
    const second = incidentGroups[1] ?? null;
    const topInc = top.incidents[0];
    const isRegression = overview!.brokenAfterDeploy.some((b) =>
      top.incidents.some((i) => i.functionId === b.functionId)
    );
    // How many times more impactful than the next group?
    const impactMultiple = second && second.combinedImpact > 0
      ? Math.round((top.combinedImpact / second.combinedImpact) * 10) / 10
      : null;
    const secondTrafficPct = second?.trafficContributionPct ?? null;
    // Total errors across all incidents for this group (for "33/33 execs" wording)
    const totalErrors = top.incidents.reduce((s, i) => s + i.totalErrors, 0);
    const totalExecs = top.incidents.reduce((s, i) => s + i.totalExecs, 0);
    // First seen = earliest firstSeen across incidents in the group
    const firstSeen = top.incidents.reduce((t, i) => i.firstSeen < t ? i.firstSeen : t, top.incidents[0].firstSeen);
    const trafficPct = top.trafficContributionPct > 0 ? top.trafficContributionPct : top.maxTrafficPct;
    const usersPer10 = Math.round(trafficPct / 10);
    const deployDeltaMin =
      topInc.deployedAt && firstSeen
        ? Math.round((new Date(firstSeen).getTime() - new Date(topInc.deployedAt).getTime()) / 60000)
        : null;
    // Compute failure rate from actual aggregated counts — prevents 100% rate with 29/42 counts mismatch
    const computedFailureRatePct = totalExecs > 0 ? Math.round((totalErrors / totalExecs) * 100) : topInc.failureRatePct;
    const confidenceLabel = totalExecs >= 20 ? "High" : totalExecs >= 5 ? "Medium" : "Low";
    return {
      title: topInc.title,
      cls: top.cls,
      affectedFns: top.affectedFns,
      trafficImpactPct: top.maxTrafficPct,
      trafficContributionPct: top.trafficContributionPct,
      failureRatePct: computedFailureRatePct,
      isRegression,
      topFunctionId: topInc.functionId,
      topFunctionName: topInc.functionName,
      deployId: topInc.deployId,
      deployedAt: topInc.deployedAt,
      deployDeltaMin,
      impactMultiple,
      secondTrafficPct,
      totalErrors,
      totalExecs,
      firstSeen,
      trafficPct,
      usersPer10,
      confidenceLabel,
    };
  }, [incidentGroups, isBroken, overview]);

  if (loading) {
    return (
      <div className="py-6 space-y-6 animate-in fade-in duration-300">
        <div className="h-16 bg-neutral-900/60 rounded-xl border border-neutral-800/50 animate-pulse" />
        <div className="h-28 bg-neutral-900/40 rounded-xl border border-neutral-800/30 animate-pulse" />
        <div className="space-y-2">
          <div className="w-32 h-3 bg-neutral-800 rounded animate-pulse" />
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-neutral-900/40 rounded-xl border border-neutral-800/30 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-3 animate-in fade-in duration-300 pb-16">

      {/* ── STATUS HEADER ──────────────────────────────────────────── */}
      <div
        className={`rounded-lg border px-3.5 py-2.5 flex items-center justify-between gap-4 flex-wrap transition-colors ${
          isBroken
            ? "border-red-900/50 bg-red-950/25"
            : "border-neutral-800/50 bg-neutral-900/20"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {isBroken ? (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          )}
          <div className="min-w-0">
            <p className={`text-sm font-black leading-none ${isBroken ? "text-red-300" : "text-emerald-300"}`}>
              {isBroken
                ? `${health!.activeIncidents} incident${health!.activeIncidents !== 1 ? "s" : ""} affecting ${health!.trafficImpactPct}% of traffic`
                : "System healthy"}
            </p>
            <p className="text-[9px] text-neutral-600 font-mono mt-0.5">
              {isBroken
                ? `${health!.functionsFailing} function${health!.functionsFailing !== 1 ? "s" : ""} failing`
                : `0 incidents · 0 failing · 0% traffic impacted`}
            </p>
            {isBroken && incidentGroups.length > 0 && (
              <p className="text-[9px] text-neutral-700 font-mono mt-0.5">
                {incidentGroups.slice(0, 3).map((g, i) => `${i > 0 ? " · " : ""}${g.cls}: ${g.trafficContributionPct}%`).join("")}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isBroken && (
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-black px-2 py-1 rounded border ${
                health!.trafficImpactPct >= 20
                  ? "text-red-400 border-red-900/60 bg-red-950/40"
                  : "text-amber-400 border-amber-900/60 bg-amber-950/40"
              }`}>
                <TrendingUp className="w-2.5 h-2.5 inline mr-1" />
                {health!.trafficImpactPct}% traffic
              </span>
              <span className="text-[9px] font-black px-2 py-1 rounded border text-orange-400 border-orange-900/60 bg-orange-950/40">
                <Zap className="w-2.5 h-2.5 inline mr-1" />
                {health!.functionsFailing} fn
              </span>
            </div>
          )}
          <p className="text-[9px] text-neutral-700 font-mono">
            {lastRefreshed ? timeAgo(lastRefreshed.toISOString()) : "—"}
          </p>
          <button
            onClick={() => load(true)}
            className="p-1 text-neutral-700 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* all-clear state */}
      {!isBroken && overview && overview.incidents.length === 0 && overview.brokenAfterDeploy.length === 0 && (
        <div className="border border-neutral-900/40 rounded-xl px-4 py-8 flex flex-col items-center gap-2 text-center">
          <Activity className="w-5 h-5 text-neutral-800" />
          <p className="text-xs font-bold text-neutral-500">Nothing to act on</p>
          <p className="text-[10px] text-neutral-700">
            No incidents or regressions · {overview?.verificationQueue.length > 0 ? `${overview.verificationQueue.length} pending verification` : "all functions verified"}
          </p>
        </div>
      )}

      {/* ── MAIN GRID: left = action items, right = list panels ─────── */}
      {isBroken && (
        <div className="grid grid-cols-5 gap-3 items-start">

          {/* ── LEFT COLUMN (col-span-3) ─────────────────────────────── */}
          <div className="col-span-3 space-y-3">

            {/* FIX THIS FIRST */}
            {suggestedFocus && (
              <div
                onClick={() => router.push(`/project/${id}/functions/${suggestedFocus.topFunctionId}`)}
                className="relative cursor-pointer rounded-lg border border-red-800/50 bg-gradient-to-b from-red-950/40 to-red-950/20 overflow-hidden group hover:border-red-700/70 transition-all"
              >
                <div className="h-[3px] bg-gradient-to-r from-red-500 via-orange-500/70 to-transparent" />
                <div className="px-3.5 py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Flame className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-red-400">Fix This First</span>
                    {suggestedFocus.deployId && (
                      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded border text-orange-300 border-orange-800/50 bg-orange-950/50">
                        ↑ after deploy {suggestedFocus.deployId}
                      </span>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-black text-white leading-tight truncate">
                        {suggestedFocus.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <ErrorClassBadge cls={suggestedFocus.cls} />
                        {suggestedFocus.affectedFns.length > 1 ? (
                          <span className="text-[9px] text-neutral-500 font-mono">{suggestedFocus.affectedFns.length} functions affected</span>
                        ) : (
                          <span className="text-[9px] text-neutral-500 font-mono">{suggestedFocus.affectedFns[0]}</span>
                        )}
                        {suggestedFocus.deployId && (
                          <span className="text-[9px] text-neutral-700 font-mono">· deploy {suggestedFocus.deployId}</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-3xl font-black tabular-nums text-red-400 leading-none">
                        {suggestedFocus.failureRatePct}%
                      </div>
                      <div className="text-[8px] text-neutral-600 mt-0.5">failure rate</div>
                    </div>
                  </div>

                  {suggestedFocus.affectedFns.length > 1 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[8px] text-neutral-700 uppercase font-black tracking-widest">Affected:</span>
                      {suggestedFocus.affectedFns.map((fn) => (
                        <span key={fn} className="text-[9px] font-bold text-neutral-400 bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded font-mono">{fn}</span>
                      ))}
                    </div>
                  )}

                  <div className="space-y-0.5 border-t border-red-900/30 pt-2">
                    <p className="text-[8px] font-black uppercase tracking-widest text-neutral-700 mb-1">Why this first</p>
                    {/* 1. failure rate — always consistent: actual rate + actual counts */}
                    <p className="text-[9px] text-neutral-500 font-mono">
                      <span className="text-red-500/50 mr-1.5 select-none">·</span>
                      {suggestedFocus.failureRatePct}% failure rate — {suggestedFocus.totalErrors.toLocaleString()}/{suggestedFocus.totalExecs.toLocaleString()} executions failing
                    </p>
                    {/* 2. traffic + visceral user-impact language */}
                    <p className="text-[9px] text-neutral-500 font-mono">
                      <span className="text-red-500/50 mr-1.5 select-none">·</span>
                      {suggestedFocus.trafficPct}% of impacted traffic
                      {suggestedFocus.usersPer10 > 0 && (
                        <span className="text-neutral-600"> — ~{suggestedFocus.usersPer10} in 10 users affected</span>
                      )}
                    </p>
                    {/* 3. relative comparison — always show, wording is precise about groups vs raw counts */}
                    <p className="text-[9px] text-neutral-500 font-mono">
                      <span className="text-red-500/50 mr-1.5 select-none">·</span>
                      {incidentGroups.length === 1
                        ? overview!.incidents.length > 1
                          ? `only incident type — all ${overview!.incidents.length} events are the same issue`
                          : "only active incident"
                        : suggestedFocus.impactMultiple !== null && suggestedFocus.impactMultiple > 1.2
                        ? `${suggestedFocus.impactMultiple}× larger than next issue`
                        : `highest-impact of ${incidentGroups.length} active incidents`}
                      {incidentGroups.length > 1 && suggestedFocus.secondTrafficPct !== null && (
                        <span className="text-neutral-600"> — next: {suggestedFocus.secondTrafficPct}% traffic</span>
                      )}
                    </p>
                    {/* 4. timing + deploy causality — show whenever deployId exists, not gated by isRegression */}
                    <p className="text-[9px] text-neutral-500 font-mono">
                      <span className="text-red-500/50 mr-1.5 select-none">·</span>
                      {suggestedFocus.deployId
                        ? (
                          <>
                            started {timeAgo(suggestedFocus.firstSeen)} · after deploy {suggestedFocus.deployId}
                            {suggestedFocus.deployDeltaMin !== null && suggestedFocus.deployDeltaMin > 0 && (
                              <span> (+{suggestedFocus.deployDeltaMin}m)</span>
                            )}
                            <span className="text-neutral-700"> — likely caused by deployment</span>
                          </>
                        )
                        : `first seen ${timeAgo(suggestedFocus.firstSeen)}`}
                    </p>
                    {suggestedFocus.affectedFns.length > 1 && (
                      <p className="text-[9px] text-neutral-500 font-mono">
                        <span className="text-red-500/50 mr-1.5 select-none">·</span>
                        cross-function — {suggestedFocus.affectedFns.length} services affected
                      </p>
                    )}
                    {/* confidence footer */}
                    <div className="flex items-center gap-1.5 pt-1.5 mt-0.5 border-t border-red-900/20">
                      <span className="text-[8px] font-black text-neutral-700 uppercase tracking-widest">Confidence:</span>
                      <span className={`text-[8px] font-black ${
                        suggestedFocus.confidenceLabel === "High" ? "text-emerald-500" :
                        suggestedFocus.confidenceLabel === "Medium" ? "text-amber-400" :
                        "text-neutral-500"
                      }`}>{suggestedFocus.confidenceLabel}</span>
                      <span className="text-[8px] text-neutral-700 font-mono">({suggestedFocus.totalExecs} samples)</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end pt-1">
                    <span className="text-[10px] font-bold text-red-300 flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                      Investigate {suggestedFocus.topFunctionName} <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* BROKE AFTER DEPLOY */}
            {!!overview?.brokenAfterDeploy.length && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-3 h-3 text-orange-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Broke After Deploy</span>
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-orange-950/60 border border-orange-800/50 text-orange-400">
                    {overview.brokenAfterDeploy.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {overview.brokenAfterDeploy.map((item) => (
                    <div
                      key={item.functionId}
                      onClick={() => router.push(`/project/${id}/functions/${item.functionId}`)}
                      className="group relative border border-orange-800/50 bg-gradient-to-r from-orange-950/40 to-transparent rounded-lg px-3.5 py-2.5 cursor-pointer hover:border-orange-700/70 hover:from-orange-950/60 transition-all overflow-hidden"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-orange-500/70 rounded-l-xl" />
                      <div className="flex items-center gap-4 pl-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-[11px] font-black text-orange-200">{item.functionName}</span>
                            {item.deployId && (
                              <span className="text-[9px] font-mono text-neutral-500 bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded">
                                {item.deployId}
                              </span>
                            )}
                            <span className="text-[8px] font-black uppercase tracking-widest text-orange-500 ml-auto">regression</span>
                          </div>
                          {item.topIssue && (
                            <p className="text-[10px] text-neutral-400 leading-tight truncate mb-1">{item.topIssue}</p>
                          )}
                          <p className="text-[9px] text-neutral-600 font-mono">
                            failures started {timeAgo(item.deployedAt)} · {item.currentExecs} exec{item.currentExecs !== 1 ? "s" : ""} since deploy
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-3">
                          <div className="text-center">
                            <div className="text-[13px] font-black text-neutral-600 tabular-nums leading-none">{item.prevFailurePct}%</div>
                            <div className="text-[7px] text-neutral-700 uppercase mt-0.5">before</div>
                          </div>
                          <ArrowRight className="w-3 h-3 text-orange-600" />
                          <div className="text-center">
                            <div className="text-[20px] font-black text-orange-400 tabular-nums leading-none">{item.currentFailurePct}%</div>
                            <div className="text-[7px] text-neutral-700 uppercase mt-0.5">now</div>
                          </div>
                          <div className="text-[10px] font-black text-orange-500 bg-orange-950/60 border border-orange-800/40 px-1.5 py-1 rounded ml-1">
                            +{item.currentFailurePct - item.prevFailurePct}pp
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-700 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN (col-span-2) ─────────────────────────────── */}
          <div className="col-span-2 space-y-3">

            {/* ACTIVE INCIDENTS */}
            {!!incidentGroups.length && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Active Incidents</span>
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-red-950/60 border border-red-800/50 text-red-400">
                    {overview!.incidents.length}
                  </span>
                  {incidentGroups.some((g) => g.affectedFns.length > 1) && (
                    <span className="text-[8px] text-neutral-600 font-mono ml-1">grouped</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {incidentGroups.map((group, gi) => {
                    const topInc = group.incidents[0];
                    const tier = gi === 0 ? 'critical' : gi === 1 ? 'high' : 'medium';
                    const tierStyle = {
                      critical: "border-red-800/60 bg-red-950/30 hover:border-red-700/80",
                      high:     "border-orange-900/50 bg-orange-950/20 hover:border-orange-800/60",
                      medium:   "border-neutral-800/40 bg-neutral-900/20 hover:border-neutral-700/50",
                    }[tier];
                    return (
                      <div
                        key={group.cls}
                        onClick={() => router.push(`/project/${id}/functions/${topInc.functionId}`)}
                        className={`group border rounded-lg px-2.5 py-2 cursor-pointer transition-all ${tierStyle}`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className={`text-[9px] font-black tabular-nums w-3.5 shrink-0 ${
                            tier === 'critical' ? "text-red-700" : tier === 'high' ? "text-orange-800" : "text-neutral-700"
                          }`}>{gi + 1}.</span>
                          <ErrorClassBadge cls={group.cls} />
                          {tier === 'critical' && (
                            <span className="text-[7px] font-black uppercase px-1 py-0.5 rounded border text-red-300 border-red-700/60 bg-red-950/60 flex items-center gap-0.5">
                              <Target className="w-2 h-2" /> Critical
                            </span>
                          )}
                          {tier === 'high' && (
                            <span className="text-[7px] font-black uppercase px-1 py-0.5 rounded border text-orange-400 border-orange-800/50 bg-orange-950/50">High</span>
                          )}
                          {tier === 'medium' && (
                            <span className="text-[7px] font-black uppercase px-1 py-0.5 rounded border text-neutral-500 border-neutral-700/40 bg-neutral-900/60">Low</span>
                          )}
                          <div className={`ml-auto font-black tabular-nums shrink-0 ${
                            tier === 'critical' ? "text-sm text-red-400" : tier === 'high' ? "text-[11px] text-orange-400" : "text-[11px] text-neutral-500"
                          }`}>
                            {group.trafficContributionPct > 0 ? `${group.trafficContributionPct}%` : `${topInc.failureRatePct}%`}
                          </div>
                        </div>
                        <p className={`font-bold leading-tight truncate text-[11px] ${
                          tier === 'critical' ? "text-red-100" : tier === 'high' ? "text-orange-200/90" : "text-neutral-300/80"
                        }`}>
                          {topInc.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {group.affectedFns.length > 1 ? (
                            <span className="text-[8px] text-neutral-600 font-mono">{group.affectedFns.join(", ")}</span>
                          ) : (
                            <span className="text-[8px] text-neutral-600 font-mono">{group.affectedFns[0]}</span>
                          )}
                          <span className="text-[8px] text-neutral-700 font-mono ml-auto">{timeAgo(topInc.lastSeen)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VERIFICATION QUEUE */}
            {!!overview?.verificationQueue.length && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Verification</span>
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-amber-950/50 border border-amber-800/40 text-amber-400">
                    {overview.verificationQueue.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {overview.verificationQueue.map((item, i) => (
                    <div
                      key={`${item.functionId}-${i}`}
                      onClick={() => router.push(`/project/${id}/functions/${item.functionId}`)}
                      className="group border border-amber-900/30 bg-amber-950/10 rounded-lg px-2.5 py-2 cursor-pointer hover:border-amber-800/50 hover:bg-amber-950/20 transition-all"
                    >
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <ErrorClassBadge cls={item.errorClass} />
                        <span className="text-[8px] font-bold text-neutral-500 truncate">{item.functionName}</span>
                        <VerifyStatusBadge item={item} />
                      </div>
                      <p className="text-[10px] text-neutral-400 leading-tight truncate mb-1.5">{item.title}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-neutral-900 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500/60 rounded-full transition-all duration-500" style={{ width: `${item.progressPct}%` }} />
                        </div>
                        <span className="text-[7px] font-bold text-neutral-600 tabular-nums shrink-0 whitespace-nowrap">
                          {item.progress >= item.required
                            ? `${item.progress} samples`
                            : `${item.progress}/${item.required}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RECENTLY FIXED */}
            {!!overview?.recentFixes.length && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Recently Fixed</span>
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-900/40 text-emerald-600">
                    {overview.recentFixes.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {overview.recentFixes.map((item, i) => (
                    <div
                      key={`${item.functionId}-${i}`}
                      onClick={() => router.push(`/project/${id}/functions/${item.functionId}`)}
                      className="group border border-emerald-900/25 bg-emerald-950/10 rounded-lg px-2.5 py-2 cursor-pointer hover:border-emerald-800/40 hover:bg-emerald-950/20 transition-all"
                    >
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <ErrorClassBadge cls={item.errorClass} />
                        <span className="text-[8px] font-bold text-neutral-500 truncate">{item.functionName}</span>
                        <span className={`shrink-0 text-[7px] font-black uppercase px-1 py-0.5 rounded ml-auto border ${
                          item.confidence === "high" ? "text-emerald-400 bg-emerald-950/50 border-emerald-800/40"
                          : item.confidence === "medium" ? "text-teal-400 bg-teal-950/50 border-teal-800/40"
                          : "text-neutral-500 bg-neutral-900 border-neutral-800"
                        }`}>
                          {item.confidence}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 leading-tight truncate">{item.title}</p>
                      <p className="text-[8px] text-neutral-700 font-mono mt-0.5">
                        last failed {timeAgo(item.lastFailedAt)} · {item.execsSinceFix} clean exec{item.execsSinceFix !== 1 ? "s" : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* healthy state: show verification + recent fixes in single column */}
      {!isBroken && (
        <div className="grid grid-cols-2 gap-3">
          {!!overview?.verificationQueue.length && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Verification</span>
                <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-amber-950/50 border border-amber-800/40 text-amber-400">
                  {overview.verificationQueue.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {overview.verificationQueue.map((item, i) => (
                  <div
                    key={`${item.functionId}-${i}`}
                    onClick={() => router.push(`/project/${id}/functions/${item.functionId}`)}
                    className="group border border-amber-900/30 bg-amber-950/10 rounded-lg px-2.5 py-2 cursor-pointer hover:border-amber-800/50 transition-all"
                  >
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <ErrorClassBadge cls={item.errorClass} />
                      <span className="text-[8px] font-bold text-neutral-500 truncate">{item.functionName}</span>
                    </div>
                    <p className="text-[10px] text-neutral-400 leading-tight truncate mb-1">{item.title}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-neutral-900 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500/60 rounded-full" style={{ width: `${item.progressPct}%` }} />
                      </div>
                      <span className="text-[7px] font-bold text-neutral-600 tabular-nums">{item.progress}/{item.required}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!!overview?.recentFixes.length && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Recently Fixed</span>
                <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-900/40 text-emerald-600">
                  {overview.recentFixes.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {overview.recentFixes.map((item, i) => (
                  <div
                    key={`${item.functionId}-${i}`}
                    onClick={() => router.push(`/project/${id}/functions/${item.functionId}`)}
                    className="group border border-emerald-900/25 bg-emerald-950/10 rounded-lg px-2.5 py-2 cursor-pointer hover:border-emerald-800/40 transition-all"
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <ErrorClassBadge cls={item.errorClass} />
                      <span className="text-[8px] font-bold text-neutral-500 truncate">{item.functionName}</span>
                    </div>
                    <p className="text-[10px] text-neutral-400 leading-tight truncate">{item.title}</p>
                    <p className="text-[8px] text-neutral-700 font-mono mt-0.5">{item.execsSinceFix} clean exec{item.execsSinceFix !== 1 ? "s" : ""}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
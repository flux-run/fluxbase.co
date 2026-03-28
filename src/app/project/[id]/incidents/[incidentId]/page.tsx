"use client";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useFluxApi } from "@/lib/api";
import { ProjectOverviewResult, Execution } from "@/types/api";

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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-neutral-800/40">
        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">{title}</span>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

export default function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string; incidentId: string }>;
}) {
  const { id, incidentId } = use(params);
  const title = decodeURIComponent(incidentId);
  const router = useRouter();
  const api = useFluxApi(id);

  const [overview, setOverview] = useState<ProjectOverviewResult | null>(null);
  const [functionStats, setFunctionStats] = useState<any>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!api.ready) return;
    api.getProjectOverview(id).then(async d => {
      if (!d) { setLoading(false); return; }
      setOverview(d);
      const matching = d.incidents.filter(i => i.title === title);
      if (!matching.length) { setNotFound(true); setLoading(false); return; }
      const topFnId = matching.reduce((t, i) => i.trafficImpactPct > t.trafficImpactPct ? i : t, matching[0]).functionId;
      const [stats, execs] = await Promise.all([
        api.getFunctionStats(topFnId).catch(() => null),
        api.getFunctionExecutions(topFnId).catch(() => []),
      ]);
      if (stats) setFunctionStats(stats);
      const failing = ((execs as Execution[]) || [])
        .filter(e => e.status !== 'ok')
        .sort((a, b) => new Date(b.started_at ?? '').getTime() - new Date(a.started_at ?? '').getTime())
        .slice(0, 8);
      setExecutions(failing);
      setLoading(false);
    });
  }, [api.ready, id, title]);

  const group = useMemo(() => {
    if (!overview?.incidents) return null;
    const incs = overview.incidents.filter(i => i.title === title);
    if (!incs.length) return null;
    const topInc = incs.reduce((t, i) => i.trafficImpactPct > t.trafficImpactPct ? i : t, incs[0]);
    const totalErrors = incs.reduce((s, i) => s + i.totalErrors, 0);
    const totalExecs  = incs.reduce((s, i) => s + i.totalExecs, 0);
    const firstSeen   = incs.reduce((t, i) => i.firstSeen < t ? i.firstSeen : t, incs[0].firstSeen);
    const lastSeen    = incs.reduce((t, i) => i.lastSeen > t ? i.lastSeen : t, incs[0].lastSeen);
    const trafficImpactPct = Math.max(...incs.map(i => i.trafficImpactPct));
    const failureRatePct   = totalExecs > 0 ? Math.round((totalErrors / totalExecs) * 100) : topInc.failureRatePct;
    const affectedFns      = [...new Set(incs.map(i => i.functionName))];
    const errorsAfterDeploy  = incs.reduce((s, i) => s + (i.errorsAfterDeploy  ?? 0), 0);
    const errorsBeforeDeploy = incs.reduce((s, i) => s + (i.errorsBeforeDeploy ?? 0), 0);
    const execsAfterDeploy   = incs.reduce((s, i) => s + (i.execsAfterDeploy   ?? 0), 0);
    const execsBeforeDeploy  = incs.reduce((s, i) => s + (i.execsBeforeDeploy  ?? 0), 0);
    const rateAfter   = execsAfterDeploy  > 0 ? errorsAfterDeploy  / execsAfterDeploy  : null;
    const rateBefore  = execsBeforeDeploy > 0 ? errorsBeforeDeploy / execsBeforeDeploy : null;
    const rateAfterPct  = rateAfter  !== null ? Math.round(rateAfter  * 100) : null;
    const rateBeforePct = rateBefore !== null ? Math.round(rateBefore * 100) : null;
    const postDeploySampleLow = execsAfterDeploy > 0 && execsAfterDeploy < 10;
    const deployMode: 'introduced' | 'regressed' | 'improved' | 'unchanged' | null =
      !topInc.deployId ? null
      : errorsAfterDeploy === 0 && errorsBeforeDeploy === 0 ? null
      : errorsBeforeDeploy === 0 ? 'introduced'
      : rateAfter !== null && rateBefore !== null && rateAfter >= rateBefore * 1.25 ? 'regressed'
      : rateAfter !== null && rateBefore !== null && rateAfter <= rateBefore * 0.5  ? 'improved'
      : 'unchanged';
    const deployDeltaMin = topInc.deployedAt && firstSeen
      ? Math.round((new Date(firstSeen).getTime() - new Date(topInc.deployedAt ?? '').getTime()) / 60000)
      : null;
    const confidenceLabel = totalExecs >= 20 ? "High" : totalExecs >= 5 ? "Medium" : "Low";
    return {
      cls: topInc.errorClass,
      topFunctionId: topInc.functionId,
      allIncidents: incs,
      totalErrors, totalExecs, firstSeen, lastSeen,
      trafficImpactPct, failureRatePct, affectedFns,
      deployId: topInc.deployId,
      deployedAt: topInc.deployedAt,
      deployDeltaMin,
      errorsAfterDeploy, errorsBeforeDeploy,
      execsAfterDeploy, execsBeforeDeploy,
      rateAfterPct, rateBeforePct,
      postDeploySampleLow, deployMode,
      isRecurring: incs.some(i => i.isRecurring),
      confidenceLabel,
    };
  }, [overview, title]);

  if (loading) {
    return (
      <div className="py-6 space-y-4 animate-in fade-in duration-300">
        <div className="h-5 w-24 bg-neutral-900 rounded animate-pulse" />
        <div className="h-32 bg-red-950/20 rounded-xl border border-red-900/30 animate-pulse" />
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-3 space-y-3">
            <div className="h-48 bg-neutral-900/40 rounded-xl border border-neutral-800/30 animate-pulse" />
            <div className="h-40 bg-neutral-900/40 rounded-xl border border-neutral-800/30 animate-pulse" />
          </div>
          <div className="col-span-2 space-y-3">
            <div className="h-28 bg-neutral-900/40 rounded-xl border border-neutral-800/30 animate-pulse" />
            <div className="h-28 bg-neutral-900/40 rounded-xl border border-neutral-800/30 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !group) {
    return (
      <div className="py-6">
        <button
          onClick={() => router.push(`/project/${id}/incidents`)}
          className="flex items-center gap-1.5 text-[10px] text-neutral-500 hover:text-neutral-300 font-mono transition-colors mb-6"
        >
          <ArrowLeft className="w-3 h-3" />
          All incidents
        </button>
        <div className="flex flex-col items-center justify-center py-24 text-center border border-neutral-800/40 rounded-xl">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-3" />
          <p className="text-sm font-bold text-neutral-300">Incident resolved or not found</p>
          <p className="text-[11px] text-neutral-600 mt-1">{title}</p>
        </div>
      </div>
    );
  }

  const {
    cls, topFunctionId, allIncidents, totalErrors, totalExecs, firstSeen, lastSeen,
    trafficImpactPct, failureRatePct, affectedFns, deployId, deployedAt, deployDeltaMin,
    errorsAfterDeploy, errorsBeforeDeploy, execsAfterDeploy, execsBeforeDeploy,
    rateAfterPct, rateBeforePct, postDeploySampleLow, deployMode, isRecurring, confidenceLabel,
  } = group;

  return (
    <div className="py-4 space-y-4 animate-in fade-in duration-300 pb-16">
      {/* Back nav */}
      <button
        onClick={() => router.push(`/project/${id}/incidents`)}
        className="flex items-center gap-1.5 text-[10px] text-neutral-500 hover:text-neutral-300 font-mono transition-colors"
      >
        <ArrowLeft className="w-3 h-3" />
        All incidents
      </button>

      {/* Header card */}
      <div className="relative rounded-xl border border-red-800/50 bg-gradient-to-b from-red-950/40 to-red-950/10 overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-red-500 via-orange-500/60 to-transparent" />
        <div className="px-5 pt-4 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <ErrorClassBadge cls={cls} />
                <span className="text-[8px] font-black text-red-400 bg-red-950/60 border border-red-800/40 px-1.5 py-0.5 rounded uppercase tracking-widest">
                  Active
                </span>
                {isRecurring && (
                  <span className="text-[8px] font-black text-amber-400 bg-amber-950/50 border border-amber-800/50 px-1.5 py-0.5 rounded uppercase tracking-widest">
                    Recurring
                  </span>
                )}
              </div>
              <h1 className="text-xl font-black text-white font-mono tracking-tight break-all leading-tight">{title}</h1>
              <p className="text-[10px] text-neutral-500 font-mono mt-2">
                started {timeAgo(firstSeen)} · last seen {timeAgo(lastSeen)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-4xl font-black tabular-nums text-red-400 leading-none">{trafficImpactPct}%</div>
              <div className="text-[9px] text-neutral-500 mt-1">of traffic</div>
            </div>
          </div>
          {/* Scope row */}
          <div className="mt-4 flex items-center gap-3 flex-wrap border-t border-red-900/20 pt-3">
            <span className="text-[10px] font-black text-red-400">{failureRatePct}% failure rate</span>
            <span className="text-[10px] text-neutral-700">·</span>
            <span className="text-[10px] text-neutral-400 font-mono">{totalErrors}/{totalExecs} executions</span>
            <span className="text-[10px] text-neutral-700">·</span>
            <span className="text-[10px] text-neutral-400 font-mono">
              {affectedFns.length} function{affectedFns.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-5 gap-3 items-start">

        {/* LEFT col: deploy analysis + recent failures */}
        <div className="col-span-3 space-y-3">

          {/* Deploy analysis */}
          {deployId && (
            <SectionCard title="Deploy Analysis">
              <div className="space-y-1.5 font-mono">
                {/* Timing */}
                <p className="text-[10px] text-neutral-300">
                  <span className="text-neutral-600 mr-2">·</span>
                  {deployDeltaMin !== null && deployDeltaMin > 0
                    ? `started ${deployDeltaMin}m after deploy ${deployId}`
                    : `started after deploy ${deployId}`}
                  {deployedAt && <span className="text-neutral-500 ml-1">({timeAgo(deployedAt)})</span>}
                </p>

                {/* Before deploy counts */}
                {errorsAfterDeploy > 0 && (
                  <p className="text-[10px] text-neutral-400">
                    <span className="text-neutral-600 mr-2">·</span>
                    before deploy: {errorsBeforeDeploy} failures
                    {execsBeforeDeploy > 0 && (
                      <span className="text-neutral-500"> / {execsBeforeDeploy} execs ({Math.round(errorsBeforeDeploy / execsBeforeDeploy * 100)}%)</span>
                    )}
                  </p>
                )}

                {/* After deploy counts */}
                {errorsAfterDeploy > 0 && (
                  <p className="text-[10px] text-neutral-400">
                    <span className="text-neutral-600 mr-2">·</span>
                    after deploy: {errorsAfterDeploy} failures
                    {execsAfterDeploy > 0 && (
                      <span className="text-neutral-500"> / {execsAfterDeploy} execs ({Math.round(errorsAfterDeploy / execsAfterDeploy * 100)}%)</span>
                    )}
                  </p>
                )}

                {/* Rate summary line */}
                <p className="text-[10px] text-neutral-400">
                  <span className="text-neutral-600 mr-2">·</span>
                  {deployMode === 'introduced'
                    ? 'no failures before this deploy'
                    : deployMode === 'regressed' && rateBeforePct !== null && rateAfterPct !== null
                    ? `failure rate increased after deploy (${rateBeforePct}% → ${rateAfterPct}%)`
                    : deployMode === 'improved' && rateBeforePct !== null && rateAfterPct !== null
                    ? `failure rate decreased after deploy (${rateBeforePct}% → ${rateAfterPct}%)`
                    : deployMode === 'unchanged' && rateBeforePct !== null && rateAfterPct !== null
                    ? `failure rate stable before and after deploy (${rateBeforePct}% → ${rateAfterPct}%)`
                    : 'active around this deployment'}
                </p>

                {/* Low sample warning */}
                {postDeploySampleLow && (
                  <p className="text-[10px] text-neutral-500">
                    <span className="text-neutral-700 mr-2">·</span>
                    low sample size after deploy ({execsAfterDeploy} executions)
                  </p>
                )}

                {/* Fact line */}
                {deployMode === 'regressed' && (
                  <p className="text-[10px] font-black">
                    <span className="text-neutral-600 mr-2">·</span>
                    <span className="text-orange-300">
                      {postDeploySampleLow
                        ? `failure rate increased after deployment${rateBeforePct !== null && rateAfterPct !== null ? ` (${rateBeforePct}% → ${rateAfterPct}%)` : ''}`
                        : '→ worsened by this deployment'}
                    </span>
                  </p>
                )}

                {/* Interpretation line */}
                {deployMode === 'regressed' && postDeploySampleLow && (
                  <p className="text-[10px] font-black">
                    <span className="text-neutral-600 mr-2">·</span>
                    <span className="text-orange-400/80">→ possible regression (low impact confidence)</span>
                  </p>
                )}
                {deployMode === 'introduced' && (
                  <p className="text-[10px] font-black">
                    <span className="text-neutral-600 mr-2">·</span>
                    <span className="text-orange-400">→ caused by this deployment</span>
                  </p>
                )}
                {deployMode === 'improved' && (
                  <p className="text-[10px] font-black">
                    <span className="text-neutral-600 mr-2">·</span>
                    <span className="text-emerald-400">→ improved by this deployment</span>
                  </p>
                )}
                {deployMode === 'unchanged' && (
                  <p className="text-[10px] font-black">
                    <span className="text-neutral-600 mr-2">·</span>
                    <span className="text-amber-400">
                      → persistent failure — {postDeploySampleLow ? 'no evidence of improvement after deployment' : 'unchanged by deployment'}
                    </span>
                  </p>
                )}
                {!deployMode && (
                  <p className="text-[10px] font-black">
                    <span className="text-neutral-600 mr-2">·</span>
                    <span className="text-orange-400">→ likely caused by this deployment</span>
                  </p>
                )}
              </div>
            </SectionCard>
          )}

          {/* Recent failing executions */}
          <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-neutral-800/40 flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Recent Failures</span>
              <button
                onClick={() => router.push(`/project/${id}/executions`)}
                className="text-[9px] text-neutral-600 hover:text-neutral-400 font-mono flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
            {executions.length === 0 ? (
              <p className="px-4 py-4 text-[10px] text-neutral-600 font-mono">No recent failures found</p>
            ) : (
              <div className="divide-y divide-neutral-800/30">
                {executions.map(exec => (
                  <div
                    key={exec.id}
                    onClick={() => router.push(`/project/${id}/executions/${exec.id}`)}
                    className="group px-4 py-2.5 cursor-pointer hover:bg-neutral-900/40 transition-colors flex items-center gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-mono text-neutral-300 truncate">
                        {exec.error_message ?? exec.error ?? 'Execution failed'}
                      </p>
                      <p className="text-[9px] text-neutral-600 font-mono mt-0.5">
                        {exec.started_at ? timeAgo(exec.started_at) : '—'}
                        {exec.duration_ms != null && (
                          <span className="ml-2">{exec.duration_ms}ms</span>
                        )}
                      </p>
                    </div>
                    <ArrowRight className="w-3 h-3 text-neutral-700 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Root cause from function stats */}
          {functionStats?.root_cause && (
            <SectionCard title="Root Cause">
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-neutral-200">{functionStats.root_cause.issue}</p>
                {functionStats.root_cause.cause && (
                  <p className="text-[10px] text-neutral-500 font-mono">{functionStats.root_cause.cause}</p>
                )}
                {functionStats.root_cause.suggestion && (
                  <p className="text-[10px] text-neutral-400 font-mono mt-2 pt-2 border-t border-neutral-800/40">
                    → {functionStats.root_cause.suggestion}
                  </p>
                )}
              </div>
            </SectionCard>
          )}
        </div>

        {/* RIGHT col: confidence + affected functions */}
        <div className="col-span-2 space-y-3">

          {/* Confidence */}
          <SectionCard title="Confidence">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-neutral-500 font-mono">Signal</span>
                <span className={`text-[9px] font-black ${
                  confidenceLabel === 'High' ? 'text-emerald-500'
                  : confidenceLabel === 'Medium' ? 'text-amber-400'
                  : 'text-neutral-500'
                }`}>{confidenceLabel}</span>
              </div>
              {deployId && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-neutral-500 font-mono">Impact</span>
                    <span className={`text-[9px] font-black ${
                      postDeploySampleLow ? 'text-neutral-500'
                      : deployMode === 'introduced' ? 'text-emerald-500'
                      : 'text-amber-400'
                    }`}>
                      {postDeploySampleLow ? 'Low' : deployMode === 'introduced' ? 'High' : 'Medium'}
                    </span>
                  </div>
                  {postDeploySampleLow && (
                    <p className="text-[9px] text-neutral-600 font-mono pt-0.5">
                      limited post-deploy data ({execsAfterDeploy} executions)
                    </p>
                  )}
                </>
              )}
              {isRecurring && (
                <p className="text-[9px] text-amber-400/80 font-mono mt-1 pt-2 border-t border-neutral-800/40">
                  ⚠ also seen in previous deployment
                </p>
              )}
            </div>
          </SectionCard>

          {/* Affected functions */}
          <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-neutral-800/40">
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">
                Affected Functions ({allIncidents.length})
              </span>
            </div>
            <div className="divide-y divide-neutral-800/30">
              {allIncidents.map(inc => (
                <div
                  key={inc.functionId}
                  onClick={() => router.push(`/project/${id}/functions/${inc.functionId}`)}
                  className="group px-4 py-2.5 cursor-pointer hover:bg-neutral-900/40 transition-colors flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-neutral-300 font-mono font-bold truncate">{inc.functionName}</p>
                    <p className="text-[9px] text-neutral-600 font-mono mt-0.5">
                      {inc.totalErrors}/{inc.totalExecs} execs · {inc.failureRatePct}% failure
                    </p>
                  </div>
                  <ArrowRight className="w-3 h-3 text-neutral-700 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>

          {/* Top issues from function stats */}
          {functionStats?.top_issues?.length > 0 && (
            <div className="rounded-xl border border-neutral-800/60 bg-neutral-950/60 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-neutral-800/40">
                <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Error Clusters</span>
              </div>
              <div className="divide-y divide-neutral-800/30">
                {functionStats.top_issues.slice(0, 4).map((issue: any) => (
                  <div key={issue.id} className="px-4 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[9px] text-neutral-400 font-mono truncate flex-1">
                        {issue.title.length > 60 ? issue.title.slice(0, 60) + '…' : issue.title}
                      </p>
                      <span className="text-[9px] font-black text-neutral-500 shrink-0">{issue.count}×</span>
                    </div>
                    <p className="text-[8px] text-neutral-700 font-mono mt-0.5">
                      first seen {timeAgo(issue.first_seen)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

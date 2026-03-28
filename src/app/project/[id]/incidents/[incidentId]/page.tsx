"use client";
import { use, useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, Info, Zap, Terminal } from "lucide-react";
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

type IncidentStatus = 'active' | 'investigating' | 'resolved';

function generateSuggestedFix(errorClass: string, title: string): { summary: string; causes: string[]; actions: string[] } | null {
  const t = title.toLowerCase();
  if (errorClass === 'external') {
    if (t.includes('dns') || t.includes('enotfound') || t.includes('fetch failed') || t.includes('getaddrinfo')) {
      return {
        summary: 'This error is caused by DNS resolution failure or an unreachable external service.',
        causes: [
          'External API endpoint is unavailable or returning errors',
          'DNS misconfiguration or DNS propagation delay',
          'Network egress blocked by firewall / routing rules',
        ],
        actions: [
          'Verify the external endpoint is reachable from the runtime environment',
          'Check outbound network rules and DNS resolution',
          'Add retry logic with exponential backoff',
          'Add a circuit breaker to fail fast when the service is degraded',
          'Consider a fallback / graceful degradation path',
        ],
      };
    }
    if (t.includes('timeout') || t.includes('timed out') || t.includes('etimedout')) {
      return {
        summary: 'External API call is timing out — the downstream service is slow or unresponsive.',
        causes: [
          'External service responding slowly under load',
          'Request payload too large',
          'Network latency spikes to the external endpoint',
        ],
        actions: [
          'Set an explicit timeout and catch TimeoutError',
          'Add retry with exponential backoff and jitter',
          'Profile the external call for payload size issues',
          'Consider async / queue-based processing instead of synchronous calls',
        ],
      };
    }
    return {
      summary: 'An external service dependency is failing, causing this error.',
      causes: [
        'External API is down or returning unexpected responses',
        'Authentication credentials may have expired or rotated',
        'Rate limiting enforced by the external service',
      ],
      actions: [
        "Check the external service's status page and recent incidents",
        'Review API credentials, token expiry, and rate limits',
        'Add retry logic with exponential backoff',
        'Add a fallback path for when the dependency is unavailable',
      ],
    };
  }
  if (errorClass === 'infra') {
    if (t.includes('no_artifact') || t.includes('artifact')) {
      return {
        summary: 'The function artifact failed to load — this is a deployment or build pipeline issue.',
        causes: [
          'Artifact was not uploaded or was corrupted during upload',
          'Version mismatch between the expected and uploaded artifact',
          'Storage access permission issue preventing the runtime from reading the artifact',
        ],
        actions: [
          'Re-deploy the function to upload a fresh build artifact',
          'Check the build and upload step in your CI/CD pipeline for failures',
          'Verify storage bucket permissions and artifact integrity checksums',
          'Check if the function is stuck in a deploying state',
        ],
      };
    }
    return {
      summary: 'Infrastructure-level failure is preventing function execution.',
      causes: [
        'Runtime environment misconfiguration after a recent deploy',
        'Memory or CPU resource limit exceeded',
        'Infrastructure outage in the execution environment',
      ],
      actions: [
        'Check resource limits (memory, CPU, timeout) in your function config',
        'Review recent infrastructure and configuration changes',
        'Re-deploy the function to force a fresh environment',
        'Check runtime health metrics and escalate if outage suspected',
      ],
    };
  }
  if (errorClass === 'runtime') {
    if (t.includes('unhandled') || t.includes('exception') || t.includes('typeerror') || t.includes('referenceerror')) {
      return {
        summary: 'An unhandled exception was thrown and not caught by your code.',
        causes: [
          'Missing try/catch around an async operation',
          'Unexpected null or undefined value being accessed',
          'Type mismatch between expected and actual data shapes',
        ],
        actions: [
          'Add try/catch around the failing code section',
          'Add null/undefined guards before accessing properties',
          'Enable strict TypeScript types to catch type mismatches at compile time',
          'Add a global unhandledRejection handler as a last-resort catch',
        ],
      };
    }
    return {
      summary: 'A runtime error occurred during function execution.',
      causes: [
        'Uncaught exception or unhandled promise rejection',
        'Logic error leading to an invalid program state',
        'A dependency throwing an unexpected error',
      ],
      actions: [
        'Review the error stack trace to find the root throw site',
        'Add try/catch around the failing operation',
        'Add input validation at the function entry point',
        'Write a regression test for this failure case',
      ],
    };
  }
  if (errorClass === 'user') {
    return {
      summary: 'A user-thrown error indicates intentional logic-level rejection — check if this is expected.',
      causes: [
        'Validation failure — input did not meet expected constraints',
        'Business rule violation — e.g. insufficient balance, wrong state transition',
        'Missing required input that the function depends on',
      ],
      actions: [
        'Review the business logic triggering this error',
        'Check if this error is expected and handled correctly by callers',
        'Add structured error codes to help callers distinguish failure types',
        'Verify the input validation rules are appropriate for production usage patterns',
      ],
    };
  }
  return null;
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
  const [incidentStatus, setIncidentStatus] = useState<IncidentStatus>('active');

  useEffect(() => {
    const saved = localStorage.getItem(`incident-status:${title}`);
    if (saved === 'active' || saved === 'investigating' || saved === 'resolved') {
      setIncidentStatus(saved);
    }
  }, [title]);

  const updateStatus = useCallback((s: IncidentStatus) => {
    setIncidentStatus(s);
    localStorage.setItem(`incident-status:${title}`, s);
  }, [title]);

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
    const severity: 'High' | 'Medium' | 'Low' =
      failureRatePct > 50 || trafficImpactPct > 25 ? 'High'
      : failureRatePct > 20 || trafficImpactPct > 10 ? 'Medium'
      : 'Low';
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
      severity,
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
    rateAfterPct, rateBeforePct, postDeploySampleLow, deployMode, isRecurring, confidenceLabel, severity,
  } = group;

  const suggestedFix = generateSuggestedFix(cls, title);
  const deployVerdict =
    !deployId ? null
    : deployMode === 'introduced' ? { label: `Likely caused by deploy ${deployId}`, tone: 'danger', confidence: 'High' } as const
    : deployMode === 'regressed'  ? { label: `Likely worsened by deploy ${deployId}`, tone: 'danger', confidence: postDeploySampleLow ? 'Low' : 'Medium' } as const
    : deployMode === 'improved'   ? { label: `Improved since deploy ${deployId}`, tone: 'good', confidence: 'Medium' } as const
    : deployMode === 'unchanged'  ? { label: `Not related to deploy ${deployId}`, tone: 'neutral', confidence: 'Medium' } as const
    : { label: `Active around deploy ${deployId}`, tone: 'neutral', confidence: 'Low' } as const;

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
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border ${
                  incidentStatus === 'resolved'
                    ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40'
                    : incidentStatus === 'investigating'
                    ? 'text-amber-400 bg-amber-950/60 border-amber-800/40'
                    : 'text-red-400 bg-red-950/60 border-red-800/40'
                }`}>
                  {incidentStatus}
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

      {/* Deploy Verdict — full-width binary verdict */}
      {deployVerdict && (
        <div className={`rounded-xl border overflow-hidden ${
          deployVerdict.tone === 'danger' ? 'border-orange-700/50 bg-orange-950/15'
          : deployVerdict.tone === 'good'  ? 'border-emerald-700/50 bg-emerald-950/15'
          : 'border-neutral-700/50 bg-neutral-900/30'
        }`}>
          <div className="px-5 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {deployVerdict.tone === 'danger' ? (
                <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
              ) : deployVerdict.tone === 'good' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-neutral-400 shrink-0" />
              )}
              <div>
                <p className={`text-sm font-black ${
                  deployVerdict.tone === 'danger' ? 'text-orange-300'
                  : deployVerdict.tone === 'good'  ? 'text-emerald-300'
                  : 'text-neutral-300'
                }`}>{deployVerdict.label}</p>
                <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                  Confidence: {deployVerdict.confidence}
                  {deployedAt && <span className="ml-2">· deployed {timeAgo(deployedAt)}</span>}
                </p>
              </div>
            </div>
            <span className="text-[9px] font-mono text-neutral-700 shrink-0 hidden sm:block">deploy · {deployId}</span>
          </div>
        </div>
      )}

      {/* Impact Summary — decision-grade metrics */}
      <div className="grid grid-cols-4 gap-2">
        {[
          {
            label: 'Traffic Affected',
            value: `${trafficImpactPct}%`,
            sub: 'of all requests',
            color: trafficImpactPct > 20 ? 'text-red-400' : trafficImpactPct > 5 ? 'text-orange-400' : 'text-amber-400',
          },
          {
            label: 'Failure Rate',
            value: `${failureRatePct}%`,
            sub: `${totalErrors}/${totalExecs} execs`,
            color: failureRatePct > 50 ? 'text-red-400' : failureRatePct > 20 ? 'text-orange-400' : 'text-amber-400',
          },
          {
            label: 'Scope',
            value: `${affectedFns.length} fn${affectedFns.length !== 1 ? 's' : ''}`,
            sub: affectedFns.slice(0, 2).join(', ') + (affectedFns.length > 2 ? ` +${affectedFns.length - 2}` : ''),
            color: 'text-neutral-300',
          },
          {
            label: 'Severity',
            value: severity,
            sub: 'based on rate · scope',
            color: severity === 'High' ? 'text-red-400' : severity === 'Medium' ? 'text-orange-400' : 'text-amber-400',
          },
        ].map(m => (
          <div key={m.label} className="rounded-xl border border-neutral-800/50 bg-neutral-900/40 px-3 py-3">
            <p className={`text-xl font-black tabular-nums leading-none ${m.color}`}>{m.value}</p>
            <p className="text-[9px] text-neutral-500 font-mono mt-1.5">{m.label}</p>
            <p className="text-[8px] text-neutral-700 font-mono truncate mt-0.5">{m.sub}</p>
          </div>
        ))}
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

          {/* Suggested Fix */}
          {suggestedFix && (
            <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/10 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-cyan-900/30 flex items-center gap-2">
                <Zap className="w-3 h-3 text-cyan-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-cyan-600">Suggested Fix</span>
              </div>
              <div className="px-4 py-3 space-y-3">
                <p className="text-[10px] text-neutral-300 font-mono leading-relaxed">{suggestedFix.summary}</p>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-neutral-600 mb-1.5">Likely causes</p>
                  <ul className="space-y-1">
                    {suggestedFix.causes.map((c, i) => (
                      <li key={i} className="text-[10px] text-neutral-400 font-mono flex gap-2">
                        <span className="text-neutral-700 shrink-0">–</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-neutral-600 mb-1.5">Recommended actions</p>
                  <ol className="space-y-1">
                    {suggestedFix.actions.map((a, i) => (
                      <li key={i} className="text-[10px] text-neutral-300 font-mono flex gap-2">
                        <span className="text-cyan-700 shrink-0 font-black">{i + 1}.</span>
                        {a}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
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

          {/* Debug entry point */}
          {executions.length > 0 && (
            <div className="rounded-xl border border-neutral-800/50 bg-neutral-900/20 overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Terminal className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-neutral-300">Reproduce this failure</p>
                    <p className="text-[9px] text-neutral-600 font-mono mt-0.5">
                      {executions[0].started_at ? `last failed ${timeAgo(executions[0].started_at)}` : 'view execution trace'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/project/${id}/executions/${executions[0].id}`)}
                  className="flex items-center gap-1.5 text-[9px] font-black text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded-lg px-3 py-1.5 transition-all shrink-0"
                >
                  View trace <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

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

        {/* RIGHT col: status, confidence, affected functions */}
        <div className="col-span-2 space-y-3">

          {/* Ownership + Status */}
          <SectionCard title="Incident Status">
            <div className="space-y-3">
              {/* Status machine */}
              <div className="flex gap-1">
                {(['active', 'investigating', 'resolved'] as IncidentStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    className={`flex-1 text-[8px] font-black uppercase tracking-widest px-1.5 py-1.5 rounded border transition-all ${
                      incidentStatus === s
                        ? s === 'active'       ? 'bg-red-950/60 border-red-800/60 text-red-400'
                          : s === 'investigating' ? 'bg-amber-950/60 border-amber-800/60 text-amber-400'
                          : 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
                        : 'bg-transparent border-neutral-800/40 text-neutral-600 hover:text-neutral-400 hover:border-neutral-700/60'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {/* Ownership metadata */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-neutral-600 font-mono">Owner</span>
                  <span className="text-[9px] text-neutral-500 font-mono">Unassigned</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-neutral-600 font-mono">Service</span>
                  <span className="text-[9px] text-neutral-400 font-mono truncate max-w-[120px]">
                    {affectedFns[0] ?? '—'}
                  </span>
                </div>
                {deployId && (
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-neutral-600 font-mono">Triggered after</span>
                    <span className="text-[9px] text-neutral-400 font-mono">deploy {deployId}</span>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

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

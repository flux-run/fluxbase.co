"use client";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";
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

function normalizeIncidentTitle(title: string, cls: string): string {
  const t = title.toLowerCase();
  if (t.includes("dns") || t.includes("enotfound") || t.includes("fetch failed") || t.includes("getaddrinfo")) {
    return "External API fetch failure (DNS resolution)";
  }
  if (t.includes("no_artifact") || t.includes("artifact")) {
    return "Missing artifact during execution";
  }
  if (cls === "user") {
    return "User-thrown error in handler";
  }
  if (cls === "infra") {
    return "Infrastructure/runtime failure";
  }
  if (cls === "external") {
    return "External dependency failure";
  }
  return title;
}

function minutesSince(ts: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 60000));
}

type IncidentRow = {
  title: string;
  normalizedTitle: string;
  alertLevel: "critical" | "degraded" | "warning";
  cls: string;
  failureRatePct: number;
  totalErrors: number;
  totalExecs: number;
  firstSeen: string;
  lastSeen: string;
  trafficImpactPct: number;
  affectedFns: string[];
  deployId: string | null;
  isRecurring: boolean;
  priorityScore: number;
  insight: string;
  differentiator: string;
  userImpact: string;
  errorsAfterDeploy: number;
  execsAfterDeploy: number;
  blastRadius: string;
};

export default function IncidentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const api = useFluxApi(id);
  const [overview, setOverview] = useState<ProjectOverviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const load = async (silent = false) => {
    if (!api.ready) return;
    if (!silent) setLoading(true);
    const d = await api.getProjectOverview(id);
    if (d) setOverview(d);
    setLastRefreshed(new Date());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [api.ready, id]);

  const rows = useMemo((): IncidentRow[] => {
    if (!overview?.incidents.length) return [];
    const map = new Map<string, ProjectOverviewResult["incidents"]>();
    for (const inc of overview.incidents) {
      if (!map.has(inc.title)) map.set(inc.title, []);
      map.get(inc.title)!.push(inc);
    }
    return [...map.entries()]
      .map(([title, incs]) => {
        const topInc = incs.reduce((t, i) => i.trafficImpactPct > t.trafficImpactPct ? i : t, incs[0]);
        const totalErrors = incs.reduce((s, i) => s + i.totalErrors, 0);
        const totalExecs  = incs.reduce((s, i) => s + i.totalExecs, 0);
        const errorsAfterDeploy = incs.reduce((s, i) => s + (i.errorsAfterDeploy ?? 0), 0);
        const execsAfterDeploy = incs.reduce((s, i) => s + (i.execsAfterDeploy ?? 0), 0);
        const firstSeen   = incs.reduce((t, i) => i.firstSeen < t ? i.firstSeen : t, incs[0].firstSeen);
        const lastSeen    = incs.reduce((t, i) => i.lastSeen > t ? i.lastSeen : t, incs[0].lastSeen);
        const failureRatePct = totalExecs > 0 ? Math.round((totalErrors / totalExecs) * 100) : topInc.failureRatePct;
        const trafficImpactPct = Math.max(...incs.map(i => i.trafficImpactPct));
        const recencyScore = Math.max(0, 100 - Math.min(100, Math.floor(minutesSince(lastSeen) / 10))); // 0..100
        const priorityScore = (failureRatePct * 0.5) + (trafficImpactPct * 0.3) + (recencyScore * 0.2);
        const isOlderIssue = minutesSince(firstSeen) > 12 * 60;
        const insight = topInc.deployId
          ? (isOlderIssue
            ? `Continues after latest deploy ${topInc.deployId.slice(0, 7)}`
            : `Started immediately after latest deploy ${topInc.deployId.slice(0, 7)}`)
          : (failureRatePct === 100
              ? "All executions failing (100%)"
              : `Updated ${timeAgo(lastSeen)} · monitor trend`);
        const differentiator = totalExecs <= 5
          ? `⚠ Low confidence — only ${totalExecs} executions observed`
          : isOlderIssue
            ? `Persisting issue (started ${timeAgo(firstSeen)})`
            : `Active now (last seen ${timeAgo(lastSeen)})`;
        const userImpact = topInc.errorClass === 'external'
          ? 'User impact: requests failing before response'
          : topInc.errorClass === 'user'
            ? 'User impact: invalid input rejected'
            : topInc.errorClass === 'infra'
              ? 'User impact: execution could not start'
              : 'User impact: request handling failed';
        const alertLevel: "critical" | "degraded" | "warning" =
          (execsAfterDeploy > 0 && errorsAfterDeploy === execsAfterDeploy) || failureRatePct >= 80 || trafficImpactPct >= 50
            ? "critical"
            : (failureRatePct >= 30 || trafficImpactPct >= 20)
              ? "degraded"
              : "warning";
        const blastRadius = trafficImpactPct >= 90
          ? "impacting almost all incoming requests"
          : trafficImpactPct >= 50
            ? "affecting majority of users"
            : trafficImpactPct >= 20
              ? "affecting a significant user segment"
              : "affecting a limited set of requests";
        return {
          title,
          normalizedTitle: normalizeIncidentTitle(title, topInc.errorClass),
          alertLevel,
          cls: topInc.errorClass,
          failureRatePct,
          totalErrors,
          totalExecs,
          firstSeen,
          lastSeen,
          trafficImpactPct,
          affectedFns: [...new Set(incs.map(i => i.functionName))],
          deployId: topInc.deployId,
          isRecurring: incs.some(i => i.isRecurring),
          priorityScore,
          insight,
          differentiator,
          userImpact,
          errorsAfterDeploy,
          execsAfterDeploy,
          blastRadius,
        };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }, [overview]);

  if (loading) {
    return (
      <div className="py-6 space-y-3 animate-in fade-in duration-300">
        <div className="h-8 w-48 bg-neutral-900 rounded animate-pulse" />
        <div className="h-5 w-64 bg-neutral-900/60 rounded animate-pulse mt-1" />
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-neutral-900/40 rounded-xl border border-neutral-800/30 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black text-white tracking-tight">Incidents</h1>
            {rows.length > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-950/40 border border-red-800/50 rounded-full">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">{rows.length}</span>
              </div>
            )}
          </div>
          <p className="text-[10px] text-neutral-600 font-mono mt-0.5">
            {rows.length > 0
              ? `${rows.length} active · ${overview?.health.trafficImpactPct ?? 0}% traffic impacted`
              : "No active incidents"}
            {lastRefreshed && (
              <span className="ml-2 text-neutral-700">· updated {timeAgo(lastRefreshed.toISOString())}</span>
            )}
          </p>
        </div>
        <button
          onClick={() => load(true)}
          className="p-1.5 text-neutral-600 hover:text-neutral-400 transition-colors rounded-md hover:bg-neutral-900"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {rows.length > 0 && (
        <div className="rounded-xl border border-red-800/50 bg-gradient-to-r from-red-950/35 to-red-950/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[9px] font-black uppercase tracking-widest text-red-300">Needs attention now (1)</span>
          </div>

          <div className="mt-2 w-full text-left group grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 min-w-0">
              <p className="text-sm font-black text-white">{rows[0].normalizedTitle}</p>
              <div className="mt-1 mb-1 flex items-center gap-1.5 flex-wrap">
                <ErrorClassBadge cls={rows[0].cls} />
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border ${
                  rows[0].alertLevel === 'critical'
                    ? 'text-red-400 bg-red-950/50 border-red-800/50'
                    : rows[0].alertLevel === 'degraded'
                      ? 'text-orange-400 bg-orange-950/40 border-orange-800/40'
                      : 'text-amber-400 bg-amber-950/40 border-amber-800/40'
                }`}>
                  {rows[0].alertLevel}
                </span>
                {rows[0].deployId && (
                  <span className="text-[8px] font-mono text-neutral-600 border border-neutral-800/60 px-1.5 py-0.5 rounded">
                    after deploy {rows[0].deployId.slice(0, 7)}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-neutral-400 font-mono mt-1">
                {rows[0].trafficImpactPct}% traffic affected · {rows[0].failureRatePct}% failure rate
              </p>
              <p className="text-[9px] text-neutral-500 font-mono mt-1">→ {rows[0].blastRadius}</p>
              {rows[0].execsAfterDeploy > 0 && rows[0].errorsAfterDeploy === rows[0].execsAfterDeploy && (
                <p className="text-[10px] text-red-300 font-black font-mono mt-1">⚠ All executions failing after latest deploy</p>
              )}
              <p className="text-[10px] text-orange-300 font-mono mt-1">{rows[0].insight}</p>
              <button
                onClick={() => router.push(`/project/${id}/executions?status=error&incident=${encodeURIComponent(rows[0].title)}&class=${rows[0].cls}${rows[0].deployId ? `&afterDeploy=${rows[0].deployId}` : ''}&debugger=1`)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-cyan-700/70 bg-cyan-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-100 shadow-[0_0_0_1px_rgba(14,116,144,0.25)] transition-colors hover:border-cyan-500 hover:bg-cyan-500/25"
              >
                → Investigate DNS / external API connectivity
              </button>
              <p className="text-[9px] text-neutral-500 font-mono mt-1">{rows[0].userImpact}</p>
            </div>

            <div className="xl:col-span-1 rounded-lg border border-red-900/30 bg-black/20 px-3 py-2 text-[9px] text-neutral-500 font-mono space-y-1">
              <p className="text-neutral-400 font-black uppercase tracking-widest text-[8px]">Why ranked #1</p>
              <p>• High traffic impact ({rows[0].trafficImpactPct}%)</p>
              <p>• Elevated failure rate ({rows[0].failureRatePct}%)</p>
              {rows[0].deployId && <p>• Immediate regression after deploy {rows[0].deployId.slice(0, 7)}</p>}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rows.slice(1).map((row, idx) => (
          <div
            key={row.title}
            onClick={() => router.push(`/project/${id}/incidents/${encodeURIComponent(row.title)}`)}
            className={`group relative border border-red-900/40 bg-gradient-to-r from-red-950/20 to-transparent rounded-xl px-4 py-3.5 cursor-pointer hover:border-red-800/60 hover:from-red-950/35 transition-all overflow-hidden ${row.differentiator.startsWith('⚠ Low confidence') ? 'opacity-80' : ''}`}
          >
            {/* Priority indicator — bold for #1, subtle for rest */}
            <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl ${idx === 0 ? 'bg-red-500' : 'bg-red-900/60'}`} />
            <div className="pl-1 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                {/* Title + badges row */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <ErrorClassBadge cls={row.cls} />
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border ${
                    row.alertLevel === 'critical'
                      ? 'text-red-400 bg-red-950/50 border-red-800/50'
                      : row.alertLevel === 'degraded'
                        ? 'text-orange-400 bg-orange-950/40 border-orange-800/40'
                        : 'text-amber-400 bg-amber-950/40 border-amber-800/40'
                  }`}>
                    {row.alertLevel}
                  </span>
                  {row.isRecurring && (
                    <span className="text-[8px] font-black text-amber-400 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded uppercase tracking-widest">
                      Recurring
                    </span>
                  )}
                  {row.deployId && (
                    <span className="text-[8px] font-mono text-neutral-600 border border-neutral-800/60 px-1.5 py-0.5 rounded">
                      after deploy {row.deployId.slice(0, 7)}
                    </span>
                  )}
                </div>
                {/* Error title */}
                <p className="text-sm font-black text-white tracking-tight truncate mb-1">{row.normalizedTitle}</p>
                <p className="text-[10px] text-orange-300 font-mono mb-2">{row.insight}</p>
                <p className="text-[9px] text-neutral-500 font-mono mb-2">{row.differentiator}</p>
                <p className="text-[9px] text-neutral-500 font-mono mb-2">{row.userImpact}</p>
                {/* Metrics row */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-[10px] font-black text-red-400">{row.failureRatePct}% failure rate</span>
                  <span className="text-[10px] text-neutral-700">·</span>
                  <span className="text-[10px] text-neutral-400 font-mono">{row.totalErrors}/{row.totalExecs} execs</span>
                  <span className="text-[10px] text-neutral-700">·</span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {row.affectedFns.length === 1 ? row.affectedFns[0] : `${row.affectedFns.length} functions`}
                  </span>
                  <span className="text-[10px] text-neutral-700">·</span>
                  <span className="text-[10px] text-neutral-600 font-mono">started {timeAgo(row.firstSeen)}</span>
                </div>
              </div>
              {/* Right: traffic impact */}
              <div className="shrink-0 text-right flex flex-col items-end gap-1">
                <div className="text-2xl font-black tabular-nums text-red-400 leading-none">{row.trafficImpactPct}%</div>
                <div className="text-[8px] text-neutral-600 uppercase tracking-widest font-bold">traffic</div>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-700 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

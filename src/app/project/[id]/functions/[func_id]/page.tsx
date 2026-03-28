"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useFluxApi } from "@/lib/api";
import { toast } from "sonner";
import { Zap, Activity, AlertCircle, Clock, Globe, Terminal, Save, Play, ArrowUpRight, BarChart3, AlertOctagon, LucideIcon, Lightbulb, AlertTriangle, ChevronDown, ChevronUp, GitCommit } from "lucide-react";
import { Function, Execution, Route, FunctionStatsResult } from "@/types/api";
import { ExecutionDetailDrawer } from "@/components/dashboard/ExecutionDetailDrawer";

function formatErrorHeadline(
  errorName?: string | null,
  errorMessage?: string | null,
  fallback?: string | null,
  errorStack?: string | null,
) {
  const name = errorName?.trim();
  const message = errorMessage?.trim();
  const fallbackMessage = fallback?.trim();
  const stackLine = errorStack
    ?.split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("at "))
    ?.replace(/^Uncaught\s+/, "")
    ?.trim();

  const isGeneric = (value?: string | null) => {
    const normalized = value?.trim().toLowerCase();
    return !normalized ||
      normalized === "unhandled exception" ||
      normalized === "unknown runtime error" ||
      normalized === "unknown error" ||
      normalized === "runtime error" ||
      normalized === "exception" ||
      normalized === "error";
  };

  if (name && message) {
    return message.startsWith(`${name}:`) ? message : `${name}: ${message}`;
  }
  if (stackLine && !isGeneric(stackLine)) return stackLine;
  if (message && !isGeneric(message)) return message;
  if (fallbackMessage && !isGeneric(fallbackMessage)) return fallbackMessage;
  if (stackLine) return stackLine;
  if (message) return message;
  if (fallbackMessage) return fallbackMessage;
  return "Unhandled exception";
}

function choosePreferredErrorHeadline(...candidates: Array<string | null | undefined>) {
  const isGeneric = (value?: string | null) => {
    const normalized = value?.trim().toLowerCase();
    return !normalized ||
      normalized === "unhandled exception" ||
      normalized === "unknown runtime error" ||
      normalized === "unknown error" ||
      normalized === "runtime error" ||
      normalized === "exception" ||
      normalized === "error";
  };

  for (const candidate of candidates) {
    const normalized = candidate?.trim();
    if (normalized && !isGeneric(normalized)) return normalized;
  }

  for (const candidate of candidates) {
    const normalized = candidate?.trim();
    if (normalized) return normalized;
  }

  return "Unhandled exception";
}

function errorTypeToFix(issue: string): string | null {
  const key = issue.toLowerCase();
  if (key.includes('no_artifact_loaded') || key.includes('no artifact')) {
    return 'Function has no deployed artifact. Run `flux deploy` to upload a build, then retry.';
  }
  if (key.includes('referenceerror') || key.includes('is not defined')) {
    return 'A variable or import is used before it is defined. Check spelling, import paths, and initialization order.';
  }
  if (key.includes('typeerror') || key.includes('is not a function') || key.includes('cannot read')) {
    return 'A value is used where a different type is expected. Add null/undefined guards or validate incoming data shape.';
  }
  if (key.includes('syntaxerror')) {
    return 'The function source contains a syntax error. Check for unbalanced brackets or TypeScript type mismatches.';
  }
  if (key.includes('timeout') || key.includes('timed out')) {
    return 'Execution exceeded the timeout limit. Reduce blocking I/O or increase the timeout in Function Settings.';
  }
  if (key.includes('unhandled exception') || key.includes('unknown runtime error') || key.includes('unknown error')) {
    return 'Wrap your handler in try/catch to surface the real error type and message.';
  }
  return null;
}

function confidenceLabel(confidence?: number) {
  if ((confidence ?? 0) >= 0.85) return "High";
  if ((confidence ?? 0) >= 0.65) return "Medium";
  return "Low";
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function compactIssueLabel(title: string, errorSource?: string | null): string {
  const raw = title.trim();
  const msg = raw.toLowerCase();
  if (msg.includes("fetch failed") || msg.includes("failed to fetch")) {
    const urlMatch = raw.match(/https?:\/\/([^/\s:]+)/);
    const domain = urlMatch ? urlMatch[1] : null;
    const hint = msg.includes("dns") || msg.includes("resolve") ? " (DNS failed)"
      : msg.includes("timeout") ? " (timeout)"
      : msg.includes("refused") || msg.includes("econnrefused") ? " (connection refused)"
      : msg.includes("certificate") || msg.includes("ssl") || msg.includes("tls") ? " (TLS error)"
      : "";
    return domain ? `fetch → ${domain}${hint}` : `fetch failed${hint}`;
  }
  if (msg.includes("dns") || (msg.includes("resolve") && !msg.includes("promise"))) return "DNS lookup failed";
  if (msg.includes("timeout")) return "Request timed out";
  if (msg.includes("connection refused") || msg.includes("econnrefused")) return "Connection refused";
  if (msg.includes("certificate") || (msg.includes("ssl") && !msg.includes("ssl_")) || msg.includes(" tls ")) return "TLS / certificate error";
  const namedErr = raw.match(/^(ReferenceError|TypeError|SyntaxError|RangeError|URIError|EvalError):\s*(.+)/);
  if (namedErr) {
    const short = namedErr[2].length > 60 ? namedErr[2].slice(0, 60) + "…" : namedErr[2];
    const src = errorSource === "user_code" ? " (user code)" : errorSource === "platform_runtime" ? " (runtime)" : "";
    return `${namedErr[1]}: ${short}${src}`;
  }
  return raw.length > 80 ? raw.slice(0, 80) + "…" : raw;
}

function isInternalFrame(file: string): boolean {
  return file.includes('ext:') || file.includes('deno:') || file.includes('node:') ||
    file.includes('internal/') || file.startsWith('flux:');
}

type ErrorClass = 'infra' | 'external' | 'runtime' | 'user';

const ERROR_CLASS_META: Record<ErrorClass, {
  label: string; icon: string;
  color: string; bg: string; border: string; dimColor: string;
  description: string;
}> = {
  infra:    { label: 'Infra Failure',    icon: '⚙️', color: 'text-orange-400', dimColor: 'text-orange-400/60', bg: 'bg-orange-950/20', border: 'border-orange-800/50', description: 'Deployment or artifact issue' },
  external: { label: 'External Failure', icon: '🌐', color: 'text-blue-400',   dimColor: 'text-blue-400/60',   bg: 'bg-blue-950/20',   border: 'border-blue-800/50',   description: 'Outside dependency failed' },
  runtime:  { label: 'Runtime Error',    icon: '⚡',  color: 'text-red-400',    dimColor: 'text-red-400/60',    bg: 'bg-red-950/20',    border: 'border-red-800/50',    description: 'JavaScript engine error' },
  user:     { label: 'User Code Error',  icon: '💥', color: 'text-yellow-400', dimColor: 'text-yellow-400/60', bg: 'bg-yellow-950/20', border: 'border-yellow-800/50', description: 'Thrown by your code' },
};

// Priority order for cause chains: infra → external → runtime → user
const CLASS_ORDER: ErrorClass[] = ['infra', 'external', 'runtime', 'user'];

function classifyError(title: string, errorSource?: string | null, errorType?: string | null): ErrorClass {
  const t = title.toLowerCase();
  const type = (errorType ?? '').toLowerCase();
  const src = errorSource ?? '';
  if (type.includes('no_artifact') || t.includes('no_artifact') || src.includes('executor') || t.includes('boot failed')) return 'infra';
  if (t.includes('fetch failed') || t.includes('failed to fetch') || t.includes('dns') ||
      t.includes('connection refused') || t.includes('econnrefused') || t.includes('timeout') ||
      t.includes('certificate') || t.includes('tls') || t.includes('ssl') ||
      src === 'platform_runtime') return 'external';
  if (src === 'user_code') return 'user';
  return 'runtime';
}

// Each error class is an independent failure pattern. Two errors are independent
// unless they appear in the SAME execution's stack — and since top_issues are
// already per-fingerprint, we treat each class as its own failure mode.
// Sort by total hits so the most impactful pattern comes first.
function buildFailureClusters(issues: FunctionStatsResult['top_issues']): Array<{
  cls: ErrorClass;
  totalHits: number;
  issues: FunctionStatsResult['top_issues'];
}> {
  return CLASS_ORDER
    .map(cls => {
      const clsIssues = issues.filter(iss => classifyError(iss.title, iss.error_source, iss.error_type) === cls);
      return { cls, totalHits: clsIssues.reduce((s, i) => s + i.count, 0), issues: clsIssues };
    })
    .filter(g => g.issues.length > 0)
    .sort((a, b) => b.totalHits - a.totalHits);
}

function parseStackFrames(stack?: string | null) {
  if (!stack) return [];
  return stack.split('\n')
    .filter(line => line.trim().startsWith('at '))
    .map(line => {
      const clean = line.trim().replace(/^at\s+/, '');
      const full = clean.match(/^(.+?)\s+\((.+?):(\d+):(\d+)\)$/);
      if (full) return { fn: full[1], file: full[2], line: full[3], col: full[4] };
      const bare = clean.match(/^(.+?):(\d+):(\d+)$/);
      if (bare) return { fn: '<anonymous>', file: bare[1], line: bare[2], col: bare[3] };
      return null;
    })
    .filter(Boolean) as { fn: string; file: string; line: string; col: string }[];
}

function frameLabel(frame?: { fn?: string; file: string; line: string | number; col?: string | number } | null, short = true): string | null {
  if (!frame) return null;
  const file = short ? (frame.file.split('/').pop() ?? frame.file) : frame.file;
  // Short form: file:line only. Long form: file:line:col.
  const col = !short && frame.col != null && Number(frame.col) > 0 ? `:${frame.col}` : '';
  return `${file}:${frame.line}${col}`;
}

function topUserFrame(stack?: string | null) {
  return parseStackFrames(stack).find(f => !isInternalFrame(f.file)) ?? null;
}

export default function FunctionDetail({ params }: { params: Promise<{ id: string, func_id: string }> }) {
  const { id, func_id } = use(params);
  const api = useFluxApi(id);
  const [data, setData] = useState<Function | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [statsData, setStatsData] = useState<FunctionStatsResult | null>(null);
  const [deploymentList, setDeploymentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExecId, setSelectedExecId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [anomalyExpanded, setAnomalyExpanded] = useState(false);
  const [execPage, setExecPage] = useState(0);
  const [activatingDeploy, setActivatingDeploy] = useState<string | null>(null);
  const [confirmDeploy, setConfirmDeploy] = useState<string | null>(null);

  useEffect(() => { setExecPage(0); }, [filter]);

  const loadData = async () => {
    if (!api.ready) return;

    try {
      const [func, execs, st, deps] = await Promise.all([
        api.getFunction(func_id),
        api.getFunctionExecutions(func_id),
        api.getFunctionStats(func_id),
        api.getDeployments(func_id),
      ]);
      setData(func);
      setExecutions(execs);
      setStatsData(st);
      setDeploymentList(deps);
    } catch (err) {
      console.error("Failed to load function details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (api.ready) {
        api.getFunctionExecutions(func_id).then(setExecutions).catch(console.error);
        api.getFunctionStats(func_id).then(setStatsData).catch(console.error);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [func_id, api]);

  if (!data) return <div className="animate-pulse text-sm font-mono text-neutral-500">Loading function orchestration...</div>;

  const latestDeployment = deploymentList[0] ?? null;
  const prevDeployment = deploymentList[1] ?? null;
  const bootFailed = latestDeployment?.status === 'boot_failed';

  // Deployment diff — compare fail rates across the two most recent deploys
  const execsByDeploy = executions.reduce<Record<string, Execution[]>>((acc, e) => {
    const key = e.code_sha ?? '__unknown__';
    (acc[key] ??= []).push(e);
    return acc;
  }, {});
  const deploySlice = (sha: string | null | undefined) => {
    if (!sha) return null;
    const group = execsByDeploy[sha] ?? [];
    const total = group.length;
    const errors = group.filter(e => e.status !== 'ok').length;
    return { total, errors, rate: total > 0 ? errors / total : 0, execs: group };
  };
  const latestSlice = deploySlice(latestDeployment?.artifact_id);
  const prevSlice = deploySlice(prevDeployment?.artifact_id);
  const isRegression = !!(latestSlice && prevSlice && latestSlice.rate > 0.1 && prevSlice.rate < 0.1);
  const deployVersionLabel = deploymentList.length > 0 ? `v${deploymentList.length}` : null;
  // First failure after latest deploy
  const firstFailAfterDeploy = latestSlice
    ? [...latestSlice.execs]
        .filter(e => e.status !== 'ok' && e.started_at)
        .sort((a, b) => new Date(a.started_at!).getTime() - new Date(b.started_at!).getTime())[0] ?? null
    : null;
  const deployedAt = latestDeployment ? new Date(latestDeployment.created_at).getTime() : null;
  const firstFailDelaySec = (firstFailAfterDeploy?.started_at && deployedAt)
    ? Math.max(0, Math.floor((new Date(firstFailAfterDeploy.started_at).getTime() - deployedAt) / 1000))
    : null;
  // Most-hit failing path in latest deploy
  const latestFailPaths = (latestSlice?.execs ?? []).filter(e => e.status !== 'ok').map(e => e.path);
  const pathCounts = latestFailPaths.reduce<Record<string, number>>((acc, p) => { acc[p] = (acc[p] ?? 0) + 1; return acc; }, {});
  const topFailPath = Object.entries(pathCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  // Map artifact_id → version metadata for version-aware cluster display
  const deployVersionMap = deploymentList.reduce<Record<string, { label: string; isCurrent: boolean; isPrev: boolean; createdAt: string }>>((acc, dep, i) => {
    if (dep.artifact_id) {
      acc[dep.artifact_id] = { label: dep.artifact_id.slice(0, 7), isCurrent: i === 0, isPrev: i === 1, createdAt: dep.created_at };
    }
    return acc;
  }, {});
  // Resolve version for an issue: try direct sha match, then fall back to time window
  const resolveIssueVersion = (issue: { code_sha?: string | null; first_seen?: string | null }) => {
    if (issue.code_sha && deployVersionMap[issue.code_sha]) return deployVersionMap[issue.code_sha];
    if (!issue.first_seen || deploymentList.length === 0) return null;
    const t = new Date(issue.first_seen).getTime();
    for (let i = 0; i < deploymentList.length; i++) {
      const dep = deploymentList[i];
      const depAt = new Date(dep.created_at).getTime();
      const nextAt = i > 0 ? new Date(deploymentList[i - 1].created_at).getTime() : Infinity;
      if (t >= depAt && t < nextAt) {
        return { label: dep.artifact_id?.slice(0, 7) ?? dep.artifact_id, isCurrent: i === 0, isPrev: i === 1, createdAt: dep.created_at };
      }
    }
    const oldest = deploymentList[deploymentList.length - 1];
    return oldest ? { label: oldest.artifact_id?.slice(0, 7) ?? oldest.artifact_id, isCurrent: false, isPrev: deploymentList.length === 2, createdAt: oldest.created_at } : null;
  };

  // Verification thresholds: how many executions in the current deploy before we trust "not seen"
  const VERIFIED_EXEC_MIN = 20;
  const VERIFIED_EXEC_HIGH = 50;
  type VerifyState = 'active' | 'unverified' | 'verified_resolved';
  const verifyClusterState = (cluster: ReturnType<typeof buildFailureClusters>[number]): {
    state: VerifyState; confidence: 'high' | 'medium' | 'low';
    execCount: number; errorCount: number; failureRate: number;
    reason: string; isDeterministic: boolean;
  } => {
    const activeInCurrentDeploy = cluster.issues.some(i => (i as any).active_in_current_deploy === true);
    const execCount = latestSlice?.total ?? 0;
    const currentErrors = latestSlice?.errors ?? 0;
    const failureRate = execCount > 0 ? Math.round((currentErrors / execCount) * 100) : 0;
    // Deterministic: consistent high failure rate (≥80%) with enough executions to trust
    const isDeterministic = execCount >= 5 && failureRate >= 80;
    if (activeInCurrentDeploy) {
      const reason = isDeterministic
        ? `Deterministic — fails ${failureRate}% of the time across ${execCount} exec${execCount !== 1 ? 's' : ''}`
        : `Reproducible in current deploy · ${execCount} exec${execCount !== 1 ? 's' : ''}, ${failureRate}% failure rate`;
      return { state: 'active', confidence: 'high', execCount, errorCount: currentErrors, failureRate, reason, isDeterministic };
    }
    if (currentErrors > 0) {
      const reason = isDeterministic
        ? `Deterministic — fails ${failureRate}% of the time across ${execCount} exec${execCount !== 1 ? 's' : ''}`
        : `Reproducible in current deploy · ${execCount} exec${execCount !== 1 ? 's' : ''}, ${failureRate}% failure rate`;
      return { state: 'active', confidence: 'medium', execCount, errorCount: currentErrors, failureRate, reason, isDeterministic };
    }
    if (execCount >= VERIFIED_EXEC_HIGH)
      return { state: 'verified_resolved', confidence: 'high', execCount, errorCount: 0, failureRate: 0,
        reason: `Not reproduced across ${execCount} executions in current deploy`, isDeterministic: false };
    if (execCount >= VERIFIED_EXEC_MIN)
      return { state: 'verified_resolved', confidence: 'medium', execCount, errorCount: 0, failureRate: 0,
        reason: `Not reproduced across ${execCount} executions — approaching confidence threshold`, isDeterministic: false };
    return { state: 'unverified', confidence: 'low', execCount, errorCount: 0, failureRate: 0,
      reason: `Only ${execCount} of ${VERIFIED_EXEC_MIN} executions needed to verify`, isDeterministic: false };
  };

  const st = statsData?.stats;
  const stats = [
    { name: "Executions", value: st?.total_execs || 0, icon: Activity as LucideIcon },
    { name: "Error Rate", value: `${(st?.total_execs ?? 0) > 0 ? (((st?.errors ?? 0) / (st?.total_execs ?? 1)) * 100).toFixed(1) : 0}%`, icon: AlertCircle as LucideIcon, color: (st?.errors ?? 0) > 0 ? "text-red-500" : "text-neutral-500" },
    { name: "p50 Latency", value: `${Math.round(st?.p50 || 0)}ms`, icon: Clock as LucideIcon },
    { 
      name: "p95 Latency", 
      value: `${Math.round(st?.p95 || 0)}ms`, 
      icon: Clock as LucideIcon,
      subValue: st?.p95_delta && st.p95_delta !== 0 ? `${st.p95_delta > 0 ? '↑' : '↓'} ${Math.abs(Math.round(st.p95_delta))}ms vs baseline` : undefined,
      subColor: (st?.p95_delta ?? 0) > 0 ? "text-red-500" : "text-green-500"
    },
    { name: "p99 Latency", value: `${Math.round(st?.p99 || 0)}ms`, icon: Clock as LucideIcon },
  ];
  const activeIssue = statsData?.root_cause
    ? choosePreferredErrorHeadline(
        statsData.root_cause.issue,
        statsData.root_cause.latest_failure?.error,
      )
    : null;
  const isGenericIssue = !activeIssue ||
    activeIssue.trim().toLowerCase() === "unhandled exception" ||
    activeIssue.trim().toLowerCase() === "unknown runtime error" ||
    activeIssue.trim().toLowerCase() === "unknown error";
  const anomalySuggestion = statsData?.root_cause?.suggestion &&
      !statsData.root_cause.suggestion.includes("Unknown runtime error") &&
      !statsData.root_cause.suggestion.includes("Unhandled exception detected: Unhandled exception")
    ? statsData.root_cause.suggestion
    : statsData?.root_cause
      ? (activeIssue ? errorTypeToFix(activeIssue) : null) ??
        (isGenericIssue
          ? "Wrap the handler in try/catch so the real error type and message are captured."
          : `Unhandled exception detected: ${activeIssue}. Remove or handle this throw to allow execution to complete.`)
      : null;
  const confidenceText = confidenceLabel(statsData?.root_cause?.confidence);

  return (
    <div className="space-y-10 pb-20">
      <header className="flex justify-between items-start border-b border-neutral-900 pb-8">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
             <div className="p-1.5 bg-blue-600/10 border border-blue-600/20 rounded">
                <Zap className="w-5 h-5 text-blue-500" />
             </div>
             <h2 className="text-3xl font-bold text-white tracking-tight">{data.name}</h2>
             {latestDeployment?.artifact_id && (
               <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded border ${
                 bootFailed ? 'text-red-400 border-red-900/60 bg-red-950/30'
                 : isRegression ? 'text-amber-400 border-amber-800/50 bg-amber-950/20'
                 : 'text-neutral-500 border-neutral-800 bg-neutral-900'
               }`} title={`Artifact: ${latestDeployment.artifact_id}`}>
                 <GitCommit className="w-3 h-3" />
                 {latestDeployment.artifact_id.slice(0, 7)}
                 {bootFailed && <span className="text-red-500 font-bold ml-0.5">!</span>}
               </span>
             )}
             {isRegression && (
               <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 px-1.5 py-0.5 rounded border border-amber-800/50 bg-amber-950/20">
                 <AlertTriangle className="w-3 h-3" /> broke after deploy
               </span>
             )}
          </div>
          <p className="text-neutral-500 font-mono text-sm mt-3 flex items-center gap-4">
            <span>id: {data.id}</span>
            <span className="w-1.5 h-1.5 bg-neutral-800 rounded-full" />
            <span className={`${statsData?.health?.severity === 'critical' ? 'text-red-500' : statsData?.health?.severity === 'warning' ? 'text-yellow-500' : 'text-green-500'} font-bold flex items-center gap-1.5`}>
               <span className={`w-1.5 h-1.5 rounded-full ${statsData?.health?.severity === 'critical' ? 'bg-red-500 animate-pulse' : statsData?.health?.severity === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}`} />
               {statsData?.health?.message || 'Deployed'}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-md text-sm font-medium hover:border-neutral-700 transition">
            <Play className="w-4 h-4" />
            Run Test
          </button>
          <button className="bg-neutral-100 text-black px-4 py-1.5 rounded-md font-semibold text-sm hover:bg-neutral-300 transition">Logs</button>
        </div>
      </header>

      {/* What Changed panel — only shown when we have 2+ deployments with execution data */}
      {latestDeployment && (latestSlice || prevSlice) && (
        <div className={`rounded-xl border px-5 py-4 ${
          isRegression ? 'bg-amber-950/10 border-amber-800/40' : 'bg-[#111] border-neutral-800'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className={`w-3.5 h-3.5 ${isRegression ? 'text-amber-400' : 'text-neutral-600'}`} />
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">What Changed</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-[9px] text-neutral-600 uppercase font-bold mb-0.5">Latest Deploy</div>
              <div className="font-mono text-xs text-neutral-200">{latestDeployment.artifact_id.slice(0, 7)}</div>
              <div className="text-[10px] text-neutral-600 mt-0.5">{timeAgo(latestDeployment.created_at)}</div>
            </div>
            {latestSlice && (
              <div>
                <div className="text-[9px] text-neutral-600 uppercase font-bold mb-0.5">Current version</div>
                <div className={`font-mono text-xs font-bold ${latestSlice.rate > 0.1 ? 'text-red-400' : 'text-emerald-500'}`}>
                  {latestSlice.errors === 0 ? '✓ 0 failures' : `❌ ${latestSlice.errors}/${latestSlice.total} failed`}
                </div>
                {latestSlice.rate > 0 && latestSlice.total > 0 && (
                  <div className="text-[10px] text-neutral-600">{Math.round(latestSlice.rate * 100)}% error rate</div>
                )}
              </div>
            )}
            {prevSlice && prevDeployment && (
              <div>
                <div className="text-[9px] text-neutral-600 uppercase font-bold mb-0.5">Previous ({prevDeployment.artifact_id.slice(0, 7)})</div>
                <div className={`font-mono text-xs font-bold ${prevSlice.rate > 0.1 ? 'text-red-400' : 'text-emerald-600'}`}>
                  {prevSlice.errors === 0 ? '✓ healthy' : `${prevSlice.errors}/${prevSlice.total} failed`}
                </div>
              </div>
            )}
            {firstFailDelaySec !== null && (
              <div>
                <div className="text-[9px] text-neutral-600 uppercase font-bold mb-0.5">First failure</div>
                <div className="font-mono text-xs text-neutral-300">
                  {firstFailDelaySec < 60 ? `${firstFailDelaySec}s` : `${Math.floor(firstFailDelaySec / 60)}m`} after deploy
                </div>
                {topFailPath && <div className="text-[10px] text-neutral-600 font-mono mt-0.5 truncate" title={topFailPath}>{topFailPath}</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {bootFailed && (
        <div className="bg-red-950/40 border border-red-900/60 rounded-xl p-5 flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-bold text-red-300">Deployment failed — function cannot serve requests</p>
            <p className="text-xs font-mono text-red-400/80 break-words">{latestDeployment.error_message || 'Boot error (no detail available)'}</p>
            {latestDeployment.error_type && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-500/60">{latestDeployment.error_type.replace(/_/g, ' ')}</p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        {stats.map(s => (
          <div key={s.name} className="bg-[#111] border border-neutral-800 p-6 rounded-xl">
             <div className="flex items-center justify-between mb-4">
               <s.icon className={`w-4 h-4 ${s.color || "text-neutral-500"}`} />
               <span className="text-[10px] uppercase font-bold text-neutral-600 tracking-widest">{s.name}</span>
             </div>
             <div className="text-3xl font-bold font-mono text-neutral-100">{s.value}</div>
             {s.subValue && (
               <div className={`text-[10px] font-bold mt-1 ${s.subColor}`}>{s.subValue}</div>
             )}
          </div>
        ))}
      </div>

      {statsData?.root_cause && (() => {
        const _clusters = buildFailureClusters(statsData.top_issues ?? []);
        // Compute verification state per cluster
        const _clusterVerify = _clusters.map(c => verifyClusterState(c));
        const allHistorical = _clusters.length > 0 && latestDeployment?.artifact_id != null && _clusterVerify.every(v => v.state !== 'active');
        const allVerified = allHistorical && _clusterVerify.every(v => v.state === 'verified_resolved');
        // Panel colour: red = active, amber = unverified, neutral = verified resolved
        const panelTheme = !allHistorical ? 'red' : allVerified ? 'green' : 'amber';
        return (
        <div className={`rounded-xl overflow-hidden shadow-2xl border ${
          panelTheme === 'green' ? 'bg-gradient-to-br from-neutral-950 to-black border-neutral-800'
          : panelTheme === 'amber' ? 'bg-gradient-to-br from-amber-950/20 to-black border-amber-900/40'
          : 'bg-gradient-to-br from-red-950/40 to-black border-red-900/50'
        }`}>
          {/* Collapsed headline — always visible */}
          <button
            onClick={() => setAnomalyExpanded(v => !v)}
            className={`w-full flex items-center justify-between gap-4 px-6 py-4 transition-colors text-left group ${
              panelTheme === 'green' ? 'hover:bg-neutral-900/40'
              : panelTheme === 'amber' ? 'hover:bg-amber-950/20'
              : 'hover:bg-red-950/20'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {panelTheme === 'green' ? (
                <span className="bg-emerald-900/60 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5 uppercase tracking-wider border border-emerald-800/50 shrink-0">
                  ✓ Verified Fixed
                </span>
              ) : panelTheme === 'amber' ? (
                <span className="bg-amber-900/40 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5 uppercase tracking-wider border border-amber-800/50 shrink-0">
                  ○ Unverified
                </span>
              ) : (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5 uppercase tracking-wider shadow-[0_0_10px_theme(colors.red.500/50)] animate-pulse shrink-0">
                  <Zap className="w-3 h-3" />
                  Active Anomaly
                </span>
              )}
              {/* Semantic headline derived from root cluster */}
              {(() => {
                const clusters = _clusters;
                const top = clusters[0];
                if (!top) {
                  return <span className={`text-base font-bold font-mono truncate ${panelTheme !== 'red' ? 'text-neutral-400' : 'text-red-100'}`}>{activeIssue}</span>;
                }
                const topMeta = ERROR_CLASS_META[top.cls];
                const topLabel = compactIssueLabel(top.issues[0].title, top.issues[0].error_source);
                const totalFails = (statsData.top_issues ?? []).reduce((s, i) => s + i.count, 0);
                const errorPct = (st?.total_execs ?? 0) > 0
                  ? `${Math.round((totalFails / (st?.total_execs ?? 1)) * 100)}%`
                  : null;
                return (
                  <>
                    <span className={`text-[10px] font-black uppercase tracking-wider shrink-0 ${
                      panelTheme !== 'red' ? 'text-neutral-600' : topMeta.color
                    }`}>
                      {topMeta.label}
                    </span>
                    <span className={`text-sm font-bold font-mono truncate ${
                      panelTheme !== 'red' ? 'text-neutral-400 line-through decoration-neutral-700' : 'text-red-100'
                    }`}>
                      {topLabel}
                      {errorPct && panelTheme === 'red' && <span className="text-red-400/70 font-normal"> · affecting {errorPct}</span>}
                      {errorPct && panelTheme !== 'red' && <span className="text-neutral-600 font-normal no-underline"> · previously affected {errorPct}</span>}
                    </span>
                    {clusters.length > 1 && (
                      <span className="text-[9px] font-bold text-neutral-600 shrink-0 border border-neutral-800 px-1.5 py-0.5 rounded">
                        {clusters.length} failure types
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {statsData.root_cause.impact && panelTheme === 'red' && (
                <span className="text-[10px] font-mono text-red-400">{statsData.root_cause.impact}</span>
              )}
              {anomalyExpanded
                ? <ChevronUp className={`w-4 h-4 ${panelTheme === 'red' ? 'text-red-400' : panelTheme === 'amber' ? 'text-amber-500' : 'text-neutral-500'}`} />
                : <ChevronDown className={`w-4 h-4 text-neutral-600 transition-colors ${panelTheme === 'red' ? 'group-hover:text-red-400' : panelTheme === 'amber' ? 'group-hover:text-amber-400' : 'group-hover:text-neutral-400'}`} />}
            </div>
          </button>

          {/* Expanded detail */}
          {anomalyExpanded && (
            <div className="px-6 pb-8 pt-2 relative overflow-hidden">
               <div className={`absolute top-0 left-0 w-1 h-full ${
                 panelTheme === 'green'
                   ? 'bg-emerald-700 shadow-[0_0_12px_theme(colors.emerald.700)]'
                   : panelTheme === 'amber'
                   ? 'bg-amber-600 shadow-[0_0_12px_theme(colors.amber.600)]'
                   : 'bg-red-500 shadow-[0_0_20px_theme(colors.red.500)]'
               }`} />
               <div className="relative z-10 flex flex-col xl:flex-row gap-8 items-start justify-between">
                  <div className="space-y-5 flex-1">
                     {filter && (
                       <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                          Filtering Active
                       </span>
                     )}

                     {/* Failure Patterns — independent, one card per error class, no causal arrows */}
                     {(() => {
                       const clusters = _clusters;
                       const clusterVerify = _clusterVerify;
                       if (clusters.length === 0) return null;
                       const totalFails = clusters.reduce((s, c) => s + c.totalHits, 0);
                       const hasUserErrors = clusters.some(c => c.cls === 'user');
                       const topCluster = clusters[0];
                       const clusterDomShas = clusters.map(c => c.issues.slice().sort((a, b) => b.count - a.count)[0]?.code_sha ?? null);
                       const uniqueDeployShas = new Set(clusterDomShas.filter(Boolean));
                       const isCrossVersion = uniqueDeployShas.size > 1;

                       return (
                         <div className="space-y-3">
                           {/* Current version status strip */}
                           {(() => {
                             const currentLabel = deployVersionMap[latestDeployment?.artifact_id ?? '']?.label ?? latestDeployment?.artifact_id?.slice(0, 7) ?? null;
                             if (!currentLabel) return null;
                             const currentCluster = clusters.find((c, ci) => _clusterVerify[ci]?.state === 'active');
                             const unverifiedCount = _clusterVerify.filter(v => v.state === 'unverified').length;
                             return (
                               <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-mono ${
                                 currentCluster
                                   ? 'bg-red-950/20 border-red-900/40 text-red-400/80'
                                   : 'bg-emerald-950/20 border-emerald-900/40 text-emerald-500/70'
                               }`}>
                                 <span className="font-black uppercase tracking-wider">{currentLabel}</span>
                                 <span className="text-neutral-700">· current deploy</span>
                                 {currentCluster ? (
                                   <span className="ml-auto flex items-center gap-2 font-mono">
                                     <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shrink-0" />
                                     {(() => {
                                       const ci = clusters.indexOf(currentCluster);
                                       const v = _clusterVerify[ci];
                                       return v?.isDeterministic
                                         ? <span className="text-red-400 font-bold">Deterministic failure · {v.failureRate}%</span>
                                         : <span>Reproducible · {v?.failureRate ?? 0}% · {v?.execCount ?? 0} exec{(v?.execCount ?? 0) !== 1 ? 's' : ''}</span>;
                                     })()}
                                   </span>
                                 ) : unverifiedCount > 0 ? (
                                   <span className="ml-auto text-amber-500/70">○ {unverifiedCount} unverified — awaiting traffic</span>
                                 ) : (
                                   <span className="ml-auto">✓ no failures detected</span>
                                 )}
                               </div>
                             );
                           })()}
                           <div className="flex items-center gap-2 flex-wrap">
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                               {clusters.length} independent failure mode{clusters.length > 1 ? 's' : ''} detected
                               {isCrossVersion && <span className="normal-case font-semibold text-neutral-700"> · across {uniqueDeployShas.size} deployments</span>}
                             </span>
                             {clusters.length > 1 && (
                               <span className="text-[9px] font-bold text-neutral-700 border border-neutral-800 px-1.5 py-0.5 rounded">
                                 ⚠ Independent failures (no shared root cause)
                               </span>
                             )}
                           </div>
                           {clusters.map((cluster, ci) => {
                             const meta = ERROR_CLASS_META[cluster.cls];
                             const pct = totalFails > 0 ? Math.round((cluster.totalHits / totalFails) * 100) : 0;
                             const isMostImpactful = ci === 0 && clusters.length > 1;
                             const verify = clusterVerify[ci];
                             const domIssue = cluster.issues.slice().sort((a, b) => b.count - a.count)[0];
                             const ver = domIssue ? resolveIssueVersion(domIssue) : null;
                             const deployLabel = ver?.isCurrent ? 'current' : ver?.isPrev ? 'prev' : 'older';
                             return (
                               <div key={cluster.cls} className={`rounded-lg border px-3 py-2.5 ${meta.bg} ${meta.border}`}>
                                 {/* ── Top bar: class + badge + sha + age + hits */}
                                 <div className="flex items-center gap-1.5 mb-1.5">
                                   <span className={`text-[10px] font-black uppercase tracking-wider shrink-0 ${meta.color}`}>
                                     {meta.icon} {meta.label}
                                   </span>
                                   {isMostImpactful && (
                                     <span className={`text-[8px] font-black uppercase border px-1 py-0.5 rounded leading-none shrink-0 ${meta.color} ${meta.border}`}>
                                       ▲ Fix first
                                     </span>
                                   )}
                                   {ver && (
                                     <span className={`font-mono text-[9px] px-1 py-px rounded border shrink-0 ${
                                       ver.isCurrent ? 'text-emerald-400 border-emerald-900/50 bg-emerald-950/20'
                                       : ver.isPrev ? 'text-neutral-400 border-neutral-700 bg-neutral-900/40'
                                       : 'text-neutral-600 border-neutral-800 bg-transparent'
                                     }`}>
                                       {ver.label}
                                     </span>
                                   )}
                                   <span className="text-[9px] text-neutral-700 shrink-0">{deployLabel}{ver?.createdAt ? ` · ${timeAgo(ver.createdAt)}` : ''}</span>
                                   <span className={`text-[9px] font-bold ml-auto shrink-0 ${meta.dimColor}`}>
                                     {cluster.totalHits} hit{cluster.totalHits > 1 ? 's' : ''} · {pct}%
                                   </span>
                                 </div>
                                 {/* ── Issue rows */}
                                 {cluster.issues.map((iss, ii) => {
                                   const issFrame = topUserFrame(iss.sample_stack);
                                   const issLoc = frameLabel(issFrame);
                                   const issLabel = compactIssueLabel(iss.title, iss.error_source);
                                   return (
                                     <div
                                       key={ii}
                                       onClick={() => setFilter(filter === iss.title ? null : iss.title)}
                                       className="flex items-center justify-between gap-3 cursor-pointer group/issue py-0.5"
                                     >
                                       <span
                                         className="font-mono text-[12px] truncate group-hover/issue:underline text-neutral-200"
                                         title={issLoc ? `${iss.title} → ${issLoc}` : iss.title}
                                       >
                                         {issLabel}
                                         {issLoc && <span className={`${meta.dimColor} font-normal`}> → {issLoc}</span>}
                                       </span>
                                       <span className="text-[10px] font-bold text-neutral-600 shrink-0">{iss.count}×</span>
                                     </div>
                                   );
                                 })}
                                 {/* ── Footer: consequence hint + verify state on one strip */}
                                 {(() => {
                                   const consequenceText =
                                     cluster.cls === 'infra' ? '→ no user code executed'
                                     : cluster.cls === 'external' ? '→ not handled · request failed'
                                     : cluster.cls === 'user' ? '→ explicitly thrown'
                                     : cluster.cls === 'runtime' ? '→ thrown or unhandled'
                                     : null;
                                   const te = Number(st?.total_execs ?? 0);
                                   const verifyNode = (() => {
                                     if (te <= 0) return null;
                                     if (verify.state === 'verified_resolved') {
                                       return (
                                         <span className="flex items-center gap-1 shrink-0">
                                           <span className={`font-bold ${verify.confidence === 'high' ? 'text-emerald-500' : 'text-emerald-600/70'}`}>✓ fixed</span>
                                           <span className={`px-1 rounded border ${verify.confidence === 'high' ? 'text-emerald-700 border-emerald-900/60 bg-emerald-950/20' : 'text-neutral-600 border-neutral-800'}`}>{verify.confidence}</span>
                                           <span className="text-neutral-700">· {verify.execCount} exec{verify.execCount !== 1 ? 's' : ''}</span>
                                         </span>
                                       );
                                     }
                                     if (verify.state === 'unverified') {
                                       return (
                                         <span className="flex items-center gap-1 shrink-0">
                                           <span className="text-amber-500/80 font-bold">○ unverified</span>
                                           <span className="text-neutral-700">· {verify.execCount}/{20} exec{verify.execCount !== 1 ? 's' : ''}</span>
                                         </span>
                                       );
                                     }
                                     // active
                                     const currentRate = Math.round((totalFails / te) * 100);
                                     const afterRate = Math.round(Math.max(0, (totalFails - cluster.totalHits) / te) * 100);
                                     return (
                                       <span className="flex items-center gap-1 shrink-0">
                                         <span className={`font-bold ${verify.isDeterministic ? 'text-red-400' : 'text-red-400/70'}`}>
                                           {verify.isDeterministic ? 'deterministic' : 'reproducible'}
                                         </span>
                                         <span className={`px-1 rounded border ${verify.confidence === 'high' ? 'text-red-600 border-red-900/50 bg-red-950/10' : 'text-neutral-500 border-neutral-800'}`}>{verify.confidence}</span>
                                         {currentRate !== afterRate && currentRate > 0 && (
                                           <span className="text-neutral-700">· {currentRate}%→<span className="text-emerald-500 font-bold">{afterRate}%</span></span>
                                         )}
                                       </span>
                                     );
                                   })();
                                   if (!consequenceText && !verifyNode) return null;
                                   return (
                                     <div className="mt-1.5 pt-1.5 border-t border-white/5 font-mono text-[9px] flex items-center gap-2 justify-between">
                                       {consequenceText && <span className="text-neutral-700">{consequenceText}</span>}
                                       {verifyNode}
                                     </div>
                                   );
                                 })()}
                               </div>
                             );
                           })}
                           {/* Suggested focus */}
                           {clusters.length > 1 && (
                             <div className="flex items-center gap-1.5 text-[9px] font-mono text-neutral-600 mt-0.5 px-1">
                               <Lightbulb className="w-2.5 h-2.5 text-blue-400/60 shrink-0" />
                               <span className="text-blue-400/70 font-bold">Fix first:</span>
                               <span className={`font-bold ${ERROR_CLASS_META[topCluster.cls].color}`}>{ERROR_CLASS_META[topCluster.cls].label}</span>
                               <span>— {Math.round((topCluster.totalHits / totalFails) * 100)}% of failures</span>
                             </div>
                           )}
                         </div>
                       );
                     })()}

                     {/* Latest Failure Snapshot */}
                     {statsData.root_cause.latest_failure && (
                        <div className="bg-black/40 border border-neutral-800/60 rounded-lg px-3 py-2 font-mono text-[10px]">
                           <div className="flex items-center gap-2 mb-1">
                             <Activity className="w-3 h-3 text-neutral-600 shrink-0" />
                             <span className="text-neutral-600 shrink-0">
                               {statsData.root_cause.latest_failure.time
                                 ? new Date(statsData.root_cause.latest_failure.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                 : 'N/A'}
                             </span>
                             <span className="text-neutral-700 shrink-0">{statsData.root_cause.latest_failure.duration}</span>
                             <button
                               onClick={(e) => { e.stopPropagation(); setSelectedExecId(statsData.root_cause!.latest_failure!.id); setIsDrawerOpen(true); }}
                               className="ml-auto text-blue-500 hover:text-blue-400 flex items-center gap-1 shrink-0 transition-colors"
                             >
                               trace <ArrowUpRight className="w-3 h-3" />
                             </button>
                           </div>
                           <div className="text-red-400 font-bold break-all leading-relaxed">
                             {statsData.root_cause.latest_failure.error || 'Unknown error'}
                             {(() => { const loc = frameLabel(topUserFrame(statsData.root_cause.sample_stack)); return loc ? <span className="text-red-400/60 font-normal"> · {loc}</span> : null; })()}
                           </div>
                        </div>
                     )}

                     {anomalySuggestion && (() => {
                        // Build structured action steps from the failure patterns
                        const clusters = buildFailureClusters(statsData.top_issues ?? []);
                        const steps: Array<{ label: string; hint: string; color: string }> = [];

                        const userCluster = clusters.find(c => c.cls === 'user');
                        const externalCluster = clusters.find(c => c.cls === 'external');
                        const infraCluster = clusters.find(c => c.cls === 'infra');
                        const runtimeCluster = clusters.find(c => c.cls === 'runtime');

                        // Order: most impactful first (clusters already sorted by totalHits)
                        for (const cluster of clusters) {
                          if (cluster.cls === 'user') {
                            const loc = frameLabel(topUserFrame(cluster.issues[0]?.sample_stack));
                            steps.push({
                              label: `Fix user error${loc ? ` (${loc})` : ''}`,
                              hint: `remove or guard the throw${loc ? ` at ${loc}` : ''}`,
                              color: 'text-yellow-400',
                            });
                          } else if (cluster.cls === 'external') {
                            const loc = frameLabel(topUserFrame(cluster.issues[0]?.sample_stack));
                            steps.push({
                              label: 'Handle external failures',
                              hint: `wrap fetch in try/catch${loc ? ` at ${loc}` : ''} and handle the error response`,
                              color: 'text-blue-400',
                            });
                          } else if (cluster.cls === 'infra') {
                            steps.push({
                              label: 'Fix deployment',
                              hint: 'run: flux deploy',
                              color: 'text-orange-400',
                            });
                          } else if (cluster.cls === 'runtime') {
                            const loc = frameLabel(topUserFrame(cluster.issues[0]?.sample_stack));
                            steps.push({
                              label: 'Fix runtime error',
                              hint: `add null checks or validate input${loc ? ` at ${loc}` : ''} before use`,
                              color: 'text-red-400',
                            });
                          }
                        }

                        if (steps.length === 0) return (
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3 text-xs text-blue-300 flex items-start gap-2 max-w-lg shadow-inner">
                            <Lightbulb className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-blue-400 block mb-0.5">Recommended Action</span>
                              {anomalySuggestion}
                            </div>
                          </div>
                        );

                        return (
                          <div className="flex items-start gap-2 border-t border-neutral-800/40 pt-2">
                            <Lightbulb className="w-2.5 h-2.5 text-blue-400/60 shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-1">
                              {steps.map((step, si) => (
                                <div key={si} className="flex items-start gap-1 font-mono text-[9px]">
                                  <span className="text-neutral-700 shrink-0">{si + 1}.</span>
                                  <div>
                                    <span className={`font-bold ${step.color}`}>{step.label}</span>
                                    <span className="text-neutral-700"> → {step.hint}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                     })()}
                  </div>
                  
                  <div className="flex flex-col gap-2.5 w-full xl:w-56 shrink-0 bg-black/40 px-4 py-3 rounded-lg border border-red-950/60 backdrop-blur-sm font-mono text-[10px]">
                     {/* Detection + Confidence */}
                     <div className="flex items-center justify-between">
                       <span className="text-neutral-600 uppercase tracking-wider text-[9px] font-bold">Detection</span>
                       <div className="flex items-center gap-1.5">
                         <span className="text-emerald-500 font-bold uppercase">At runtime</span>
                         {(() => { const f = topUserFrame(statsData.root_cause.sample_stack); return f ? <span className="text-red-400/70">{frameLabel(f)}</span> : null; })()}
                       </div>
                     </div>
                     <div className="flex items-start justify-between gap-2">
                       <span className="text-neutral-600 uppercase tracking-wider text-[9px] font-bold shrink-0">Confidence</span>
                       <div className="flex flex-col items-end gap-0.5">
                         <span className={`font-black uppercase text-[9px] ${
                           statsData.root_cause.confidence >= 0.85 ? 'text-emerald-500' :
                           statsData.root_cause.confidence >= 0.65 ? 'text-yellow-500' : 'text-neutral-500'
                         }`}>{confidenceText}</span>
                         {statsData.root_cause.confidence_reason && (
                           <span className="text-neutral-700 text-[9px] text-right leading-tight">{statsData.root_cause.confidence_reason}</span>
                         )}
                       </div>
                     </div>
                     <div className="border-t border-neutral-800/50 pt-2 flex items-center justify-between">
                       <span className="text-neutral-600 uppercase tracking-wider text-[9px] font-bold">Impact</span>
                       <span className="text-red-400 font-bold">{statsData.root_cause.impact}</span>
                     </div>
                     {statsData.impact_stats && (
                       <div className="flex items-center justify-between">
                         <span className="text-neutral-600 uppercase tracking-wider text-[9px] font-bold">Users</span>
                         <span className="text-neutral-300 font-bold">{statsData.impact_stats.unique_ips} IPs</span>
                       </div>
                     )}
                     {isRegression && (
                       <div className="border-t border-amber-900/30 pt-2">
                         <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">⚠ Regression</span>
                         {(() => {
                           const regressedIssue = statsData.top_issues?.[0];
                           const label = regressedIssue ? compactIssueLabel(regressedIssue.title, regressedIssue.error_source) : null;
                           return label ? <div className="text-neutral-700 mt-0.5 truncate">{label}</div> : null;
                         })()}
                       </div>
                     )}
                     <div className="border-t border-neutral-800/50 pt-2">
                       <span className="text-neutral-700">Started {new Date(statsData.root_cause.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>
        );
      })()}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-10">
          
          <section className="mb-10">
            <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Executions (24h)
            </h3>
            <div className="h-40 flex items-end gap-1 bg-[#111] border border-neutral-800 rounded-xl p-4">
              {statsData && statsData.timeseries && statsData.timeseries.length > 0 ? (() => {
                const maxTotal = Math.max(...statsData.timeseries.map(t => Number(t.total) || 0), 10);
                return statsData.timeseries.map((t, i) => {
                  const total = Number(t.total) || 0;
                  const errs = Number(t.errors) || 0;
                  const heightPct = Math.max(2, (total / maxTotal) * 100);
                  const errPct = total > 0 ? (errs / total) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col justify-end group relative h-full">
                      <div className="w-full bg-blue-500/20 rounded-t-sm hover:bg-blue-500/40 transition-colors relative flex flex-col justify-end" style={{ height: `${heightPct}%` }}>
                         {errs > 0 && (
                            <div className="w-full bg-red-500/80 rounded-t-sm" style={{ height: `${errPct}%` }} />
                         )}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-neutral-900 border border-neutral-700 text-xs text-white p-2 rounded pointer-events-none z-10 whitespace-nowrap shadow-xl">
                        <div className="font-bold text-neutral-400 mb-1">{new Date(t.hour).toLocaleString()}</div>
                        <div>Total: {total}</div>
                        {errs > 0 && <div className="text-red-400">Errors: {errs}</div>}
                      </div>
                    </div>
                  );
                });
              })() : (
                <div className="w-full h-full flex items-center justify-center text-neutral-600 font-mono text-sm italic">No data returned</div>
              )}
            </div>
          </section>

          {statsData?.span_breakdown && statsData.span_breakdown.length > 0 && (
            <section className="mb-10">
               <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-4 flex items-center gap-2">
                 <Clock className="w-4 h-4" />
                 Execution Breakdown (Avg)
               </h3>
               <div className="bg-[#111] border border-neutral-800 rounded-xl p-6">
                  <div className="flex h-4 w-full bg-neutral-900 rounded-full overflow-hidden mb-6">
                     {(() => {
                        const totalDur = statsData.span_breakdown!.reduce((acc, s) => acc + Number(s.avg_duration), 0);
                        const colors: Record<string, string> = { js: 'bg-blue-500', db: 'bg-purple-500', http: 'bg-orange-500', timeout: 'bg-red-500' };
                        return statsData.span_breakdown!.map((s, i) => (
                           <div 
                              key={i} 
                              className={`${colors[s.type] || 'bg-neutral-500'} h-full`} 
                              style={{ width: `${(Number(s.avg_duration) / totalDur) * 100}%` }}
                              title={`${s.type}: ${Math.round(Number(s.avg_duration))}ms`}
                           />
                        ));
                     })()}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {statsData.span_breakdown.map((s, i) => (
                        <div key={i} className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${
                              s.type === 'js' ? 'bg-blue-500' : 
                              s.type === 'db' ? 'bg-purple-500' : 
                              s.type === 'http' ? 'bg-orange-500' : 'bg-neutral-500'
                           }`} />
                           <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{s.type}</span>
                           <span className="text-xs font-mono text-neutral-200">{Math.round(Number(s.avg_duration))}ms</span>
                        </div>
                     ))}
                  </div>
               </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                 <Terminal className="w-4 h-4" />
                 Live Executions
               </h3>
               <div className="text-[10px] bg-green-900/20 text-green-500 border border-green-900/50 px-2 py-0.5 rounded-full font-bold animate-pulse">LIVE POLLING</div>
            </div>
            <div className="border border-neutral-900 rounded-xl overflow-hidden bg-[#0c0c0c] shadow-inner">
              <table className="w-full text-left text-[12px] font-mono">
                <thead className="bg-[#111] border-b border-neutral-800 text-neutral-600 text-[9px] uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Duration</th>
                    <th className="px-3 py-2">Type · Source</th>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2 pr-5 text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const PAGE_SIZE = 20;
                    const filteredExecs = (executions ?? []).filter((exec) => {
                      const headline = formatErrorHeadline(
                        exec.error_name,
                        exec.error_message,
                        exec.error,
                        exec.error_stack,
                      );
                      return !filter || headline.includes(filter) || exec.status.includes(filter);
                    });
                    const totalExecPages = Math.ceil(filteredExecs.length / PAGE_SIZE);
                    const pagedExecs = filteredExecs.slice(execPage * PAGE_SIZE, (execPage + 1) * PAGE_SIZE);
                    return (<>
                      {pagedExecs.map((exec) => (
                        <tr
                          key={exec.id}
                          onClick={() => { setSelectedExecId(exec.id); setIsDrawerOpen(true); }}
                          className="border-b border-neutral-900 last:border-0 hover:bg-neutral-900/40 transition-colors cursor-pointer group"
                        >
                          {/* ID + caller as tooltip */}
                          <td className="px-3 py-1.5 whitespace-nowrap">
                            <span
                              className="text-blue-500 group-hover:underline font-bold"
                              title={exec.client_ip || undefined}
                            >
                              {exec.id.slice(0, 8)}
                            </span>
                          </td>
                          {/* Status + error headline */}
                          <td className="px-3 py-1.5 max-w-[260px]">
                            <span className={`font-bold text-[11px] ${exec.status === 'ok' ? 'text-green-500' : 'text-red-500'}`}>{exec.status.toUpperCase()}</span>
                            {exec.status === 'error' && (() => {
                              const headline = formatErrorHeadline(exec.error_name, exec.error_message, exec.error, exec.error_stack);
                              const frame = topUserFrame(exec.error_stack);
                              const loc = frameLabel(frame);
                              return (
                                <div
                                  className="text-[9px] text-red-400/70 mt-0.5 truncate"
                                  title={loc ? `${headline} (${loc})` : headline}
                                >
                                  {headline}{loc ? <span className="text-red-400/50 font-bold"> ({loc})</span> : null}
                                </div>
                              );
                            })()}
                          </td>
                          {/* Duration */}
                          <td className="px-3 py-1.5 text-neutral-500 whitespace-nowrap">{exec.duration_ms}ms</td>
                          {/* Type + Source merged */}
                          <td className="px-3 py-1.5">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider bg-neutral-900 border border-neutral-800 px-1 py-px rounded">
                                {exec.error_type || 'default'}
                              </span>
                              {exec.error_source && (
                                <span className={`text-[9px] font-bold uppercase tracking-wider border px-1 py-px rounded ${
                                  exec.error_source === 'user_code' ? 'text-blue-400 border-blue-900/50 bg-blue-950/20' :
                                  exec.error_source?.startsWith('platform') ? 'text-orange-400 border-orange-900/50 bg-orange-950/20' :
                                  'text-neutral-500 border-neutral-800 bg-neutral-900/50'
                                }`}>
                                  {exec.error_source.replace(/_/g, ' ')}
                                </span>
                              )}
                            </div>
                          </td>
                          {/* Code SHA */}
                          <td className="px-3 py-1.5">
                            {exec.code_sha ? (() => {
                              const sha7 = exec.code_sha.slice(0, 7);
                              const ver = deployVersionMap[exec.code_sha];
                              return (
                                <span className={`text-[9px] px-1 py-px rounded border ${
                                  ver?.isCurrent ? 'text-emerald-400 border-emerald-900/50 bg-emerald-950/20'
                                  : ver?.isPrev ? 'text-neutral-400 border-neutral-700 bg-neutral-900/40'
                                  : 'text-neutral-600 border-neutral-800 bg-transparent'
                                }`}>{sha7}</span>
                              );
                            })() : <span className="text-neutral-700 text-[9px]">—</span>}
                          </td>
                          {/* Time */}
                          <td className="px-3 py-1.5 pr-5 text-right text-neutral-600 whitespace-nowrap text-[11px]">
                            {new Date(exec.started_at ?? new Date().toISOString()).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                      {executions.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-6 text-center text-neutral-700 italic underline-offset-4 decoration-neutral-800 decoration-dashed underline">Waiting for live data surge...</td></tr>
                      )}
                      {totalExecPages > 1 && (
                        <tr>
                          <td colSpan={6} className="border-t border-neutral-900 px-3 py-2">
                            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-600">
                              <span>{filteredExecs.length} execution{filteredExecs.length !== 1 ? 's' : ''}{filter ? ' (filtered)' : ''}</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  disabled={execPage === 0}
                                  onClick={(e) => { e.stopPropagation(); setExecPage(p => p - 1); }}
                                  className="px-1.5 py-0.5 rounded border border-neutral-800 disabled:opacity-30 hover:border-neutral-700 hover:text-neutral-400 transition-colors"
                                >←</button>
                                <span className="tabular-nums">{execPage + 1} / {totalExecPages}</span>
                                <button
                                  disabled={execPage >= totalExecPages - 1}
                                  onClick={(e) => { e.stopPropagation(); setExecPage(p => p + 1); }}
                                  className="px-1.5 py-0.5 rounded border border-neutral-800 disabled:opacity-30 hover:border-neutral-700 hover:text-neutral-400 transition-colors"
                                >→</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>);
                  })()}
                </tbody>
              </table>
            </div>
          </section>

          <section>
             <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-4 flex items-center gap-2">
               <Globe className="w-4 h-4" />
               Mapped Routes
             </h3>
              <div className="flex flex-col gap-2">
                 {data.routes?.map((r: Route) => (
                  <div key={r.id} className="bg-[#111] border border-neutral-800 px-4 py-3 rounded-lg flex items-center justify-between font-mono text-sm">
                    <div className="flex items-center gap-3">
                      <span className="px-1.5 py-0.5 bg-neutral-900 rounded border border-neutral-800 text-[10px] font-bold text-neutral-400">{r.method}</span>
                      <span className="text-neutral-200">{r.path}</span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-neutral-700" />
                  </div>
                ))}
                {(!data.routes || data.routes.length === 0) && (
                  <div className="text-neutral-700 text-sm font-mono italic">No routes mapped to this function.</div>
                )}
             </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4 mt-10">
               <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                 <AlertOctagon className="w-4 h-4" />
                 Top Issues
               </h3>
            </div>
            {statsData?.top_issues && statsData.top_issues.length > 0 ? (() => {
              const clusters = buildFailureClusters(statsData.top_issues);
              const totalFails = clusters.reduce((s, c) => s + c.totalHits, 0);
              const hasUserErrors = clusters.some(c => c.cls === 'user');
              const topCluster = clusters[0];
              const tiClusterDomShas = clusters.map(c => c.issues.slice().sort((a, b) => b.count - a.count)[0]?.code_sha ?? null);
              const tiUniqueDeployShas = new Set(tiClusterDomShas.filter(Boolean));
              const tiIsCrossVersion = tiUniqueDeployShas.size > 1;

              return (
                <div className="space-y-3">
                  {/* Section header */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-600">
                      {clusters.length} independent failure mode{clusters.length > 1 ? 's' : ''} detected
                      {tiIsCrossVersion && <span className="normal-case font-semibold text-neutral-700"> · across {tiUniqueDeployShas.size} deployments</span>}
                    </span>
                    {clusters.length > 1 && (
                      <span className="text-[9px] font-bold text-neutral-700 border border-neutral-800 px-1.5 py-0.5 rounded">⚠ Independent failures (no shared root cause)</span>
                    )}
                  </div>
                  {clusters.map((cluster, ci) => {
                    const meta = ERROR_CLASS_META[cluster.cls];
                    const pct = totalFails > 0 ? Math.round((cluster.totalHits / totalFails) * 100) : 0;
                    const isMostImpactful = ci === 0 && clusters.length > 1;
                    return (
                      <div key={cluster.cls}>
                        {/* Cluster header */}
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-t-lg border-x border-t ${meta.bg} ${meta.border}`}>
                          <span className={`text-[10px] font-black uppercase tracking-wider ${meta.color}`}>
                            {meta.icon} {meta.label}
                          </span>
                          {isMostImpactful && (
                            <span className={`text-[8px] font-black uppercase border px-1 py-0.5 rounded leading-none ${meta.color} ${meta.border}`}>
                              ▲ Fix first
                            </span>
                          )}
                          <span className="text-[9px] text-neutral-600 ml-auto">
                            {cluster.totalHits} hit{cluster.totalHits > 1 ? 's' : ''} · {pct}%
                          </span>
                          {(() => {
                            const sha = cluster.issues.slice().sort((a, b) => b.count - a.count)[0]?.code_sha;
                            const domIssue = cluster.issues.slice().sort((a, b) => b.count - a.count)[0];
                            const ver = domIssue ? resolveIssueVersion(domIssue) : null;
                            if (!ver && deploymentList.length === 0) return null;
                            return (
                              <span className={`text-[9px] font-mono font-bold px-1 py-0.5 rounded border ${
                                ver?.isCurrent ? 'text-emerald-500/70 border-emerald-900/50'
                                : 'text-neutral-600 border-neutral-800'
                              }`}>
                                {ver ? ver.label : (sha?.slice(0, 7) ?? '?')}{!ver?.isCurrent && <span className="text-neutral-700 ml-1">hist</span>}
                              </span>
                            );
                          })()}
                        </div>
                        {/* Issues in this cluster */}
                        {cluster.issues.map((issue, i) => {
                          const fixForIssue = cluster.cls === 'external' ? (() => {
                            const t = issue.title.toLowerCase();
                            if (t.includes('dns') || t.includes('resolve')) return 'DNS lookup failed → not caught → request crashes';
                            if (t.includes('timeout')) return 'request timed out → not caught → request crashes';
                            if (t.includes('refused') || t.includes('econnrefused')) return 'connection refused → not caught → request crashes';
                            if (t.includes('tls') || t.includes('certificate') || t.includes('ssl')) return 'TLS error → not caught → request crashes';
                            return 'external call failed → not caught → request crashes';
                          })() : errorTypeToFix(issue.title);
                          const issueFrame = topUserFrame(issue.sample_stack);
                          const issueLoc = frameLabel(issueFrame);
                          return (
                            <div
                              key={i}
                              onClick={() => setFilter(filter === issue.title ? null : issue.title)}
                              className={`bg-[#111] border-x ${meta.border} ${filter === issue.title ? 'ring-1 ring-inset ' + meta.border : ''} px-4 py-3 flex items-center justify-between font-mono text-sm transition hover:bg-neutral-900/30 cursor-pointer group`}
                            >
                              <div className="flex items-center gap-4 overflow-hidden">
                                <div className={`flex flex-col items-center justify-center shrink-0 w-10 h-10 rounded border ${meta.bg} ${meta.border}`}>
                                  <span className={`text-xs font-bold ${meta.color}`}>{issue.count}</span>
                                  <span className="text-[8px] uppercase text-neutral-600">Hits</span>
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                  <span className="text-neutral-200 truncate font-semibold" title={issueLoc ? `${issue.title} → ${issueLoc}` : issue.title}>
                                    {compactIssueLabel(issue.title, issue.error_source)}
                                    {issueLoc && <span className={`${meta.dimColor} font-normal`}> → {issueLoc}</span>}
                                  </span>
                                  <div className="flex items-center gap-2 mt-0.5 overflow-hidden">
                                    <span className="text-[10px] text-neutral-600 uppercase tracking-wider shrink-0">{issue.fingerprint.slice(0, 8)}</span>
                                    {fixForIssue && (
                                      <span className="text-[10px] text-blue-400/70 truncate">→ {fixForIssue}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="shrink-0 text-right ml-4 hidden sm:block">
                                <div className="text-xs text-neutral-400 font-medium">{new Date(issue.last_seen).toLocaleTimeString()}</div>
                                <div className="text-[10px] text-neutral-600 mt-1">Last seen</div>
                              </div>
                            </div>
                          );
                        })}
                        {/* Consequence footer — infra and external get extra context */}
                        {(cluster.cls === 'infra' || cluster.cls === 'external') && (
                          <div className={`border-x border-b ${meta.border} px-4 py-2 font-mono text-[10px] text-neutral-600 space-y-0.5 ${meta.bg} rounded-b-lg`}>
                            {cluster.cls === 'infra' ? (
                              <>
                                <div>→ execution could not start</div>
                                <div>→ no user code executed</div>
                              </>
                            ) : (
                              <>
                                <div>→ not handled in user code</div>
                                <div>→ request failed</div>
                              </>
                            )}
                          </div>
                        )}
                        {/* Close rounded bottom when no consequence footer */}
                        {!(cluster.cls === 'infra' || cluster.cls === 'external') && (
                          <div className={`border-x border-b ${meta.border} h-1 rounded-b-lg`} />
                        )}
                      </div>
                    );
                  })}
                  {/* Suggested focus */}
                  {clusters.length > 1 && (
                    <div className="flex items-start gap-2 bg-neutral-950 border border-neutral-800/60 rounded-lg px-3 py-2.5">
                      <Lightbulb className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
                      <div className="text-[10px] text-neutral-400">
                        <span className="font-bold text-blue-400">Suggested focus: </span>
                        address{' '}
                        <span className={`font-bold ${ERROR_CLASS_META[topCluster.cls].color}`}>
                          {ERROR_CLASS_META[topCluster.cls].label}
                        </span>{' '}
                        first — affects {Math.round((topCluster.totalHits / totalFails) * 100)}% of failures
                      </div>
                    </div>
                  )}
                </div>
              );
            })() : (
              <div className="text-neutral-700 text-sm font-mono italic p-6 border border-dashed border-neutral-800 bg-[#0a0a0a] rounded-xl text-center">No recent issues detected.</div>
            )}
          </section>
        </div>

        <div className="space-y-10">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500">Function Settings</h3>
              <button 
                onClick={async () => {
                  try {
                    await api.updateFunction(func_id, {
                      access_policy: data.access_policy ?? undefined,
                      rate_limit_rpm: data.rate_limit_rpm ?? undefined,
                      max_duration_ms: data.max_duration_ms ?? undefined,
                    });
                    toast.success("Settings updated");
                    loadData();
                  } catch (err) {
                    toast.error("Failed to update settings: " + err);
                  }
                }}
                className="text-blue-500 hover:text-blue-400 transition flex items-center gap-1.5 text-xs font-bold"
              >
                <Save className="w-3 h-3" />
                Update
              </button>
            </div>
            <div className="bg-neutral-950 border border-neutral-900 rounded-xl p-6 space-y-6 shadow-inner">
               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Access Policy</label>
                  <select 
                    value={data.access_policy ?? ""} 
                    onChange={(e) => setData({ ...data, access_policy: e.target.value })}
                    className="w-full bg-black border border-neutral-800 rounded p-2 text-xs font-mono text-neutral-100 focus:border-blue-500 outline-none"
                  >
                    <option value="private">Private (Token Required)</option>
                    <option value="public">Public (Any access)</option>
                    <option value="webhook">Webhook (HMAC Secret)</option>
                  </select>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Rate Limit (RPM)</label>
                    <input 
                      type="number" 
                      value={data.rate_limit_rpm ?? ""} 
                      onChange={(e) => setData({ ...data, rate_limit_rpm: parseInt(e.target.value) })}
                      className="w-full bg-black border border-neutral-800 rounded p-2 text-xs font-mono text-neutral-100 focus:border-blue-500 outline-none" 
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Timeout (ms)</label>
                    <input 
                      type="number" 
                      value={data.max_duration_ms ?? ""} 
                      onChange={(e) => setData({ ...data, max_duration_ms: parseInt(e.target.value) })}
                      className="w-full bg-black border border-neutral-800 rounded p-2 text-xs font-mono text-neutral-100 focus:border-blue-500 outline-none" 
                    />
                 </div>
               </div>

               {data.access_policy === "webhook" && (
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Webhook Secret</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={data.webhook_secret || ""} 
                        readOnly
                        className="flex-1 bg-black border border-neutral-800 rounded p-2 text-xs font-mono text-neutral-500" 
                      />
                      <button 
                        onClick={async () => {
                          const secret = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
                          await api.updateFunction(func_id, { webhook_secret: secret });
                          loadData();
                        }}
                        className="bg-neutral-900 border border-neutral-800 px-3 py-1 rounded text-[10px] font-bold text-neutral-400 hover:text-white"
                      >
                        Rotate
                      </button>
                    </div>
                 </div>
               )}
            </div>
          </section>

          {/* Deployments */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-3 flex items-center gap-2">
              <GitCommit className="w-4 h-4" />
              Deployments
            </h3>
            <div className="flex flex-col gap-1.5 font-mono">
              {deploymentList.length === 0 && (
                <div className="text-neutral-700 text-xs italic">No deployments yet.</div>
              )}
              {deploymentList.map((dep, i) => {
                const slice = deploySlice(dep.artifact_id);
                // Only the first (most recent) row whose artifact_id matches latest_artifact_id is "active"
                const isActive = dep.artifact_id === data.latest_artifact_id &&
                  deploymentList.findIndex(d => d.artifact_id === data.latest_artifact_id) === i;
                const sha7 = dep.artifact_id?.slice(0, 7) ?? '???????';
                const errRate = slice && slice.total > 0 ? Math.round((slice.errors / slice.total) * 100) : null;
                const relTime = dep.created_at ? (() => {
                  const diff = Date.now() - new Date(dep.created_at).getTime();
                  const mins = Math.floor(diff / 60000);
                  if (mins < 60) return `${mins}m ago`;
                  const hrs = Math.floor(mins / 60);
                  if (hrs < 24) return `${hrs}h ago`;
                  return `${Math.floor(hrs / 24)}d ago`;
                })() : null;
                const isConfirming = confirmDeploy === dep.artifact_id;
                const isActivating = activatingDeploy === dep.artifact_id;
                return (
                  <div key={dep.id ?? i} className={`flex flex-col gap-1.5 px-3 py-2 rounded-lg border text-[11px] transition-colors ${
                    isActive
                      ? 'bg-emerald-950/20 border-emerald-900/50'
                      : isConfirming
                      ? 'bg-amber-950/20 border-amber-900/50'
                      : 'bg-neutral-950 border-neutral-800/60'
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-black ${isActive ? 'text-emerald-400' : 'text-neutral-500'}`}>{sha7}</span>
                        {isActive && <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 border border-emerald-900/50 px-1 py-px rounded">active</span>}
                        {dep.status === 'boot_failed' && <span className="text-[9px] font-bold uppercase tracking-wider text-red-500 border border-red-900/50 px-1 py-px rounded">boot failed</span>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {errRate !== null && (
                          <span className={`text-[10px] font-bold ${errRate > 0 ? 'text-red-400' : 'text-emerald-500'}`}>
                            {errRate > 0 ? `${errRate}% err` : '0 err'}
                          </span>
                        )}
                        {relTime && <span className="text-neutral-700 text-[10px]">{relTime}</span>}
                      </div>
                    </div>
                    {!isActive && (
                      <div className="flex items-center gap-1.5">
                        {isConfirming ? (
                          <>
                            <button
                              disabled={isActivating}
                              onClick={async () => {
                                setActivatingDeploy(dep.artifact_id);
                                try {
                                  await api.updateFunction(func_id, { latest_artifact_id: dep.artifact_id });
                                  toast.success(`Activated ${sha7}`);
                                  setConfirmDeploy(null);
                                  loadData();
                                } catch (err) {
                                  toast.error('Activation failed: ' + err);
                                } finally {
                                  setActivatingDeploy(null);
                                }
                              }}
                              className="flex-1 text-center text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded border border-amber-700 bg-amber-900/30 text-amber-400 hover:bg-amber-900/60 disabled:opacity-40 transition-colors"
                            >
                              {isActivating ? 'Activating…' : 'Confirm activate'}
                            </button>
                            <button
                              disabled={isActivating}
                              onClick={() => setConfirmDeploy(null)}
                              className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border border-neutral-800 text-neutral-600 hover:text-neutral-400 disabled:opacity-40 transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmDeploy(dep.artifact_id)}
                            className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border border-neutral-800 text-neutral-600 hover:border-neutral-600 hover:text-neutral-300 transition-colors w-full"
                          >
                            ↑ Set active
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
      
      <ExecutionDetailDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        execId={selectedExecId || ""}
        projectId={id}
      />
    </div>
  );
}

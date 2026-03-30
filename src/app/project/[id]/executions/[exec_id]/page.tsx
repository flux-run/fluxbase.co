"use client";
import { Suspense, useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import { useFluxApi } from "@/lib/api";
import { Activity, Terminal, Copy, Check, ChevronRight, ChevronDown, GitMerge } from "lucide-react";
import { ExecutionDetail as ExecutionDetailType, LogEntry } from "@/types/api";
import { ExecutionTimeline } from "@/components/dashboard/ExecutionTimeline";

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

function isGenericErrorHeadline(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  return !normalized ||
    normalized === "unhandled exception" ||
    normalized === "unknown runtime error" ||
    normalized === "unknown error" ||
    normalized === "runtime error" ||
    normalized === "exception" ||
    normalized === "error";
}

function confidenceLabel(confidence?: number) {
  if ((confidence ?? 0) >= 0.85) return "High";
  if ((confidence ?? 0) >= 0.65) return "Medium";
  return "Low";
}

function phaseLabel(errorPhase?: string | null) {
  switch (errorPhase) {
    case "init":
      return "Initialization before request handling";
    case "external":
      return "External dependency step";
    case "runtime":
    default:
      return "Runtime execution (synchronous)";
  }
}

function formatThrownExpression(
  errorName?: string | null,
  errorMessage?: string | null,
  errorStack?: string | null,
  fallback?: string | null,
) {
  const stackLine = errorStack
    ?.split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("at "))
    ?.replace(/^Uncaught\s+/, "")
    ?.trim();
  const stackMatch = stackLine?.match(/^([^:]+):\s*(.+)$/);
  const name = errorName?.trim() || stackMatch?.[1]?.trim();
  const message = errorMessage?.trim() || stackMatch?.[2]?.trim();

  if (name && message && !isGenericErrorHeadline(message)) {
    return `${name}("${message.replaceAll("\n", " ")}")`;
  }

  return formatErrorHeadline(errorName, errorMessage, fallback, errorStack);
}

function isInternalFrame(file: string): boolean {
  return file.includes('ext:') || file.includes('deno:') || file.includes('node:') ||
    file.includes('internal/') || file.startsWith('flux:');
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

function parseUserStackFrames(stack?: string | null) {
  return parseStackFrames(stack).filter(f => !isInternalFrame(f.file));
}

function frameLabel(frame?: { fn?: string; file: string; line: string | number; col?: string | number } | null, short = true): string | null {
  if (!frame) return null;
  const file = short ? (frame.file.split('/').pop() ?? frame.file) : frame.file;
  // Short form: file:line only (clean display). Long form: file:line:col.
  const col = !short && frame.col != null && Number(frame.col) > 0 ? `:${frame.col}` : '';
  return `${file}:${frame.line}${col}`;
}
function codePreview(source: string, failLine: number, context = 2): Array<{ n: number; text: string; failing: boolean }> {
  const lines = source.split('\n');
  const start = Math.max(0, failLine - 1 - context);
  const end = Math.min(lines.length - 1, failLine - 1 + context);
  return lines.slice(start, end + 1).map((text, i) => ({
    n: start + i + 1,
    text,
    failing: start + i + 1 === failLine,
  }));
}

function errorTypeToFix(errorName?: string | null, errorMessage?: string | null, errorKey?: string | null): string | null {
  const key = (errorKey || errorMessage || '').toLowerCase();
  const name = (errorName || '').toLowerCase();
  if (key.includes('no_artifact_loaded') || key.includes('no artifact')) {
    return 'Function has no deployed artifact. Run `flux deploy` to upload a build, then retry the request.';
  }
  if (name === 'referenceerror' || key.includes('is not defined')) {
    return 'A variable or import is used before it is defined. Check spelling, import paths, and initialization order.';
  }
  if (name === 'typeerror' || key.includes('is not a function') || key.includes('cannot read')) {
    return 'A value is used where a different type is expected. Add null/undefined guards or validate the shape of incoming data.';
  }
  if (name === 'syntaxerror') {
    return 'The function source contains a syntax error. Check for unbalanced brackets, invalid JSON, or TypeScript type mismatches.';
  }
  if (key.includes('timeout') || key.includes('timed out')) {
    return 'Execution exceeded the timeout limit. Reduce blocking I/O, add early returns, or raise the timeout in Function Settings.';
  }
  if (key.includes('fetch') || key.includes('network') || key.includes('econnrefused')) {
    return 'An outbound network request failed. Verify the target URL is reachable and that egress is allowed from your deployment.';
  }
  return null;
}

function normalizeDebuggerTitle(issue: string, errorName?: string | null, errorMessage?: string | null): string {
  const hay = `${issue} ${errorName ?? ""} ${errorMessage ?? ""}`.toLowerCase();
  if (hay.includes("dns") || hay.includes("enotfound") || hay.includes("getaddrinfo")) {
    return "External API fetch failure (DNS resolution)";
  }
  if (hay.includes("timeout") || hay.includes("timed out")) {
    return "External API request failure (timeout)";
  }
  return issue;
}

function extractExternalTarget(
  spans: Array<{ type: string; label: string | null }> | undefined,
  errorMessage?: string | null,
): string {
  const spanWithUrl = spans?.find((s) => /https?:\/\//i.test(s.label ?? ""))?.label ?? "";
  const urlFromSpan = spanWithUrl.match(/https?:\/\/[^\s)"']+/i)?.[0];
  if (urlFromSpan) return urlFromSpan;

  const urlFromMessage = (errorMessage ?? "").match(/https?:\/\/[^\s)"']+/i)?.[0];
  if (urlFromMessage) return urlFromMessage;

  const hostFromMessage = (errorMessage ?? "").match(/(?:getaddrinfo|ENOTFOUND|lookup)\s+([a-z0-9.-]+\.[a-z]{2,})/i)?.[1];
  if (hostFromMessage) return `https://${hostFromMessage}`;

  return "external dependency";
}

function debuggerFailureReason(errorName?: string | null, errorMessage?: string | null, fallback?: string | null): string {
  const hay = `${errorName ?? ""} ${errorMessage ?? ""} ${fallback ?? ""}`.toLowerCase();
  if (hay.includes("dns") || hay.includes("enotfound") || hay.includes("getaddrinfo")) return "DNS resolution failed";
  if (hay.includes("timeout") || hay.includes("timed out")) return "request timed out";
  if (hay.includes("econnrefused") || hay.includes("connection refused")) return "connection refused";
  return "request failed";
}

function ExecutionDetailContent({ params }: { params: Promise<{ id: string, exec_id: string }> }) {
  const { id, exec_id } = use(params);
  const searchParams = useSearchParams();
  const api = useFluxApi(id);
  const [data, setData] = useState<ExecutionDetailType | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [showStack, setShowStack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rawOpen, setRawOpen] = useState(false);
  const [rawTab, setRawTab] = useState<'request' | 'headers' | 'response'>('request');
  const debuggerMode = searchParams.get("debugger") === "1";

  useEffect(() => {
    if (!api.ready) return;

    api.getExecution(exec_id).then(res => {
      setData(res);
      setLoading(false);
    }).catch((err: unknown) => {
      console.error(err);
      setLoading(false);
    });
  }, [exec_id, api]);

  const copyReplay = () => {
    navigator.clipboard.writeText(`flux replay ${exec_id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!data || !data.execution) return <div className="animate-pulse text-sm font-mono text-neutral-500 p-8 text-center mt-20">Reconstructing deterministic execution state...</div>;

  const exec = data.execution;
  
  // Safe parsing helper
  const parsePayload = (val: any) => {
    if (typeof val !== "string") return val;
    try {
      return (val.startsWith('{') || val.startsWith('[')) ? JSON.parse(val) : val;
    } catch (e) {
      return val;
    }
  };

  const reqObj = parsePayload(exec.request);
  let resObj = parsePayload(exec.response);
  if (!resObj && exec.error) resObj = { error: exec.error };
  const errorHeadline = formatErrorHeadline(
    exec.error_name,
    exec.error_message,
    exec.error,
    exec.error_stack,
  );
  const thrownExpression = formatThrownExpression(
    exec.error_name,
    exec.error_message,
    exec.error_stack,
    exec.error,
  );
  const displayIssue =
    exec.status === "ok"
      ? data.narrative?.issue || "Execution Optimal"
      : isGenericErrorHeadline(data.narrative?.issue)
        ? errorHeadline
        : data.narrative?.issue || errorHeadline;
  const displayDetails =
    exec.status === "error" && isGenericErrorHeadline(data.narrative?.details)
      ? errorHeadline
      : data.narrative?.details || errorHeadline;
  const displaySuggestion =
    exec.status === "ok"
      ? data.narrative?.suggestion || "No action required. Execution is fully traceable."
      : data.narrative?.suggestion &&
          !data.narrative.suggestion.includes("Unknown runtime error") &&
          !data.narrative.suggestion.includes("Unhandled exception detected: Unhandled exception")
        ? data.narrative.suggestion
        : isGenericErrorHeadline(thrownExpression)
          ? "An unhandled exception was detected. Wrap the offending code in a try-catch to handle the error gracefully."
          : `Unhandled exception detected: ${thrownExpression}. Remove or handle this throw to allow execution to complete.`;
  const isPlatformFailure =
    exec.is_user_code === false ||
    exec.error_source === "platform_runtime" ||
    exec.error_source === "platform_executor";
  const sourceLabel = isPlatformFailure ? "Flux Runtime" : "User Code";
  const confidenceText = confidenceLabel(data.narrative?.confidence);
  const haltReason =
    exec.status === "ok"
      ? null
      : isGenericErrorHeadline(errorHeadline)
        ? "Execution was halted by an unhandled exception"
        : `Execution interrupted by unhandled exception: ${errorHeadline}`;

  const stackFrames = parseUserStackFrames(exec.error_stack);
  const userFrame: { fn?: string; file: string; line: string | number; col?: string | number } | null =
    (exec.error_frames?.length ?? 0) > 0
      ? exec.error_frames![0]
      : stackFrames[0] ?? null;
  const fixHint = errorTypeToFix(exec.error_name, exec.error_message, exec.error);

  const reqHeaders = typeof reqObj?.headers === 'object' && reqObj.headers !== null
    ? (reqObj.headers as Record<string, string>)
    : {};
  const authHeaderKeys = ['authorization', 'x-api-key', 'x-auth-token', 'cookie', 'postman-token'];
  const infraHeaderPrefixes = ['x-', 'cdn-', 'cf-'];
  const infraHeaderExact = ['host', 'accept-encoding', 'content-length', 'accept', 'user-agent'];
  const authHeaders = Object.entries(reqHeaders).filter(([k]) => authHeaderKeys.includes(k.toLowerCase()));
  const infraHeaders = Object.entries(reqHeaders).filter(([k]) =>
    !authHeaderKeys.includes(k.toLowerCase()) &&
    (infraHeaderPrefixes.some(p => k.toLowerCase().startsWith(p)) || infraHeaderExact.includes(k.toLowerCase()))
  );
  const userHeaders = Object.entries(reqHeaders).filter(([k]) =>
    !authHeaderKeys.includes(k.toLowerCase()) &&
    !infraHeaderPrefixes.some(p => k.toLowerCase().startsWith(p)) &&
    !infraHeaderExact.includes(k.toLowerCase())
  );
  const curlCommand = `curl -X ${exec.method ?? 'GET'} 'https://your-domain${exec.path}'${authHeaders.length ? `\n  -H 'Authorization: <redacted>'` : ''}${reqObj?.body ? `\n  -d '${JSON.stringify(reqObj.body)}'` : ''}`;

  if (debuggerMode) {
    const headline = normalizeDebuggerTitle(displayIssue || errorHeadline, exec.error_name, exec.error_message);
    const externalTarget = extractExternalTarget(data.spans, exec.error_message);
    const failureReason = debuggerFailureReason(exec.error_name, exec.error_message, exec.error);
    const rootCause = failureReason === "DNS resolution failed"
      ? "DNS resolution failed in runtime environment"
      : failureReason === "request timed out"
        ? "Outbound request timed out in runtime environment"
        : failureReason === "connection refused"
          ? "Outbound connection was refused by the target service"
          : "External request failed in runtime environment";

    const suggestedFixes = failureReason === "DNS resolution failed"
      ? ["Check DNS config", "Verify outbound network access"]
      : failureReason === "request timed out"
        ? ["Check target service latency and availability", "Increase timeout or add retries with backoff"]
        : failureReason === "connection refused"
          ? ["Verify target host/port and service health", "Confirm outbound egress is allowed"]
          : ["Validate target URL and service availability", "Verify outbound network policy and connectivity"];

    return (
      <div className="space-y-6 pb-16 max-w-3xl mx-auto">
        <header className="border-b border-neutral-900 pb-5">
          <h1 className="text-xl font-black text-white tracking-tight">{headline}</h1>
        </header>

        <section className="space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Timeline</h2>
          <ol className="space-y-2">
            <li className="text-sm text-neutral-200">1. Request received</li>
            <li className="text-sm text-neutral-200">2. Handler started</li>
            <li className="text-sm text-neutral-200">
              3. Fetch {externalTarget}
              <span className="ml-2 text-red-300 font-semibold">❌ {failureReason}</span>
            </li>
          </ol>
        </section>

        <section className="space-y-2">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Root cause</h2>
          <p className="text-sm text-neutral-200">{rootCause}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Suggested fix</h2>
          <ul className="space-y-1">
            {suggestedFixes.map((fix, i) => (
              <li key={i} className="text-sm text-neutral-200">• {fix}</li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24 max-w-5xl mx-auto">
      <header className="flex justify-between items-start border-b border-neutral-900 pb-8">
        <div>
          <div className="flex items-center gap-4 mb-3">
             <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${exec.status === 'ok' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/50' : 'bg-red-950 text-red-400 border border-red-900/50'}`}>
               {exec.status === 'ok' ? 'Success' : 'Failure'}
             </span>
             {exec.error_source && (
               <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-neutral-800 text-neutral-500">
                 Source: {sourceLabel}
               </span>
             )}
             <h2 className="text-2xl font-bold text-white font-mono flex items-center">
               <span className="text-neutral-600 mr-2 text-xl">{exec.method}</span>
               {exec.path}
             </h2>
          </div>
          {(() => {
            const hasActor = !!exec.actor_name || !!exec.token_name;
            const isPublic = !hasActor && !exec.token_id;
            const tags = (() => { try { return exec.token_tags ? JSON.parse(exec.token_tags) : []; } catch { return []; } })();
            const env = tags[0];
            const firstIp = exec.client_ip?.split(',')[0]?.trim();
            const actorIcon = exec.actor_type === 'ci' ? '⚙' : exec.actor_type === 'service' ? '◈' : '👤';
            if (hasActor) {
              return (
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-500 mt-2">
                  <span>{actorIcon}</span>
                  <span className="text-neutral-500 font-semibold">Origin:</span>
                  <span className="text-neutral-300">{exec.actor_name}</span>
                  {exec.token_name && (
                    <><span className="text-neutral-700">·</span><span className="text-neutral-500">{exec.token_name}</span></>
                  )}
                  {env && (
                    <span className="text-neutral-600 px-1 rounded border border-neutral-800 bg-neutral-950">{env}</span>
                  )}
                </div>
              );
            }
            return (
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-500 mt-2">
                <span>🌐</span>
                <span className="text-neutral-500 font-semibold">Origin:</span>
                <span className="text-neutral-400">{isPublic ? 'Public traffic' : 'Unknown'}</span>
                {firstIp && isPublic && (
                  <><span className="text-neutral-700">·</span><span className="text-neutral-500">{firstIp}</span></>
                )}
              </div>
            );
          })()}
          <div className="flex items-center gap-4 text-neutral-500 font-mono text-[12px] mt-1.5">
             <span>{exec_id}</span>
             <span className="w-1.5 h-1.5 bg-neutral-900 rounded-full" />
             <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> {exec.duration_ms}ms</span>
             <span className="w-1.5 h-1.5 bg-neutral-900 rounded-full" />
             <span>{new Date(exec.started_at ?? new Date().toISOString()).toUTCString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { navigator.clipboard.writeText(exec_id); setCopiedId(true); setTimeout(() => setCopiedId(false), 2000); }}
            className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 px-3 py-2 rounded-lg text-xs font-mono text-neutral-400 hover:text-white hover:border-neutral-700 transition-all"
            title="Copy execution ID"
          >
            {copiedId ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            <span>{exec_id.slice(0, 8)}</span>
          </button>
          <button
            onClick={() => { navigator.clipboard.writeText(curlCommand); setCopiedCurl(true); setTimeout(() => setCopiedCurl(false), 2000); }}
            className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 px-3 py-2 rounded-lg text-xs font-bold text-neutral-400 hover:text-white hover:border-neutral-700 transition-all"
            title="Copy as cURL"
          >
            {copiedCurl ? <Check className="w-3 h-3 text-green-500" /> : <Terminal className="w-3 h-3" />}
            <span>Copy cURL</span>
          </button>
          <button onClick={copyReplay} className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 px-3 py-2 rounded-lg text-xs font-bold text-neutral-400 hover:bg-neutral-800 hover:text-white hover:border-neutral-700 transition-all h-9">
             <svg className="w-4 h-4 mr-1 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
             Replay
          </button>
        </div>
      </header>

      {/* 1. EXECUTION TIMELINE — PRIMARY */}
      <section>
        <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <GitMerge className="w-3.5 h-3.5" /> Execution Timeline
        </h3>
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden py-1">
          <ExecutionTimeline
            execution={exec}
            checkpoints={data.checkpoints ?? []}
            logs={data.logs ?? []}
          />
        </div>
      </section>

      {/* 2. OUTCOME STRIP — compact */}
      <div className="flex items-center gap-x-5 gap-y-1 flex-wrap px-4 py-3 bg-neutral-900/40 border border-neutral-800 rounded-lg">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${exec.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className={`text-xs font-mono font-bold ${exec.status === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
            {exec.status === 'ok' ? 'Success' : 'Error'}
          </span>
        </div>
        <span className="text-xs font-mono text-neutral-200">{exec.duration_ms}ms total</span>
        {data.narrative?.breakdown ? (
          <>
            <span className="text-[11px] font-mono text-neutral-500">JS: {data.narrative.breakdown.js_ms}ms</span>
            <span className="text-[11px] font-mono text-neutral-500">IO: {data.narrative.breakdown.io_ms}ms</span>
            <span className={`text-[11px] font-mono ${
              exec.duration_ms && data.narrative.breakdown.overhead_ms / exec.duration_ms > 0.5
                ? 'text-orange-400'
                : 'text-neutral-500'
            }`}>
              Overhead: {data.narrative.breakdown.overhead_ms}ms{exec.duration_ms ? ` (${Math.round(data.narrative.breakdown.overhead_ms / exec.duration_ms * 100)}%)` : ''}
              <span className="text-neutral-700"> · runtime + infra cost</span>
            </span>
          </>
        ) : exec.client_ip ? (
          <span className="text-[11px] font-mono text-neutral-600">{exec.client_ip}</span>
        ) : null}
        {data.narrative?.pattern_history && (
          <span className="text-[10px] font-mono text-red-400 animate-pulse">
            ⚠ {data.narrative.pattern_history.count}× in last {data.narrative.pattern_history.window_min}m
          </span>
        )}
        {data.narrative?.breakdown && (() => {
          const b = data.narrative!.breakdown;
          const topLabel = b.io_ms >= b.js_ms && b.io_ms >= b.overhead_ms
            ? `IO (${b.io_ms}ms)`
            : b.overhead_ms >= b.js_ms
              ? `Overhead (${b.overhead_ms}ms)`
              : `JS (${b.js_ms}ms)`;
          return (
            <span className="text-[10px] font-mono text-neutral-600 ml-auto">
              Top cost: <span className="text-neutral-400">{topLabel}</span>
            </span>
          );
        })()}
      </div>

      {/* 3. ANALYSIS */}
      <section className="space-y-4">
        {exec.status === 'ok' ? (
          /* Success: thin insight strip */
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono border-b border-neutral-900/60 pb-4">
            <span className="text-neutral-500 uppercase tracking-widest text-[9px] font-black">Analysis</span>
            <span className="text-neutral-400">{data.narrative?.root_cause || data.narrative?.cause || 'No issues detected.'}</span>
            {data.narrative?.anomaly && data.narrative.anomaly.is_abnormal && (
              <span className="text-orange-400">⚠ Abnormal — avg {data.narrative.anomaly.avg_duration}ms, this {exec.duration_ms}ms</span>
            )}
            {data.narrative?.pattern_history && (
              <span className="text-red-400">{data.narrative.pattern_history.count}× in last {data.narrative.pattern_history.window_min}m</span>
            )}
          </div>
        ) : (
          /* Error: keep detail, no card chrome */
          <div className="space-y-4 border-l-2 border-red-900/50 pl-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                  data.narrative?.severity === 'critical' ? 'bg-red-500 text-black' :
                  data.narrative?.severity === 'high' ? 'bg-orange-500 text-black' :
                  'bg-yellow-500 text-black'
                }`}>{data.narrative?.severity || 'error'}</span>
                <span className="text-[10px] text-red-400/60 font-mono uppercase tracking-widest">
                  {data.narrative?.issue && !isGenericErrorHeadline(data.narrative.issue) ? data.narrative.issue : 'Unhandled exception'}
                </span>
              </div>
              <p className="text-base font-mono font-bold text-white leading-snug">
                {!isGenericErrorHeadline(errorHeadline) ? errorHeadline : displayIssue}
              </p>
              {userFrame && (
                <p className="text-xs font-mono text-red-400/70">↳ {frameLabel(userFrame)}</p>
              )}
            </div>

            {(data.narrative?.root_cause || data.narrative?.synthetic_root_cause) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Root Cause</span>
                  <p className="text-neutral-200 text-[12px] mt-1 leading-relaxed">
                    {data.narrative?.root_cause && !data.narrative.root_cause.toLowerCase().includes('unhandled exception thrown in user code')
                      ? data.narrative.root_cause
                      : userFrame ? `Unhandled throw at ${frameLabel(userFrame)}` : 'Unhandled exception in user code'}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Phase</span>
                  <p className="text-neutral-300 text-[12px] mt-1">{data.narrative?.phase || phaseLabel(exec.error_phase)}</p>
                </div>
              </div>
            )}

            {exec.status !== 'ok' && userFrame && (() => {
               const artifactSource: string | null = (() => {
                 try {
                   const mods = (reqObj as any)?.artifact?.modules;
                   return Array.isArray(mods) ? (mods[0]?.source ?? null) : null;
                 } catch { return null; }
               })();
               const preview = artifactSource && typeof userFrame.line === 'number'
                 ? codePreview(artifactSource, userFrame.line)
                 : artifactSource && typeof userFrame.line === 'string'
                   ? codePreview(artifactSource, parseInt(userFrame.line, 10))
                   : null;
               const displayFrames: { fn?: string; file: string; line: string | number; col?: string | number }[] =
                 exec.error_frames?.length ? exec.error_frames : stackFrames;
               return (
                 <div className="space-y-2">
                   {preview && (
                     <div className="rounded-lg overflow-hidden border border-red-900/30 bg-black/90">
                       <div className="px-4 py-1.5 bg-red-950/20 border-b border-red-900/20 flex items-center justify-between">
                         <span className="text-[10px] font-mono font-bold text-red-300">{frameLabel(userFrame)}</span>
                         <span className="text-[9px] text-red-400/50 uppercase font-black tracking-widest">Failure line</span>
                       </div>
                       <div className="font-mono text-[12px] leading-relaxed">
                         {preview.map(({ n, text, failing }) => (
                           <div key={n} className={`flex gap-0 ${failing ? 'bg-red-950/40' : ''}`}>
                             <span className="select-none w-10 shrink-0 text-right pr-4 py-0.5 text-neutral-700 border-r border-neutral-900">{n}</span>
                             <span className={`pl-4 py-0.5 whitespace-pre ${failing ? 'text-red-300' : 'text-neutral-500'}`}>{text || ' '}</span>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                   {displayFrames.length > 1 && (
                     <button
                       onClick={() => setShowStack(v => !v)}
                       className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 hover:text-neutral-400 transition-colors"
                     >
                       <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${showStack ? 'rotate-90' : ''}`} />
                       Full stack — {displayFrames.length} frame{displayFrames.length !== 1 ? 's' : ''}
                     </button>
                   )}
                   {showStack && displayFrames.length > 1 && (
                     <div className="bg-black/80 border border-neutral-900/60 rounded-lg overflow-hidden">
                       {displayFrames.map((frame, i) => (
                         <div key={i} className={`px-4 py-1.5 border-b border-neutral-900/40 last:border-0 font-mono text-[11px] flex gap-3 ${i === 0 ? 'bg-red-950/20' : ''}`}>
                           <span className="text-neutral-700 w-5 shrink-0 text-right">{i + 1}</span>
                           <span className={i === 0 ? 'text-red-400' : 'text-neutral-600'}>{frameLabel(frame)}</span>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
               );
            })()}

            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Recommendation</span>
              <p className="text-[12px] text-neutral-400 leading-relaxed">
                {fixHint
                  ? (userFrame ? `${fixHint.replace(/\.$/, '')} (${frameLabel(userFrame)}).` : fixHint)
                  : userFrame
                    ? `This exception originates from ${frameLabel(userFrame)}. ${displaySuggestion.replace(/^.*?\. /, '')}`
                    : displaySuggestion}
              </p>
            </div>

            {data.narrative?.anomaly && (
              <div className="flex items-center gap-5 text-[11px] font-mono text-neutral-500 pt-1 border-t border-neutral-900/40">
                <span>24h avg: {data.narrative.anomaly.avg_duration}ms</span>
                <span className={data.narrative.anomaly.is_abnormal ? 'text-orange-400' : 'text-neutral-500'}>this: {exec.duration_ms}ms</span>
                {data.narrative.anomaly.is_abnormal && <span className="text-orange-400">⚠ Abnormal</span>}
              </div>
            )}

            {data.narrative?.next_steps && data.narrative.next_steps.length > 0 && (
              <div className="space-y-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Next Steps</span>
                <ol className="space-y-1">
                  {data.narrative.next_steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-neutral-400 leading-snug">
                      <span className="shrink-0 text-neutral-700 font-mono">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 4. REPLAY COMMAND */}
      <div className="flex flex-col gap-1.5 px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg">
        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Replay this exact execution locally</span>
        <div className="flex items-center gap-3">
          <Terminal className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
          <code className="text-[11px] font-mono text-neutral-300 flex-1 select-all">flux replay {exec_id}</code>
          <button
            onClick={copyReplay}
            className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-500 hover:text-white transition-colors"
            title="Copy replay command"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 5. RAW CONTEXT — collapsible, tabbed */}
      <section>
        <button
          className="w-full flex items-center justify-between px-4 py-2.5 bg-neutral-900/40 border border-neutral-800 rounded-lg hover:bg-neutral-900/60 transition-colors text-left"
          onClick={() => setRawOpen((o) => !o)}
        >
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Raw Context</span>
          {rawOpen
            ? <ChevronDown className="w-3.5 h-3.5 text-neutral-600" />
            : <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />}
        </button>
        {rawOpen && (
          <div className="border border-neutral-800 border-t-0 rounded-b-lg overflow-hidden bg-black">
            <div className="flex border-b border-neutral-900">
              {(['request', 'headers', 'response'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRawTab(tab)}
                  className={`px-4 py-2 text-[10px] font-mono uppercase tracking-widest transition-colors ${
                    rawTab === tab
                      ? 'text-neutral-200 border-b border-neutral-400'
                      : 'text-neutral-600 hover:text-neutral-400'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="p-4 overflow-x-auto max-h-72 scrollbar-thin scrollbar-thumb-neutral-800">
              {rawTab === 'request' && (
                <pre className="text-[11px] font-mono text-neutral-400 whitespace-pre-wrap">{JSON.stringify(reqObj, null, 2)}</pre>
              )}
              {rawTab === 'headers' && (
                <div className="space-y-1.5">
                  {[...authHeaders, ...infraHeaders, ...userHeaders].map(([k, v]) => {
                    const isAuth = authHeaderKeys.includes(k.toLowerCase());
                    const isInfra = !isAuth && (infraHeaderPrefixes.some(p => k.toLowerCase().startsWith(p)) || infraHeaderExact.includes(k.toLowerCase()));
                    return (
                      <div key={k} className="flex items-start gap-3 font-mono text-[11px] leading-relaxed">
                        <span className={`shrink-0 font-bold ${isAuth ? 'text-orange-400/70' : isInfra ? 'text-blue-400/60' : 'text-neutral-500'}`}>{k}:</span>
                        <span className={`break-all ${isAuth ? 'text-neutral-600 italic' : 'text-neutral-400'}`}>
                          {isAuth ? '[redacted]' : String(v)}
                        </span>
                      </div>
                    );
                  })}
                  {Object.keys(reqHeaders).length === 0 && <p className="text-[11px] text-neutral-600 font-mono">No headers recorded.</p>}
                </div>
              )}
              {rawTab === 'response' && (
                <pre className="text-[11px] font-mono text-neutral-400 whitespace-pre-wrap">{JSON.stringify(resObj, null, 2)}</pre>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default function ExecutionDetail({ params }: { params: Promise<{ id: string, exec_id: string }> }) {
  return (
    <Suspense fallback={null}>
      <ExecutionDetailContent params={params} />
    </Suspense>
  );
}



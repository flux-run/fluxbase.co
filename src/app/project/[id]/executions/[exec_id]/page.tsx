"use client";
import { useEffect, useState, use } from "react";
import { useFluxApi } from "@/lib/api";
import { Activity, Terminal, Copy, Check, ChevronRight, ChevronDown, Zap, GitMerge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExecutionDetail as ExecutionDetailType, Checkpoint, LogEntry } from "@/types/api";
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

export default function ExecutionDetail({ params }: { params: Promise<{ id: string, exec_id: string }> }) {
  const { id, exec_id } = use(params);
  const api = useFluxApi(id);
  const [data, setData] = useState<ExecutionDetailType | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [showStack, setShowStack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rawOpen, setRawOpen] = useState(false);
  const [rawTab, setRawTab] = useState<'request' | 'headers' | 'response'>('request');

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

  return (
    <div className="space-y-8 pb-24 max-w-5xl mx-auto">
      <header className="flex justify-between items-start border-b border-neutral-900 pb-8">
        <div>
          <div className="flex items-center gap-4 mb-3">
             <Badge variant={exec.status === 'ok' ? 'success' : 'destructive'} className="font-bold text-[10px] uppercase tracking-widest">
               {exec.status === 'ok' ? 'Success' : 'Failure'}
             </Badge>
             {exec.error_source && (
               <Badge variant="outline" className="border-neutral-800 text-neutral-500 font-bold text-[10px] uppercase tracking-widest">
                 Source: {sourceLabel}
               </Badge>
             )}
             <h2 className="text-2xl font-bold text-white font-mono flex items-center">
               <span className="text-neutral-600 mr-2 text-xl">{exec.method}</span>
               {exec.path}
             </h2>
          </div>
          <div className="flex items-center gap-4 text-neutral-500 font-mono text-[12px]">
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
          <Button onClick={copyReplay} variant="outline" size="sm" className="bg-neutral-900 border-neutral-800 text-xs font-bold hover:bg-neutral-800 hover:text-white h-9 group/cta">
             <Zap className="w-4 h-4 mr-2 text-blue-500 group-hover/cta:animate-pulse" />
             Replay
          </Button>
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
            <span className="text-[11px] font-mono text-neutral-500">Overhead: ~{data.narrative.breakdown.overhead_ms}ms</span>
          </>
        ) : exec.client_ip ? (
          <span className="text-[11px] font-mono text-neutral-600">{exec.client_ip}</span>
        ) : null}
        {data.narrative?.pattern_history && (
          <span className="text-[10px] font-mono text-red-400 animate-pulse">
            ⚠ {data.narrative.pattern_history.count}× in last {data.narrative.pattern_history.window_min}m
          </span>
        )}
      </div>

      {/* 3. ANALYSIS */}
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Card className={`overflow-hidden border ${exec.status === 'ok' ? 'border-emerald-900/30 bg-emerald-950/10' : 'border-red-900/30 bg-red-950/10'}`}>
           <CardContent className="p-6">
              <div className="space-y-5">
                     <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-1">
                           <Badge className={`${
                              data.narrative?.severity === 'critical' ? 'bg-red-500' :
                              data.narrative?.severity === 'high' ? 'bg-orange-500' :
                              data.narrative?.severity === 'medium' ? 'bg-yellow-500' : 'bg-emerald-500'
                           } text-black font-black text-[9px] uppercase px-1.5 py-0 rounded-sm`}>
                              {data.narrative?.severity || 'Healthy'}
                           </Badge>
                           <Badge variant="outline" className="border-neutral-800 text-neutral-400 text-[9px] uppercase font-black px-1.5 py-0">
                              Source: {data.narrative?.source === 'user_code' ? 'User Code' : sourceLabel}
                           </Badge>
                           {userFrame ? (
                             <div className="flex items-center gap-1.5 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30">
                               <span className="text-[9px] font-bold text-emerald-500/80 uppercase">Exact location identified</span>
                             </div>
                           ) : (
                             <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                               <span className="text-[9px] font-bold text-neutral-500 uppercase">Detected at runtime</span>
                             </div>
                           )}
                        </div>
                        {exec.status !== 'ok' ? (
                          <div className="space-y-1.5">
                            <p className="text-red-400/60 text-[10px] font-black uppercase tracking-[0.2em]">
                              {data.narrative?.issue && !isGenericErrorHeadline(data.narrative.issue)
                                ? data.narrative.issue
                                : 'Unhandled exception'}
                            </p>
                            <h3 className={`font-black text-white tracking-tight leading-tight ${!isGenericErrorHeadline(errorHeadline) ? 'text-2xl font-mono' : 'text-3xl'}`}>
                              {!isGenericErrorHeadline(errorHeadline) ? errorHeadline : displayIssue}
                            </h3>
                            {userFrame && (
                              <p className="text-[13px] font-mono mt-0.5 flex items-center gap-1.5">
                                <span className="text-red-400/50">↳</span>
                                <span className="text-red-400/90 font-bold">{frameLabel(userFrame)}</span>
                              </p>
                            )}
                          </div>
                        ) : (
                          <h3 className="text-3xl font-black text-white tracking-tight leading-tight">
                            {displayIssue}
                          </h3>
                        )}
                        <div className="flex flex-wrap items-center gap-3">
                           <Badge variant="outline" className={`${exec.status === 'ok' ? 'border-emerald-500/30 text-emerald-500' : 'border-red-500/30 text-red-500'} text-[10px] uppercase font-black px-2 py-0.5`}>
                              {exec.status === 'ok' ? 'Success' : 'Aborted'}
                           </Badge>
                           {data.narrative?.pattern_history && (
                              <Badge variant="outline" className="border-red-500/50 bg-red-500/10 text-red-400 text-[10px] uppercase font-black px-2 py-0.5 animate-pulse">
                                 Happened {data.narrative.pattern_history.count} times in last {data.narrative.pattern_history.window_min}m
                              </Badge>
                           )}
                           <span className="text-neutral-600 text-[10px] font-mono uppercase tracking-widest">
                              {exec.duration_ms === 0 ? 'No runtime entry' : `${exec.duration_ms}ms total duration`}
                           </span>
                        </div>
                     </div>

                     {(data.narrative?.root_cause || data.narrative?.synthetic_root_cause) && (
                        <div className={`p-4 rounded-xl space-y-4 ${exec.status === 'ok' ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-red-500/10 border border-red-500/20'}`}>
                           <span className={`text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${exec.status === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
                              <Zap className="w-3 h-3" /> {exec.status === 'ok' ? 'Execution Insight' : 'Root Cause'}
                           </span>
                           {exec.status === 'ok' ? (
                              <div className="space-y-1">
                                 <p className="text-white text-lg font-bold tracking-tight">
                                    {data.narrative?.root_cause}
                                 </p>
                                 {data.narrative?.synthetic_root_cause && (
                                    <p className="text-neutral-400 text-xs leading-relaxed font-medium">
                                       {data.narrative.synthetic_root_cause}
                                    </p>
                                 )}
                              </div>
                           ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-black tracking-[0.2em] text-red-300">Root Cause</span>
                                    <p className="text-white text-sm font-semibold">
                                      {data.narrative?.root_cause && !data.narrative.root_cause.toLowerCase().includes('unhandled exception thrown in user code')
                                        ? data.narrative.root_cause
                                        : userFrame
                                          ? `Unhandled throw at ${frameLabel(userFrame)}`
                                          : 'Unhandled exception in user code'
                                      }
                                    </p>
                                 </div>
                                 <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-black tracking-[0.2em] text-red-300">Details</span>
                                    <p className="text-red-100 text-sm font-mono">{displayDetails}</p>
                                 </div>
                                 <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-black tracking-[0.2em] text-red-300">Phase</span>
                                    <p className="text-neutral-200 text-sm">{data.narrative?.phase || phaseLabel(exec.error_phase)}</p>
                                 </div>
                                 <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-black tracking-[0.2em] text-red-300">Impact</span>
                                    <p className="text-neutral-200 text-sm">{data.narrative?.impact}</p>
                                 </div>
                              </div>
                           )}
                        </div>
                     )}

                     {exec.status !== 'ok' && userFrame && (() => {
                        // Try to get source from artifact for inline preview
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
                             {/* Inline code preview */}
                             {preview && (
                               <div className="rounded-lg overflow-hidden border border-red-900/30 bg-black/90">
                                 <div className="px-4 py-1.5 bg-red-950/20 border-b border-red-900/20 flex items-center justify-between">
                                   <span className="text-[10px] font-mono font-bold text-red-300">{frameLabel(userFrame)}</span>
                                   <span className="text-[9px] text-red-400/50 uppercase font-black tracking-widest">Failure</span>
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
                             {/* Collapsible full stack */}
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

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2 border-y border-neutral-900/50">
                        <div className="space-y-1">
                           <span className="text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em]">Cause Analysis</span>
                           <p className="text-neutral-200 text-sm font-medium leading-relaxed">
                              {data.narrative?.cause && !data.narrative.cause.toLowerCase().includes('unhandled exception')
                              ? data.narrative.cause
                              : exec.status === 'ok'
                                ? `Execution completed successfully in ${exec.duration_ms}ms.`
                                : userFrame
                                  ? `Exception thrown at ${frameLabel(userFrame)}.`
                                  : `Unhandled exception in ${sourceLabel.toLowerCase()}.`}
                           </p>
                        </div>
                        <div className="space-y-1">
                           <span className="text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em]">Impact Assessment</span>
                           <p className="text-neutral-300 text-sm leading-relaxed">
                              {data.narrative?.impact || (exec.status === 'ok' 
                                ? `All ${(data.spans?.length ?? 0)} recorded external steps were committed deterministically.`
                                : `Order was NOT created. Database insert skipped to maintain consistency.`)}
                           </p>
                        </div>
                     </div>

                     <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between gap-4 group hover:border-white/20 transition-all">
                        <div className="flex items-center gap-3">
                           <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded">
                              <Terminal className="w-4 h-4" />
                           </div>
                           <div className="space-y-0.5">
                              <p className="text-white font-bold text-xs uppercase tracking-tight">Recommendation</p>
                              <p className="text-neutral-400 text-xs italic">
                              {fixHint
                                ? (userFrame ? `${fixHint.replace(/\.$/, '')} (${frameLabel(userFrame)}).` : fixHint)
                                : userFrame
                                  ? `This exception originates from ${frameLabel(userFrame)}. ${displaySuggestion.replace(/^.*?\. /, '')}`
                                  : displaySuggestion}
                              </p>
                           </div>
                        </div>
                     </div>

                     {data.narrative?.confidence_reason && (
                        <p className="text-[11px] text-neutral-500 italic border-t border-neutral-900/50 pt-3">
                           {data.narrative.confidence_reason}
                        </p>
                     )}

                     {data.narrative?.anomaly && (
                        <div className="pt-4 border-t border-neutral-900/50 space-y-3">
                           <span className="text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em]">Behavior compared to recent executions</span>
                           <div className="flex items-center gap-6">
                              <div className="space-y-0.5">
                                 <p className="text-[10px] text-neutral-500 uppercase font-bold">24h Avg Duration</p>
                                 <p className="text-white font-mono text-sm">{data.narrative.anomaly.avg_duration}ms</p>
                              </div>
                              <div className="h-8 w-px bg-neutral-900" />
                              <div className="space-y-0.5">
                                 <p className="text-[10px] text-neutral-500 uppercase font-bold">Current</p>
                                 <p className={`${data.narrative.anomaly.is_abnormal ? 'text-orange-400' : 'text-emerald-400'} font-mono text-sm`}>{exec.duration_ms}ms</p>
                              </div>
                              <div className="h-8 w-px bg-neutral-900" />
                              <div className="space-y-0.5">
                                 <p className="text-[10px] text-neutral-500 uppercase font-bold">Status</p>
                                 <p className="text-white text-xs uppercase font-black">{data.narrative.anomaly.is_abnormal ? 'Abnormal' : 'Normal'}</p>
                              </div>
                           </div>
                           <p className="text-[10px] text-neutral-500 italic">
                             {data.narrative.anomaly.message}
                           </p>
                        </div>
                     )}

                     {data.narrative?.next_steps && data.narrative.next_steps.length > 0 && (
                        <div className="space-y-3 pt-2">
                           <span className="text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em]">Next Diagnostic Steps</span>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {data.narrative.next_steps.map((step, i) => (
                                 <div key={i} className="flex items-start gap-3 bg-neutral-900/30 p-2.5 rounded-lg border border-neutral-800/50">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] font-black text-neutral-400">{i + 1}</span>
                                    <p className="text-neutral-400 text-[11px] leading-tight mt-0.5">{step}</p>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}
                 </div>
           </CardContent>
        </Card>
      </section>

      {/* 4. REPLAY COMMAND */}
      <div className="flex items-center gap-3 px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg">
        <Terminal className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
        <code className="text-[11px] font-mono text-neutral-300 flex-1 select-all">flux replay {exec_id}</code>
        <button
          onClick={copyReplay}
          className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-500 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
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



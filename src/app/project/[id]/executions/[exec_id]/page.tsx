"use client";
import { useEffect, useState, use } from "react";
import { useFluxApi } from "@/lib/api";
import { Activity, Terminal, ExternalLink, Copy, Check, ChevronRight, Zap, Globe, Database, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExecutionDetail as ExecutionDetailType, Checkpoint, LogEntry } from "@/types/api";

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
  return frame.col != null ? `${file}:${frame.line}:${frame.col}` : `${file}:${frame.line}`;
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

  const stackFrames = parseStackFrames(exec.error_stack);
  const userFrame: { fn?: string; file: string; line: string | number; col?: string | number } | null =
    (exec.error_frames?.length ?? 0) > 0
      ? exec.error_frames![0]
      : (stackFrames.find(f =>
          !f.file.includes('ext:') && !f.file.includes('deno:') && !f.file.includes('node:') && !f.file.includes('internal/')
        ) ?? null);
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
    <div className="space-y-12 pb-24 max-w-5xl mx-auto">
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

      {/* REPLAY BLOCK - THE MAGIC MOMENT */}
      <Card className="relative overflow-hidden group border-blue-500/20 bg-blue-500/5 backdrop-blur-sm">
        <div className="absolute inset-0 bg-blue-600/5 blur-2xl group-hover:bg-blue-600/10 transition-all duration-1000" />
        <CardContent className="relative p-8 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.2)]">
                 <RepeatIcon className="w-6 h-6" />
              </div>
              <div>
                 <h4 className="text-white font-bold text-lg tracking-tight">Replay this execution locally</h4>
                 <p className="text-neutral-500 text-sm mt-0.5">Hydrate your local runtime with the exact state of this production call.</p>
              </div>
           </div>
           <button
             onClick={copyReplay}
             className="w-full md:w-auto flex items-center justify-between gap-4 bg-black/50 border border-neutral-800 px-5 py-3 rounded-xl font-mono text-sm hover:border-blue-500/50 transition-all active:scale-95 group/btn"
           >
              <code className="text-blue-400">flux replay {exec_id.slice(0, 8)}</code>
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-neutral-600 group-hover/btn:text-white transition-colors" />}
           </button>
        </CardContent>
      </Card>

      {/* INSIGHT CARD - RUTHLESS CLARITY */}
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <Card className={`overflow-hidden border-none shadow-2xl bg-gradient-to-br ${exec.status === 'ok' ? 'from-emerald-950/20 via-black to-black' : 'from-red-950/20 via-black to-black'}`}>
           <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row gap-10 items-start">
                 <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shrink-0 ${exec.status === 'ok' ? 'bg-emerald-500/10 text-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.15)]' : 'bg-red-500/10 text-red-500 shadow-[0_0_40px_rgba(239,68,68,0.15)]'}`}>
                    {exec.status === 'ok' ? <Zap className="w-10 h-10" /> : <Activity className="w-10 h-10" />}
                 </div>
                 
                 <div className="space-y-6 flex-1">
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
                           <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                              <span className="text-[9px] font-bold text-neutral-500 uppercase">Confidence {confidenceText}</span>
                              <div className="w-12 h-1 bg-neutral-800 rounded-full overflow-hidden">
                                 <div 
                                    className="h-full bg-blue-500 transition-all duration-1000" 
                                    style={{ width: `${(data.narrative?.confidence ?? 0.85) * 100}%` }}
                                 />
                              </div>
                              <span className="text-[9px] font-black text-blue-400">{(data.narrative?.confidence ?? 0.85) * 100}%</span>
                           </div>
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
                              <p className="text-neutral-600 text-[11px] font-mono">
                                ↳ <span className="text-red-400/80">{userFrame.fn ?? '<anonymous>'}</span>
                                {' '}<span className="text-neutral-700">{frameLabel(userFrame)}</span>
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
                                    <p className="text-white text-sm font-semibold">{data.narrative?.root_cause || "Unhandled exception thrown in user code"}</p>
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

                     {exec.status !== 'ok' && (exec.error_frames?.length ?? stackFrames.length) > 0 && (() => {
                        const displayFrames: { fn?: string; file: string; line: string | number; col?: string | number }[] =
                          exec.error_frames?.length ? exec.error_frames : stackFrames;
                        const limit = 5;
                        return (
                          <div className="space-y-2">
                             <button
                               onClick={() => setShowStack(v => !v)}
                               className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-400 hover:text-red-300 transition-colors"
                             >
                               <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${showStack ? 'rotate-90' : ''}`} />
                               Stack trace — {displayFrames.length} frame{displayFrames.length !== 1 ? 's' : ''}
                             </button>
                             {showStack && (
                               <div className="bg-black/80 border border-red-900/20 rounded-lg overflow-hidden">
                                 {displayFrames.slice(0, limit).map((frame, i) => (
                                   <div key={i} className={`px-4 py-1.5 border-b border-neutral-900/40 last:border-0 font-mono text-[11px] flex gap-3 ${i === 0 ? 'bg-red-950/30' : ''}`}>
                                     <span className="text-neutral-700 w-5 shrink-0 text-right">{i + 1}</span>
                                     <div className="min-w-0">
                                       <span className={i === 0 ? 'text-red-300' : 'text-neutral-400'}>{frame.fn ?? '<anonymous>'}</span>
                                       {frame.file && <span className="text-neutral-700 ml-2">{frameLabel(frame)}</span>}
                                     </div>
                                   </div>
                                 ))}
                                 {displayFrames.length > limit && (
                                   <div className="px-4 py-2 text-[10px] text-neutral-600 font-mono italic">+{displayFrames.length - limit} more frames</div>
                                 )}
                               </div>
                             )}
                          </div>
                        );
                     })()}

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-2 border-y border-neutral-900/50">
                        <div className="space-y-1">
                           <span className="text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em]">Cause Analysis</span>
                           <p className="text-neutral-200 text-sm font-medium leading-relaxed">
                              {data.narrative?.cause || (exec.status === 'ok' 
                                ? `Execution completed successfully in ${exec.duration_ms}ms.` 
                                : `Unhandled exception in ${sourceLabel.toLowerCase()}.`)}
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

                     <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between gap-6 group hover:border-white/20 transition-all">
                        <div className="flex items-center gap-4">
                           <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                              <Terminal className="w-5 h-5" />
                           </div>
                           <div className="space-y-0.5">
                              <p className="text-white font-bold text-xs uppercase tracking-tight">Intelligence Recommendation</p>
                              <p className="text-neutral-400 text-xs italic">
                              {fixHint || displaySuggestion}
                              </p>
                           </div>
                        </div>
                        <Button onClick={copyReplay} variant="ghost" className="h-10 px-4 text-xs font-black text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 uppercase tracking-widest">
                           <Zap className="w-4 h-4 mr-2" />
                           Reproduce reality
                        </Button>
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
              </div>
           </CardContent>
        </Card>
      </section>

      {/* MOMENT OF WOW CALLOUT (Only for new projects) */}
      {id === 'default' && (
        <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-6 flex items-center justify-between gap-8 animate-pulse shadow-[0_0_50px_rgba(37,99,235,0.1)]">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-black">!</div>
              <div>
                 <h4 className="text-white font-bold text-sm">Wait! Don't just look at this. Replay it locally.</h4>
                 <p className="text-blue-400/60 text-[11px] mt-0.5">This execution is a real data snapshot. Running `flux replay` will pull the exact Stripe response into your local dev server.</p>
              </div>
           </div>
           <Button onClick={copyReplay} className="bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest px-6 h-9">
              Copy Command
           </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
         {/* LEFT PANEL: EXTERNAL CALLS SUMMARY */}
         <section className="lg:col-span-4 space-y-6">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-neutral-600 flex items-center gap-2 px-1">
               <Globe className="w-3.5 h-3.5 text-blue-500/60" />
               External Steps
            </h3>
            
            <div className="space-y-3">
                {(data.spans?.length ?? 0) === 0 ? (
                   <div className="py-12 flex flex-col items-center justify-center text-center bg-neutral-900/10 border border-dashed border-neutral-900 rounded-xl">
                      <Zap className="w-5 h-5 text-neutral-800 mb-2" />
                      <span className="text-[10px] font-mono uppercase text-neutral-600 tracking-tighter italic">No external calls detected</span>
                      <span className="text-[9px] text-neutral-700 uppercase font-bold mt-1 tracking-widest">→ Execution was fully internal</span>
                   </div>
               ) : (
                  data.spans?.map((span, i: number) => (
                    <div key={i} className="group p-4 bg-black border border-neutral-900 rounded-xl hover:border-neutral-700 transition-all cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-2">
                            {span.type === 'db' ? <Database className="w-3.5 h-3.5 text-purple-500" /> : <Globe className="w-3.5 h-3.5 text-blue-500" />}
                            <span className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{span.type}</span>
                         </div>
                         <span className="text-[10px] font-mono text-neutral-600">{span.duration_ms}ms</span>
                      </div>
                      <code className="text-[11px] text-neutral-300 font-mono block truncate opacity-80 group-hover:opacity-100 transition-opacity">
                        {span.label || 'Internal Sub-Routine'}
                      </code>
                    </div>
                  ))
               )}
               
               {exec.status !== 'ok' && (
                  <div className="p-4 bg-red-950/10 border border-red-900/20 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                       <Terminal className="w-3.5 h-3.5 text-red-500" />
                       <span className="text-[10px] font-black uppercase text-red-500 tracking-widest">Halt Reason</span>
                    </div>
                  <code className="text-[11px] text-red-400 font-mono italic whitespace-pre-wrap">
                     {!isGenericErrorHeadline(errorHeadline) ? (
                       <>
                         {errorHeadline}
                         {userFrame && <><br /><span className="text-neutral-600">at {frameLabel(userFrame, false)}</span></>}
                       </>
                     ) : haltReason}
                  </code>
                  </div>
               )}
            </div>
         </section>

         {/* RIGHT PANEL: PAYLOADS */}
         <section className="lg:col-span-8 space-y-6">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-neutral-600 flex items-center gap-2 px-1">
               <Activity className="w-3.5 h-3.5 text-emerald-500/60" />
               Raw Context
            </h3>
            
            <div className="grid grid-cols-1 gap-6">
               <Card className="bg-[#0c0c0c] border-neutral-900 shadow-inner overflow-hidden border-l-2 border-l-blue-900/30">
                  <div className="bg-neutral-900/40 border-b border-neutral-800/50 px-4 py-2 flex items-center justify-between">
                     <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Request Payload</span>
                  </div>
                  <pre className="p-6 text-[12px] font-mono leading-relaxed text-neutral-300 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-800">
                     {JSON.stringify(reqObj, null, 2)}
                  </pre>
               </Card>

               {Object.keys(reqHeaders).length > 0 && (
                  <Card className="bg-[#0c0c0c] border-neutral-900 shadow-inner overflow-hidden border-l-2 border-l-neutral-800">
                     <div className="bg-neutral-900/40 border-b border-neutral-800/50 px-4 py-2 flex items-center gap-3">
                        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Request Headers</span>
                        <div className="flex items-center gap-1.5 ml-1">
                           {authHeaders.length > 0 && <span className="text-[9px] font-bold text-orange-400/70 bg-orange-950/20 border border-orange-900/30 px-1.5 py-0.5 rounded uppercase">auth {authHeaders.length}</span>}
                           {infraHeaders.length > 0 && <span className="text-[9px] font-bold text-blue-400/60 bg-blue-950/20 border border-blue-900/30 px-1.5 py-0.5 rounded uppercase">infra {infraHeaders.length}</span>}
                           {userHeaders.length > 0 && <span className="text-[9px] font-bold text-neutral-500 bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded uppercase">user {userHeaders.length}</span>}
                        </div>
                     </div>
                     <div className="p-4 space-y-1.5 max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-800">
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
                     </div>
                  </Card>
               )}

               <Card className={`bg-[#0c0c0c] border-neutral-900 shadow-inner overflow-hidden border-l-2 ${exec.status === 'ok' ? 'border-l-emerald-900/30' : 'border-l-red-900/30'}`}>
                  <div className="bg-neutral-900/40 border-b border-neutral-800/50 px-4 py-2 flex items-center justify-between">
                     <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Response Output</span>
                  </div>
                  <pre className="p-6 text-[12px] font-mono leading-relaxed text-neutral-400 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-800">
                     {JSON.stringify(
                       exec.status !== 'ok' && exec.error_frames?.[0]
                         ? { ...resObj, frame: exec.error_frames[0] }
                         : resObj,
                       null, 2
                     )}
                  </pre>
               </Card>
            </div>
         </section>
      </div>

      {(data.spans?.length ?? 0) > 0 && (
        <section className="space-y-6">
           <h3 className="text-[11px] font-black uppercase tracking-widest text-neutral-600 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-indigo-500/60" />
              Determinism Trace (Step-by-Step)
           </h3>
           <div className="space-y-3 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-neutral-900">
              {data.spans?.map((span, i: number) => (
                <div key={i} className="flex gap-6 items-center group relative">
                   <div className="w-10 h-10 rounded-full bg-black border-2 border-neutral-900 flex items-center justify-center z-10 group-hover:border-blue-500 transition-colors shadow-xl">
                      {span.type === 'js' ? <Terminal className="w-4 h-4 text-emerald-500" /> : <Globe className="w-4 h-4 text-blue-500" />}
                   </div>
                   <Card className="flex-1 bg-[#111] border-neutral-900 p-4 flex items-center justify-between hover:border-neutral-700 transition">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-neutral-200 uppercase tracking-tighter">{span.type} Layer</span>
                        <code className="text-[12px] text-neutral-500 mt-1 max-w-[300px] truncate">{span.label || 'Execution'}</code>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-mono text-neutral-600">{span.duration_ms}ms</span>
                        <span className="text-[10px] text-green-500 font-bold mt-1">✓ RECORDED</span>
                      </div>
                   </Card>
                </div>
              ))}
              {exec.status !== 'ok' && (
                <div className="flex gap-6 items-center relative">
                   <div className="w-10 h-10 rounded-full bg-red-950 border-2 border-red-800 flex items-center justify-center z-10 shadow-xl">
                      <span className="text-red-400 text-base leading-none font-bold">✕</span>
                   </div>
                   <Card className="flex-1 bg-red-950/10 border-red-900/30 p-4 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-red-300 uppercase tracking-tighter">Failure Point</span>
                        <code className="text-[12px] text-red-500/70 mt-1 font-mono truncate max-w-[300px]">
                          {!isGenericErrorHeadline(errorHeadline) ? errorHeadline : (haltReason ?? 'Execution aborted')}
                        </code>
                        {userFrame && (
                          <span className="text-[10px] text-neutral-600 font-mono mt-0.5">at {frameLabel(userFrame)}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-red-500 font-bold shrink-0">✕ ABORTED</span>
                   </Card>
                </div>
              )}
           </div>
        </section>
      )}

      {(data.logs?.length ?? 0) > 0 && (
        <section className="space-y-4">
           <h3 className="text-[11px] font-black uppercase tracking-widest text-neutral-600 flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-zinc-500" />
              Isolate Console Output
           </h3>
           <Card className="bg-black border-neutral-900 p-6 font-mono text-[13px] space-y-2 shadow-2xl">
              {(data.logs ?? []).map((log: LogEntry) => (
                <div key={log.seq} className="flex gap-6 border-l-2 border-neutral-900 pl-4 py-1 hover:bg-neutral-900/30 transition-colors rounded-r">
                   <span className="text-neutral-700 w-20 flex-shrink-0">+{log.seq}s</span>
                   <span className={log.level === 'error' ? 'text-red-400' : 'text-neutral-400'}>{log.message ?? log.args_json}</span>
                </div>
              ))}
           </Card>
        </section>
      )}
    </div>
  );
}

function RepeatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>
    </svg>
  );
}

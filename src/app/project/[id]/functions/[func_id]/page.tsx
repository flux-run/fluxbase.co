"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useFluxApi } from "@/lib/api";
import { toast } from "sonner";
import { Zap, Activity, AlertCircle, Clock, Globe, Terminal, Save, Play, ArrowUpRight, BarChart3, AlertOctagon, LucideIcon, Lightbulb, User } from "lucide-react";
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

function confidenceLabel(confidence?: number) {
  if ((confidence ?? 0) >= 0.85) return "High";
  if ((confidence ?? 0) >= 0.65) return "Medium";
  return "Low";
}

export default function FunctionDetail({ params }: { params: Promise<{ id: string, func_id: string }> }) {
  const { id, func_id } = use(params);
  const api = useFluxApi(id);
  const [data, setData] = useState<Function | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [statsData, setStatsData] = useState<FunctionStatsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExecId, setSelectedExecId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const loadData = async () => {
    if (!api.ready) return;

    try {
      const [func, execs, st] = await Promise.all([
        api.getFunction(func_id),
        api.getFunctionExecutions(func_id),
        api.getFunctionStats(func_id)
      ]);
      setData(func);
      setExecutions(execs);
      setStatsData(st);
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
      ? isGenericIssue
        ? "An unhandled exception was detected. Wrap the offending code in a try-catch to handle the error gracefully."
        : `Unhandled exception detected: ${activeIssue}. Remove or handle this throw to allow execution to complete.`
      : null;
  const confidenceText = confidenceLabel(statsData?.root_cause?.confidence);

  return (
    <div className="space-y-10 pb-20">
      <header className="flex justify-between items-start border-b border-neutral-900 pb-8">
        <div>
          <div className="flex items-center gap-3">
             <div className="p-1.5 bg-blue-600/10 border border-blue-600/20 rounded">
                <Zap className="w-5 h-5 text-blue-500" />
             </div>
             <h2 className="text-3xl font-bold text-white tracking-tight">{data.name}</h2>
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

      {statsData?.root_cause && (
        <div 
          onClick={() => setFilter(filter === activeIssue ? null : activeIssue)}
          className={`bg-gradient-to-br from-red-950/40 to-black border ${filter === activeIssue ? 'border-red-500 ring-1 ring-red-500' : 'border-red-900/50'} rounded-xl p-8 relative overflow-hidden shadow-2xl transition-all cursor-pointer group hover:scale-[1.01]`}
        >
           <div className="absolute top-0 left-0 w-1 h-full bg-red-500 shadow-[0_0_20px_theme(colors.red.500)]" />
           <div className="absolute top-0 right-0 p-3 opacity-20"><AlertCircle className="w-48 h-48 text-red-500" /></div>
           <div className="relative z-10 flex flex-col xl:flex-row gap-8 items-start justify-between">
              <div className="space-y-4 flex-1">
                 <div className="flex items-center gap-2">
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5 uppercase tracking-wider shadow-[0_0_10px_theme(colors.red.500/50)] animate-pulse">
                       <Zap className="w-3 h-3" />
                       Active Anomaly
                    </span>
                    {filter && (
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                         Filtering Active
                      </span>
                    )}
                 </div>
                 <h3 className="text-3xl font-bold text-red-50 leading-tight max-w-2xl">{activeIssue}</h3>
                 <div className="text-red-200/80 font-mono text-sm border-l-2 border-red-500/30 pl-4 py-1 space-y-1">
                    <span className="block font-bold text-red-400 mb-1">Detected Cause</span>
                    {statsData.root_cause.cause}
                    {statsData.root_cause.phase && (
                      <div className="text-[11px] text-red-200/60">Phase: {statsData.root_cause.phase}</div>
                    )}
                 </div>
                 
                 {/* Latest Failure Snapshot */}
                 {statsData.root_cause.latest_failure && (
                    <div className="mt-6 bg-black/60 border border-neutral-800 rounded-lg p-4 max-w-2xl">
                       <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Activity className="w-3 h-3" /> Latest Failure Snapshot
                       </div>
                       <div className="grid grid-cols-3 gap-4 mb-3">
                          <div className="bg-neutral-900/40 p-2 rounded">
                             <div className="text-[9px] text-neutral-600 uppercase font-bold">Time</div>
                             <div className="text-xs font-mono text-neutral-300">
                                {statsData.root_cause.latest_failure.time ? new Date(statsData.root_cause.latest_failure.time).toLocaleTimeString() : "N/A"}
                             </div>
                          </div>
                          <div className="bg-neutral-900/40 p-2 rounded">
                             <div className="text-[9px] text-neutral-600 uppercase font-bold">Duration</div>
                             <div className="text-xs font-mono text-neutral-300">{statsData.root_cause.latest_failure.duration}</div>
                          </div>
                          <div className="bg-neutral-900/40 p-2 rounded">
                             <div className="text-[9px] text-neutral-600 uppercase font-bold">Result</div>
                             <div className="text-xs font-mono text-red-400 font-bold truncate">
                                {statsData.root_cause.latest_failure.error || "Unknown error"}
                             </div>
                          </div>
                       </div>
                       <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedExecId(statsData.root_cause!.latest_failure!.id); setIsDrawerOpen(true); }}
                          className="text-[10px] font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1.5 uppercase transition-colors"
                       >
                          View Full Trace <ArrowUpRight className="w-3 h-3" />
                       </button>
                    </div>
                 )}

                 {anomalySuggestion && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3 text-xs text-blue-300 flex items-start gap-2 max-w-lg mt-4 shadow-inner">
                       <Lightbulb className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                       <div>
                          <span className="font-bold text-blue-400 block mb-0.5">Recommended Action</span>
                          {anomalySuggestion}
                       </div>
                    </div>
                 )}
              </div>
              
              <div className="flex flex-col gap-4 w-full xl:w-72 shrink-0 bg-black/40 p-5 rounded-lg border border-red-950/60 backdrop-blur-sm">
                 <div className="flex justify-between items-center gap-8">
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Confidence</span>
                    <div className="flex items-center gap-2">
                       <div className="w-20 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${statsData.root_cause.confidence > 0.8 ? 'bg-green-500' : statsData.root_cause.confidence > 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                            style={{ width: `${statsData.root_cause.confidence * 100}%` }} 
                          />
                       </div>
                       <span className={`font-mono text-[11px] font-bold ${statsData.root_cause.confidence > 0.8 ? 'text-green-400' : statsData.root_cause.confidence > 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {confidenceText} {Math.round(statsData.root_cause.confidence * 100)}%
                       </span>
                    </div>
                 </div>
                 {statsData.root_cause.confidence_reason && (
                    <div className="text-[11px] text-neutral-500 leading-relaxed">
                       {statsData.root_cause.confidence_reason}
                    </div>
                 )}
                  <div className="flex justify-between items-center gap-8">
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Impact</span>
                    <span className="font-mono text-red-400 font-bold">{statsData.root_cause.impact}</span>
                 </div>
                 {statsData.impact_stats && (
                    <div className="flex justify-between items-center gap-8">
                       <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Users Affected</span>
                       <span className="font-mono text-neutral-300 font-bold">{statsData.impact_stats.unique_ips} IPs</span>
                    </div>
                 )}
                 <div className="bg-red-500/5 rounded p-3 border border-red-500/10 mt-2">
                    <div className="text-[10px] text-neutral-600 uppercase font-bold mb-1">Timeline correlation</div>
                    <div className="text-[11px] text-neutral-400 font-mono">
                       Anomaly started {new Date(statsData.root_cause.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

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
              <table className="w-full text-left text-[13px] font-mono">
                <thead className="bg-[#111] border-b border-neutral-800 text-neutral-600 text-[10px]">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">STATUS</th>
                    <th className="px-4 py-3">DURATION</th>
                    <th className="px-4 py-3">TYPE</th>
                    <th className="px-4 py-3">SOURCE</th>
                    <th className="px-4 py-3">CALLER</th>
                    <th className="px-4 py-3 text-right">TIME</th>
                  </tr>
                </thead>
                <tbody>
                  {(executions ?? [])
                    .filter((exec) => {
                      const headline = formatErrorHeadline(
                        exec.error_name,
                        exec.error_message,
                        exec.error,
                        exec.error_stack,
                      );
                      return !filter || headline.includes(filter) || exec.status.includes(filter);
                    })
                    .map((exec) => (
                    <tr 
                      key={exec.id} 
                      onClick={() => { setSelectedExecId(exec.id); setIsDrawerOpen(true); }}
                      className="border-b border-neutral-900 last:border-0 hover:bg-neutral-900/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3">
                          <span className="text-blue-500 group-hover:underline text-left font-bold">
                            {exec.id.slice(0, 8)}
                          </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className={`font-bold ${exec.status === 'ok' ? 'text-green-500' : 'text-red-500'}`}>{exec.status.toUpperCase()}</span>
                        {exec.status === 'error' && (
                           <div
                             className="text-[10px] text-red-400/80 mt-1 truncate max-w-[240px] font-mono"
                             title={formatErrorHeadline(exec.error_name, exec.error_message, exec.error, exec.error_stack)}
                           >
                             {formatErrorHeadline(exec.error_name, exec.error_message, exec.error, exec.error_stack)}
                           </div>
                        )}
                      </td>
                       <td className="px-4 py-3 text-neutral-500">{exec.duration_ms}ms</td>
                       <td className="px-4 py-3">
                          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded">
                             {exec.error_type || 'default'}
                          </span>
                       </td>
                       <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold uppercase tracking-wider border px-1.5 py-0.5 rounded ${
                             exec.error_source === 'user_code' ? 'text-blue-400 border-blue-900/50 bg-blue-950/20' : 
                             exec.error_source?.startsWith('platform') ? 'text-orange-400 border-orange-900/50 bg-orange-950/20' : 
                             'text-neutral-500 border-neutral-800 bg-neutral-900/50'
                          }`}>
                             {exec.error_source ? exec.error_source.replace('_', ' ') : 'N/A'}
                          </span>
                       </td>
                       <td className="px-4 py-3 text-neutral-600 truncate max-w-[100px]" title={exec.client_ip || 'Internal'}>
                          <div className="flex items-center gap-1.5 grayscale opacity-50">
                             <User className="w-3 h-3" />
                             {exec.client_ip?.slice(0, 7) || 'system'}
                          </div>
                       </td>
                       <td className="px-4 py-3 text-right text-neutral-600">{new Date(exec.started_at ?? new Date().toISOString()).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                  {executions.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-neutral-700 italic underline-offset-4 decoration-neutral-800 decoration-dashed underline">Waiting for live data surge...</td></tr>
                  )}
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
            {statsData?.top_issues && statsData.top_issues.length > 0 ? (
              <div className="flex flex-col gap-2">
                 {statsData.top_issues.map((issue, i) => (
                  <div key={i} className="bg-[#111] border border-neutral-800 px-4 py-3 rounded-lg flex items-center justify-between font-mono text-sm transition hover:border-neutral-700 cursor-pointer group">
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="flex flex-col items-center justify-center shrink-0 w-10 h-10 bg-red-950/30 rounded border border-red-900/40 group-hover:border-red-500/50 transition-colors">
                        <span className="text-red-500 text-xs font-bold">{issue.count}</span>
                        <span className="text-[8px] text-red-500/60 uppercase">Hits</span>
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-neutral-200 truncate font-semibold" title={issue.title}>{issue.title}</span>
                        <span className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">{issue.fingerprint.slice(0, 8)}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right ml-4 hidden sm:block">
                      <div className="text-xs text-neutral-400 font-medium">{new Date(issue.last_seen).toLocaleTimeString()}</div>
                      <div className="text-[10px] text-neutral-600 mt-1">Last seen</div>
                    </div>
                  </div>
                 ))}
              </div>
            ) : (
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

          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500">Environment</h3>
              <button className="text-neutral-700 cursor-not-allowed flex items-center gap-1.5 text-xs font-bold">
                <Save className="w-3 h-3" />
                Save
              </button>
            </div>
            <div className="bg-neutral-950 border border-neutral-900 rounded-xl p-4 space-y-4 shadow-inner">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">DATABASE_URL</label>
                  <input type="password" value="********" readOnly className="w-full bg-black border border-neutral-800 rounded p-2 text-xs font-mono text-neutral-400 cursor-not-allowed" />
               </div>
               <button className="w-full bg-neutral-900 border border-neutral-800 py-1.5 rounded text-[11px] font-bold text-neutral-400 hover:bg-neutral-800 transition">Manage Secrets</button>
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

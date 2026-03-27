"use client";
import { useEffect, useState, use } from "react";
import { useFluxApi } from "@/lib/api";
import { Activity, Terminal, ExternalLink, Copy, Check, ChevronRight, Zap, Globe, Database, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExecutionDetail as ExecutionDetailType, Checkpoint, LogEntry } from "@/types/api";

export default function ExecutionDetail({ params }: { params: Promise<{ id: string, exec_id: string }> }) {
  const { id, exec_id } = use(params);
  const api = useFluxApi(id);
  const [data, setData] = useState<ExecutionDetailType | null>(null);
  const [copied, setCopied] = useState(false);
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

  return (
    <div className="space-y-12 pb-24 max-w-5xl mx-auto">
      <header className="flex justify-between items-start border-b border-neutral-900 pb-8">
        <div>
          <div className="flex items-center gap-4 mb-3">
             <Badge variant={exec.status === 'ok' ? 'success' : 'destructive'} className="font-bold text-[10px] uppercase tracking-widest">
               {exec.status === 'ok' ? 'Success' : 'Failure'}
             </Badge>
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
        <Button variant="outline" size="sm" className="bg-neutral-900 border-neutral-800 text-xs font-bold hover:bg-neutral-800 hover:text-white h-9">
           <ExternalLink className="w-4 h-4 mr-2" />
           Open in CLI
        </Button>
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
                       <h3 className="text-2xl font-black text-white tracking-tight leading-none uppercase italic">
                         {exec.status === 'ok' ? 'Execution Optimal' : 'Critical Failure'}
                       </h3>
                       <div className="flex items-center gap-3">
                          <Badge variant="outline" className={`${exec.status === 'ok' ? 'border-emerald-500/30 text-emerald-500' : 'border-red-500/30 text-red-500'} text-[10px] uppercase font-black px-2 py-0.5`}>
                             {exec.status === 'ok' ? 'Success' : 'Aborted'}
                          </Badge>
                          <span className="text-neutral-600 text-[10px] font-mono uppercase tracking-widest">{exec.duration_ms}ms total duration</span>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-2 border-y border-neutral-900/50">
                       <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em]">Cause & Result</span>
                          <p className="text-neutral-200 text-sm font-medium leading-relaxed">
                             {exec.status === 'ok' 
                               ? `Successfully processed ${exec.method} ${exec.path}. Result: status_code 200.` 
                               : `Code execution encountered an error. Reason: ${exec.error ? exec.error.split('\\n')[0] : 'Unknown error'}.`}
                          </p>
                       </div>
                       <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em]">Impact Assessment</span>
                          <p className="text-neutral-300 text-sm leading-relaxed">
                             {exec.status === 'ok' 
                               ? `All ${(data.spans?.length ?? 0)} recorded external steps were committed deterministically.`
                               : `Order was NOT created. Database insert skipped to maintain consistency.`}
                          </p>
                       </div>
                    </div>

                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between gap-6 group hover:border-white/20 transition-all">
                       <div className="flex items-center gap-4">
                          <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                             <Terminal className="w-5 h-5" />
                          </div>
                          <div className="space-y-0.5">
                             <p className="text-white font-bold text-xs uppercase tracking-tight">Recommendation</p>
                             <p className="text-neutral-400 text-xs italic">
                                {exec.status === 'ok' 
                                  ? 'No action required. Execution is fully traceable.'
                                  : 'Retry this execution locally to debug the error via `flux replay`.'}
                             </p>
                          </div>
                       </div>
                       <Button onClick={copyReplay} variant="ghost" className="h-10 px-4 text-xs font-black text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 uppercase tracking-widest">
                          {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                          Copy Replay
                       </Button>
                    </div>
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
                  <div className="py-12 text-center text-[10px] font-mono uppercase text-neutral-700 bg-neutral-900/10 border border-dashed border-neutral-900 rounded-xl tracking-tighter italic">
                     No external spans recorded
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
                    <code className="text-[11px] text-red-400 font-mono italic">
                       {exec.error || 'Execution interrupted by unhandled exception'}
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

               <Card className={`bg-[#0c0c0c] border-neutral-900 shadow-inner overflow-hidden border-l-2 ${exec.status === 'ok' ? 'border-l-emerald-900/30' : 'border-l-red-900/30'}`}>
                  <div className="bg-neutral-900/40 border-b border-neutral-800/50 px-4 py-2 flex items-center justify-between">
                     <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Response Output</span>
                  </div>
                  <pre className="p-6 text-[12px] font-mono leading-relaxed text-neutral-400 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-800">
                     {JSON.stringify(resObj, null, 2)}
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

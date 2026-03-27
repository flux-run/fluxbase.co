"use client";
import { useEffect, useState } from "react";
import { X, Clock, Terminal, Globe, Activity, ChevronRight, AlertCircle, Cpu } from "lucide-react";
import { ExecutionDetail } from "@/types/api";
import { useFluxApi } from "@/lib/api";

interface ExecutionDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  execId: string;
  projectId: string;
}

export function ExecutionDetailDrawer({ isOpen, onClose, execId, projectId }: ExecutionDetailDrawerProps) {
  const api = useFluxApi(projectId);
  const [detail, setDetail] = useState<ExecutionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && execId && api.ready) {
      setLoading(true);
      api.getExecution(execId)
        .then(setDetail)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, execId, api.ready]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Drawer */}
      <div className="relative w-full max-w-2xl bg-[#0a0a0a] border-l border-neutral-800 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <header className="p-6 border-b border-neutral-900 flex justify-between items-center bg-[#0c0c0c]">
          <div>
            <div className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${detail?.execution.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
              <h3 className="text-xl font-bold text-white font-mono">Execution {execId.slice(0, 8)}</h3>
            </div>
            <p className="text-xs text-neutral-500 mt-1 font-mono">{execId}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-900 rounded-full text-neutral-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-neutral-800">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-50">
              <Activity className="w-8 h-8 animate-spin text-blue-500" />
              <span className="text-xs font-mono uppercase tracking-widest">Reconstructing Trace...</span>
            </div>
          ) : detail ? (
            <>
              {/* Summary Section */}
              <section className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-900/40 border border-neutral-800 p-4 rounded-lg">
                  <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Duration
                  </div>
                  <div className="text-xl font-mono text-neutral-100">{detail.execution.duration_ms}ms</div>
                </div>
                <div className="bg-neutral-900/40 border border-neutral-800 p-4 rounded-lg">
                  <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                    <Globe className="w-3 h-3" /> Client
                  </div>
                  <div className="text-xs font-mono text-neutral-300 truncate" title={detail.execution.client_ip || 'Internal'}>
                    {detail.execution.client_ip || 'Internal System'}
                  </div>
                </div>
              </section>

              {/* Temporal Breakdown (Waterfall) */}
              <section>
                <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5" /> Temporal Breakdown
                </h4>
                <div className="space-y-2">
                  {detail.spans.map((span, i) => (
                    <div key={i} className="group flex items-center gap-4">
                      <div className="w-24 shrink-0 text-[10px] font-mono text-neutral-600 uppercase tracking-tight truncate" title={span.type}>
                         {span.type}
                      </div>
                      <div className="flex-1 h-6 bg-neutral-950 rounded relative overflow-hidden ring-1 ring-neutral-900">
                        <div 
                          className={`absolute inset-y-0 ${
                            span.type === 'js' ? 'bg-blue-600/60' : 
                            span.type === 'db' ? 'bg-purple-600/60' : 
                            span.type === 'http' ? 'bg-orange-600/60' : 'bg-neutral-600/60'
                          } border-x border-white/10`}
                          style={{ 
                            left: `${(span.start_ms / detail.execution.duration_ms!) * 100}%`,
                            width: `${(span.duration_ms / detail.execution.duration_ms!) * 100}%`,
                            minWidth: '2px'
                          }}
                        />
                        <div className="absolute inset-0 flex items-center px-2 pointer-events-none">
                           <span className="text-[9px] font-mono font-bold text-white/50">{span.label || span.type} ({span.duration_ms}ms)</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Request Metadata */}
              <section className="space-y-4">
                <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5" /> Request Metadata
                </h4>
                <div className="bg-black border border-neutral-900 rounded-lg overflow-hidden">
                   <div className="bg-neutral-950 px-4 py-2 border-b border-neutral-900 text-[10px] font-mono text-neutral-500">Headers</div>
                   <div className="p-4 overflow-x-auto max-h-48 scrollbar-thin scrollbar-thumb-neutral-800">
                      <pre className="text-[11px] font-mono text-neutral-400">
                        {JSON.stringify(detail.execution.request_headers, null, 2)}
                      </pre>
                   </div>
                </div>
                {detail.execution.request_body && (
                  <div className="bg-black border border-neutral-900 rounded-lg overflow-hidden">
                    <div className="bg-neutral-950 px-4 py-2 border-b border-neutral-900 text-[10px] font-mono text-neutral-500">Body</div>
                    <div className="p-4 overflow-x-auto max-h-48 scrollbar-thin scrollbar-thumb-neutral-800">
                      <pre className="text-[11px] font-mono text-neutral-400">{detail.execution.request_body}</pre>
                    </div>
                  </div>
                )}
              </section>

              {/* Error Analysis */}
              {detail.execution.status === 'error' && (
                <section className="space-y-4 bg-red-950/20 border border-red-900/30 p-6 rounded-xl">
                   <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-2 font-mono">
                     <AlertCircle className="w-3.5 h-3.5" /> Unhandled Exception
                   </h4>
                   <div className="bg-black/40 rounded p-4 border border-red-900/20">
                      <div className="text-red-100 font-bold text-sm leading-relaxed mb-4">{detail.execution.error}</div>
                      {detail.execution.error_stack && (
                        <div className="p-4 bg-black rounded border border-neutral-900 overflow-x-auto">
                           <pre className="text-[10px] font-mono text-red-400/80 leading-snug">
                             {detail.execution.error_stack}
                           </pre>
                        </div>
                      )}
                   </div>
                </section>
              )}

              {/* Logs */}
              {detail.logs && detail.logs.length > 0 && (
                <section className="space-y-4">
                   <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                     <Terminal className="w-3.5 h-3.5" /> Console Logs
                   </h4>
                   <div className="bg-black border border-neutral-900 rounded-lg divide-y divide-neutral-900">
                      {detail.logs.map((log, i) => (
                        <div key={i} className="px-4 py-3 flex gap-4 font-mono text-[11px]">
                           <span className={`shrink-0 w-12 font-bold ${
                             log.level === 'error' ? 'text-red-500' : 
                             log.level === 'warn' ? 'text-yellow-500' : 'text-neutral-600'
                           }`}>{log.level.toUpperCase()}</span>
                           <span className="text-neutral-300 break-all">{log.message}</span>
                        </div>
                      ))}
                   </div>
                </section>
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-neutral-600 font-mono text-xs">Failed to load execution context.</div>
          )}
        </div>
      </div>
    </div>
  );
}

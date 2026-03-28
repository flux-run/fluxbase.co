"use client";
import { useEffect, useState } from "react";
import { X, Clock, Globe, Activity, AlertCircle, GitMerge, Terminal } from "lucide-react";
import { ExecutionDetail } from "@/types/api";
import { useFluxApi } from "@/lib/api";
import { ExecutionTimeline } from "./ExecutionTimeline";

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
  const errorHeadline = detail
    ? formatErrorHeadline(
        detail.execution.error_name,
        detail.execution.error_message,
        detail.execution.error,
        detail.execution.error_stack,
      )
    : null;

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

              {/* Execution Timeline */}
              <section>
                <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <GitMerge className="w-3.5 h-3.5" /> Execution Trace
                </h4>
                <ExecutionTimeline
                  execution={detail.execution}
                  checkpoints={detail.checkpoints ?? []}
                  logs={detail.logs ?? []}
                />
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
                      <div className="text-red-100 font-bold text-sm leading-relaxed mb-2">{errorHeadline}</div>
                      {detail.narrative?.phase && (
                        <div className="text-[11px] text-red-200/60 mb-4">Phase: {detail.narrative.phase}</div>
                      )}
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


            </>
          ) : (
            <div className="h-full flex items-center justify-center text-neutral-600 font-mono text-xs">Failed to load execution context.</div>
          )}
        </div>
      </div>
    </div>
  );
}

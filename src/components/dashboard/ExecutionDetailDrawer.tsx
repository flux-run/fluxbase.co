"use client";
import { useEffect, useState } from "react";
import { X, Activity, AlertCircle, GitMerge, Terminal, ChevronDown, ChevronRight } from "lucide-react";
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
  const [rawOpen, setRawOpen] = useState(false);
  const [rawTab, setRawTab] = useState<'request' | 'headers' | 'response'>('request');
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

        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin scrollbar-thumb-neutral-800">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-50">
              <Activity className="w-8 h-8 animate-spin text-blue-500" />
              <span className="text-xs font-mono uppercase tracking-widest">Reconstructing Trace...</span>
            </div>
          ) : detail ? (
            <>
              {/* 1. EXECUTION TIMELINE — PRIMARY */}
              <section>
                <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <GitMerge className="w-3.5 h-3.5" /> Execution Timeline
                </h4>
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden py-1">
                  <ExecutionTimeline
                    execution={detail.execution}
                    checkpoints={detail.checkpoints ?? []}
                    logs={detail.logs ?? []}
                  />
                </div>
              </section>

              {/* 2. OUTCOME STRIP */}
              <section className="flex items-center gap-x-5 gap-y-1 flex-wrap px-4 py-3 bg-neutral-900/40 border border-neutral-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${detail.execution.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className={`text-xs font-mono font-bold ${detail.execution.status === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                    {detail.execution.status === 'ok' ? 'Success' : 'Error'}
                  </span>
                </div>
                <span className="text-xs font-mono text-neutral-200">{detail.execution.duration_ms}ms total</span>
                {detail.narrative?.breakdown ? (
                  <>
                    <span className="text-[11px] font-mono text-neutral-500">JS: {detail.narrative.breakdown.js_ms}ms</span>
                    <span className="text-[11px] font-mono text-neutral-500">IO: {detail.narrative.breakdown.io_ms}ms</span>
                    <span className="text-[11px] font-mono text-neutral-500">Overhead: ~{detail.narrative.breakdown.overhead_ms}ms</span>
                  </>
                ) : detail.execution.client_ip ? (
                  <span className="text-[11px] font-mono text-neutral-600">{detail.execution.client_ip}</span>
                ) : null}
              </section>

              {/* 3. FLUX WHY — analysis when non-trivial */}
              {detail.narrative && detail.narrative.severity !== 'healthy' && (
                <section className={`space-y-3 p-5 rounded-xl border ${
                  detail.narrative.severity === 'critical' ? 'bg-red-950/10 border-red-900/20' :
                  detail.narrative.severity === 'high'     ? 'bg-orange-950/10 border-orange-900/20' :
                  'bg-neutral-900/30 border-neutral-800'
                }`}>
                  <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5" /> Analysis
                  </h4>
                  {detail.narrative.issue && (
                    <div>
                      <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1">Issue</div>
                      <p className="text-xs text-neutral-300 leading-relaxed">{detail.narrative.issue}</p>
                    </div>
                  )}
                  {detail.narrative.cause && (
                    <div>
                      <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1">Cause</div>
                      <p className="text-xs text-neutral-400 leading-relaxed">{detail.narrative.cause}</p>
                    </div>
                  )}
                  {detail.narrative.impact && (
                    <div>
                      <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1">Impact</div>
                      <p className="text-xs text-neutral-400 leading-relaxed">{detail.narrative.impact}</p>
                    </div>
                  )}
                  {detail.narrative.suggestion && (
                    <div>
                      <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1">Recommendation</div>
                      <p className="text-xs text-blue-400/80 leading-relaxed">{detail.narrative.suggestion}</p>
                    </div>
                  )}
                </section>
              )}

              {/* 4. ERROR ANALYSIS — stack trace */}
              {detail.execution.status === 'error' && (
                <section className="space-y-3 bg-red-950/20 border border-red-900/30 p-5 rounded-xl">
                  <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-2 font-mono">
                    <AlertCircle className="w-3.5 h-3.5" /> Unhandled Exception
                  </h4>
                  <div className="bg-black/40 rounded p-4 border border-red-900/20">
                    <div className="text-red-100 font-bold text-sm leading-relaxed mb-2">{errorHeadline}</div>
                    {detail.narrative?.phase && (
                      <div className="text-[11px] text-red-200/60 mb-3">Phase: {detail.narrative.phase}</div>
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

              {/* 5. REPLAY COMMAND */}
              <section className="flex items-center gap-3 px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg">
                <Terminal className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                <code className="text-[11px] font-mono text-neutral-300 flex-1 select-all">flux replay {execId}</code>
              </section>

              {/* 6. RAW CONTEXT — collapsible, tabbed */}
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
                    <div className="p-4 overflow-x-auto max-h-64 scrollbar-thin scrollbar-thumb-neutral-800">
                      {rawTab === 'request' && (
                        <div className="space-y-3">
                          <div>
                            <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1">Method &amp; Path</div>
                            <pre className="text-[11px] font-mono text-neutral-400">{detail.execution.request_method || detail.execution.method} {detail.execution.path}</pre>
                          </div>
                          {detail.execution.request_body && (
                            <div>
                              <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1">Body</div>
                              <pre className="text-[11px] font-mono text-neutral-400 whitespace-pre-wrap">{detail.execution.request_body}</pre>
                            </div>
                          )}
                        </div>
                      )}
                      {rawTab === 'headers' && (
                        <pre className="text-[11px] font-mono text-neutral-400">{JSON.stringify(detail.execution.request_headers, null, 2)}</pre>
                      )}
                      {rawTab === 'response' && (
                        <div className="space-y-3">
                          <div>
                            <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1">Status</div>
                            <pre className="text-[11px] font-mono text-neutral-400">{detail.execution.response_status ?? 'N/A'}</pre>
                          </div>
                          {detail.execution.response_body && (
                            <div>
                              <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1">Body</div>
                              <pre className="text-[11px] font-mono text-neutral-400 whitespace-pre-wrap">{detail.execution.response_body}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-neutral-600 font-mono text-xs">Failed to load execution context.</div>
          )}
        </div>
      </div>
    </div>
  );
}

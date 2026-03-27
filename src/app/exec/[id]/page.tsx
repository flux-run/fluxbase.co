"use client";
import { useEffect, useState, use } from "react";
import { Header } from "@/components/dashboard/Header";
import { ChevronLeft, Info, AlertTriangle, XCircle, Activity, Play, TerminalSquare, Check, Copy, Zap } from "lucide-react";
import { useFluxApi } from "@/lib/api";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { ExecutionDetail, LogEntry } from "@/types/api";

export default function RealExecutionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { session, status } = useAuth();
  const [data, setData] = useState<ExecutionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const router = useRouter();
  const api = useFluxApi();

  useEffect(() => {
    if (status === "loading") return;
    if (!api.ready) return;

    const token = session?.flux_token || localStorage.getItem("flux_token");
    if (!token && status === "unauthenticated") {
        window.location.href = "/login";
        return;
    }

    api.getExecution(id).then((res: ExecutionDetail) => {
      setData(res);
      setLoading(false);
    }).catch((err: unknown) => {
      console.error(err);
      setLoading(false);
    });
  }, [id, session, status, api]);

  const handleReplay = async () => {
    setActionLoading("replay");
    const token = session?.flux_token || localStorage.getItem("flux_token");
    try {
      const res = await api.replayExecution(id);
      if (res.id) {
        // Navigate to the newly cloned execution
        router.push(`/exec/${res.id}`);
      } else {
        alert("Replay initiated. Refresh to see logs.");
      }
    } catch (err) {
      console.error("Replay failed:", err);
      alert("Failed to replay execution. Ensure flux-server replay event system is running.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleFixAndResume = async () => {
    setActionLoading("resume");
    const token = session?.flux_token || localStorage.getItem("flux_token");
    try {
      await api.resumeExecution(id);
      alert("Execution patched and resumed. Refreshing...");
      window.location.reload();
    } catch (err) {
      console.error("Resume failed:", err);
      alert("Failed to resume execution. Ensure flux-server patch routing is active.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans flex flex-col">
      <Header />
      
      <main className="max-w-4xl mx-auto w-full p-8 flex-1 flex flex-col pt-12">
        <Link href="/dashboard" className="text-neutral-500 hover:text-white flex items-center gap-2 font-bold text-sm mb-12 self-start transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        
        {loading ? (
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="h-6 w-32 bg-neutral-900 rounded" />
            <div className="h-64 w-full bg-[#111] rounded-xl border border-neutral-800" />
          </div>
        ) : !data ? (
          <div className="text-center py-20 text-neutral-500 font-mono">Execution not found</div>
        ) : (
          <div className="flex flex-col gap-12 flex-1 pb-32">
            
            <div className="flex items-center justify-between border-b border-neutral-900 pb-6">
               <div className="space-y-1">
                 <h1 className="text-2xl font-black font-mono tracking-tight text-white flex items-center gap-3">
                   {data.execution.method} {data.execution.path}
                 </h1>
                 <p className="text-sm text-neutral-500 font-mono">{id}</p>
               </div>
               <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${data.execution.status === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                 {data.execution.status === 'error' ? <XCircle className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                 {data.execution.status}
               </div>
            </div>

            {/* flux why */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 font-mono text-lg font-bold text-neutral-300">
                  <span className="text-blue-500">$</span> flux why {id.slice(0, 8)}
                </div>
                {data.execution.status === 'error' && (
                  <button onClick={handleReplay} disabled={actionLoading === "replay"} className="bg-blue-500 text-white hover:bg-blue-400 disabled:opacity-50 font-bold px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20">
                    <Play className="w-4 h-4" /> {actionLoading === "replay" ? "Replaying..." : "Replay Execution"}
                  </button>
                )}
              </div>
              
              <div className="bg-[#111] p-6 rounded-xl border border-neutral-800 font-mono text-sm leading-relaxed space-y-4 text-neutral-400 select-text overflow-hidden">
                {/* Real CLI Output from Logs */}
                {data.logs && data.logs.length > 0 ? (
                  <div className="space-y-2">
                    {data.logs.map((log: LogEntry, i: number) => (
                      <div key={i} className="flex gap-4">
                        <span className="text-neutral-600 shrink-0 w-24">
                          {log.created_at ? new Date(log.created_at).toISOString().split('T')[1].slice(0,-1) : '00:00:00.000'}
                        </span>
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <span className={`
                            ${log.level === 'error' ? 'text-red-400 font-bold' : ''}
                            ${log.level === 'warn' ? 'text-yellow-400' : ''}
                            ${log.level === 'info' ? 'text-neutral-300' : ''}
                          `}>
                            {log.level === 'error' && '❌ '}
                            {log.level === 'warn' && '⚠️ '}
                            → {log.message}
                          </span>
                          {log.context && Object.keys(log.context).length > 0 && (
                            <pre className="text-xs text-neutral-500 overflow-x-auto whitespace-pre-wrap mt-1 opacity-70">
                              {JSON.stringify(log.context, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-neutral-600 italic">No logs captured during this execution.</div>
                )}
              </div>
            </div>

            {/* Error Actions - Patching (Strictly Real API call) */}
            {data.execution.status === 'error' && (
              <div className="space-y-4 mt-8 pt-8 border-t border-neutral-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 font-mono text-lg font-bold text-purple-400">
                    <TerminalSquare className="w-5 h-5" /> Pending Patch
                  </div>
                  <button onClick={handleFixAndResume} disabled={actionLoading === "resume"} className="bg-white text-black hover:bg-neutral-200 disabled:opacity-50 font-black px-8 py-3 rounded-xl transition-all shadow-xl flex items-center gap-2">
                    <Check className="w-4 h-4" /> {actionLoading === "resume" ? "Applying..." : "Apply fix & resume"}
                  </button>
                </div>
                <p className="text-neutral-500 text-sm">
                  Patch the logic locally or via Dashboard to resume the execution flow from the point of failure.
                  flux-server will serialize the runtime state and inject the fix dynamically.
                </p>
              </div>
            )}
            
            {/* Install Prompt (Success State) */}
            {data.execution.status === 'ok' && (
              <div className="mt-16 bg-blue-600/10 border border-blue-500/20 p-8 rounded-3xl flex flex-col items-center justify-center text-center space-y-6 shadow-[0_0_50px_rgba(37,99,235,0.05)] relative overflow-hidden">
                 <div className="absolute inset-0 bg-blue-600/5 blur-3xl pointer-events-none" />
                 <h2 className="text-2xl font-black text-white relative flex items-center gap-3">
                   <Zap className="w-6 h-6 text-blue-400" />
                   Install to run this on your backend
                 </h2>
                 
                 <div className="relative group w-full max-w-md mt-2">
                   <div className="absolute inset-0 bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                   <div className="relative flex items-center justify-between bg-black border border-neutral-800 rounded-xl p-3 pl-5 transition-all">
                     <code className="text-blue-400 font-mono text-sm font-bold">curl -fsSL fluxbase.co/install | bash</code>
                     <button onClick={() => { navigator.clipboard.writeText("curl -fsSL fluxbase.co/install | bash"); alert("Copied!"); }} className="p-3 hover:bg-neutral-900 rounded-lg transition-colors outline-none bg-neutral-900/50 text-white font-bold flex items-center gap-2 text-xs">
                       <Copy className="w-4 h-4" /> Copy
                     </button>
                   </div>
                 </div>

                 <div className="relative flex flex-col md:flex-row items-center gap-3 md:gap-8 text-neutral-500 text-xs font-bold uppercase tracking-wider mt-6 bg-black/20 py-3 px-6 rounded-xl border border-white/5">
                   <span className="flex items-center gap-2"><Check className="w-3 h-3 text-neutral-400" /> No infra changes</span>
                   <span className="flex items-center gap-2"><Check className="w-3 h-3 text-neutral-400" /> Works with your backend</span>
                   <span className="flex items-center gap-2"><Check className="w-3 h-3 text-neutral-400" /> Starts capturing instantly</span>
                 </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

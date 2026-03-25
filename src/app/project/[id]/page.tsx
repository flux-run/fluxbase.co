"use client";
import { useState, use, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlertCircle, Zap, RefreshCw, ChevronDown, Activity, ChevronRight, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchApi } from "@/lib/api";

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ProjectOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();

  const [project, setProject]   = useState<any>(null);
  const [executions, setExecs]  = useState<any[]>([]);
  const [functions, setFuncs]   = useState<any[]>([]);
  const [heroLogs, setHeroLogs] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [seeding, setSeeding]   = useState(false);
  const [running, setRunning]   = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);

  const load = useCallback(async (silent = false) => {
    const token = session?.flux_token || localStorage.getItem("flux_token");
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const [projects, execs, funcs] = await Promise.all([
        fetchApi("/projects", { token }),
        fetchApi(`/executions?project_id=${id}`, { token }),
        fetchApi(`/functions?project_id=${id}`, { token }),
      ]);
      const execArr = Array.isArray(execs) ? execs : [];
      const funcArr = Array.isArray(funcs) ? funcs : [];
      setProject(Array.isArray(projects) ? projects.find((p: any) => p.id === id) : null);
      setExecs(execArr);
      setFuncs(funcArr);

      // Auto-seed if empty
      if (!silent && execArr.length === 0 && funcArr.length === 0) {
        setSeeding(true);
        try {
          await fetchApi(`/projects/${id}/seed`, { method: "POST", token });
          const [e2, f2] = await Promise.all([
            fetchApi(`/executions?project_id=${id}`, { token }),
            fetchApi(`/functions?project_id=${id}`, { token }),
          ]);
          const e2arr = Array.isArray(e2) ? e2 : [];
          setExecs(e2arr);
          setFuncs(Array.isArray(f2) ? f2 : []);
          // Fetch logs for the hero execution
          const hero = e2arr.find((e: any) => e.status === "error") ?? e2arr[0];
          if (hero) {
            const detail = await fetchApi(`/executions/${hero.id}`, { token }).catch(() => null);
            setHeroLogs(detail?.logs ?? detail?.console_logs ?? []);
          }
        } catch { } finally { setSeeding(false); }
      } else {
        // Fetch logs for the hero (first error, or first exec)
        const hero = execArr.find((e: any) => e.status === "error") ?? execArr[0];
        if (hero) {
          const detail = await fetchApi(`/executions/${hero.id}`, { token }).catch(() => null);
          setHeroLogs(detail?.logs ?? detail?.console_logs ?? []);
        }
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [id, session]);

  useEffect(() => { load(); }, [load]);

  const runFn = async () => {
    const token = session?.flux_token || localStorage.getItem("flux_token");
    const fn = functions[0];
    if (!token || !fn) return;
    setRunning(true);
    try { await fetchApi(fn.path || "/api/hello", { method: fn.method || "GET", token }); } catch { }
    finally { await load(true); setRunning(false); }
  };

  const isBooting = loading || seeding;
  const hero      = executions.find(e => e.status === "error") ?? executions[0] ?? null;
  const recent    = executions.filter(e => e.id !== hero?.id).slice(0, 3);
  const hasFailed = hero?.status === "error";
  // Pull first error log message for preview
  const errorLog  = heroLogs.find((l: any) => l.level === "error");
  const errorMsg  = errorLog?.message ?? (hasFailed ? "Execution failed" : null);
  // Simulated "failed at" from message
  const failedAt  = errorMsg?.includes("at ") ? errorMsg.split("at ")[1]?.split("\n")[0]?.trim() : null;

  return (
    <div className="py-6 space-y-4 animate-in fade-in duration-300 max-w-2xl">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          {isBooting
            ? <div className="w-28 h-4 bg-neutral-800 rounded animate-pulse" />
            : <h1 className="text-sm font-black text-white tracking-tight">{project?.name ?? "Project"}</h1>}
          {!isBooting && hero && (
            <p className={`text-[11px] mt-0.5 flex items-center gap-1 font-mono ${hasFailed ? "text-red-400/80" : "text-neutral-600"}`}>
              {hasFailed && <AlertCircle className="w-2.5 h-2.5" />}
              {hasFailed ? "Last execution failed" : "Last execution ok"} · {timeAgo(hero.started_at)}
            </p>
          )}
        </div>
        <button onClick={() => load(true)} className="p-1.5 text-neutral-700 hover:text-white transition-colors">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* ── HERO FAILURE CARD (dense) ── */}
      {isBooting ? (
        <div className="border border-neutral-800 rounded-lg p-4 space-y-2.5 animate-pulse">
          <div className="w-12 h-2.5 bg-neutral-800 rounded" />
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-neutral-800 rounded" />
            <div className="h-2.5 bg-neutral-800 rounded w-56" />
          </div>
          <div className="h-2 bg-neutral-800/50 rounded w-72" />
          <div className="h-2 bg-neutral-800/40 rounded w-40" />
        </div>
      ) : hero ? (
        <div className={`border rounded-lg p-4 ${
          hasFailed ? "border-red-500/15 bg-red-500/[0.025]" : "border-emerald-500/15 bg-emerald-500/[0.025]"
        }`}>
          {/* label */}
          <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600 mb-2.5">
            {hasFailed ? "Failure" : "Last Execution"}
          </p>

          {/* execution meta row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
              hasFailed ? "text-red-400 bg-red-500/15" : "text-emerald-400 bg-emerald-500/15"
            }`}>{hero.status}</span>
            <span className="font-mono text-xs text-neutral-300">{hero.id.slice(0, 14)}…</span>
            <span className="text-[11px] text-neutral-500 font-mono">{hero.method} {hero.path}</span>
            <span className="text-[11px] text-neutral-600 font-mono">{hero.duration_ms}ms</span>
            <span className="text-[11px] text-neutral-700 font-mono">{timeAgo(hero.started_at)}</span>
          </div>

          {/* error message */}
          {errorMsg && (
            <p className="mt-2 text-[11px] text-red-400/80 font-mono truncate">
              {errorMsg}
            </p>
          )}

          {/* failed at */}
          {failedAt && (
            <p className="mt-0.5 text-[10px] text-neutral-600 font-mono">
              Failed at: <span className="text-neutral-500">{failedAt}</span>
            </p>
          )}

          {/* sub-hint */}
          <p className="mt-2 text-[10px] text-neutral-700">
            Replay this execution locally and step through it
          </p>

          {/* action */}
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              onClick={() => router.push(`/project/${id}/executions/${hero.id}`)}
              className="h-7 px-4 text-xs font-bold bg-white text-black hover:bg-neutral-100"
            >
              Debug →
            </Button>
          </div>
        </div>
      ) : null}

      {/* ── RUN ENDPOINT ── */}
      {!isBooting && functions.length > 0 && (
        <div className="border border-neutral-800 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-neutral-800/60 bg-neutral-950/50">
            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Run Endpoint</span>
          </div>
          {functions.map((fn, idx) => (
            <div key={fn.id} className={`flex items-center gap-3 px-3 py-2.5 ${idx < functions.length - 1 ? "border-b border-neutral-800/40" : ""}`}>
              <Code2 className="w-3 h-3 text-neutral-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-neutral-400">{fn.name}</span>
                <span className="text-[10px] text-neutral-600 font-mono ml-2">{fn.method || "GET"} {fn.path || "/api/hello"}</span>
              </div>
              <Button
                size="sm"
                disabled={running}
                onClick={runFn}
                className="h-6 px-2.5 text-[10px] font-bold bg-neutral-900 border border-neutral-800 text-neutral-400 hover:bg-white hover:text-black hover:border-white transition-all"
              >
                {running ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <><Zap className="w-2.5 h-2.5 mr-1" />Run</>}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* ── RECENT (simplified, no headers) ── */}
      {!isBooting && recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Recent</span>
            {executions.length > 4 && (
              <button onClick={() => router.push(`/project/${id}/executions`)} className="text-[9px] text-neutral-700 hover:text-white font-bold flex items-center gap-0.5 transition-colors">
                All <ChevronRight className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
          <div className="border border-neutral-800/60 rounded-lg divide-y divide-neutral-800/40 overflow-hidden">
            {recent.map(exec => (
              <div
                key={exec.id}
                onClick={() => router.push(`/project/${id}/executions/${exec.id}`)}
                className="group flex items-center gap-2 px-3 py-2 hover:bg-white/[0.02] cursor-pointer transition-colors"
              >
                <span className={`text-[9px] font-black uppercase ${exec.status === "error" ? "text-red-500" : "text-emerald-500"}`}>
                  {exec.status === "error" ? "ERR" : "OK"}
                </span>
                <span className="font-mono text-[10px] text-neutral-500 flex-1">{exec.id.slice(0, 18)}…</span>
                <span className="text-[10px] text-neutral-600 font-mono">{exec.method} {exec.path}</span>
                <span className="text-[10px] text-neutral-700 font-mono">{timeAgo(exec.started_at)}</span>
                <ChevronRight className="w-3 h-3 text-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CONNECT BACKEND ── */}
      {!isBooting && (
        <div className="border border-neutral-800/30 rounded-lg overflow-hidden">
          <button
            onClick={() => setConnectOpen(o => !o)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-neutral-700 hover:text-neutral-500 transition-colors"
          >
            Connect your backend
            <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${connectOpen ? "rotate-180" : ""}`} />
          </button>
          {connectOpen && (
            <div className="px-3 pb-3 border-t border-neutral-800/30 pt-2.5 space-y-2">
              <p className="text-[10px] text-neutral-600">Install the CLI to capture executions from your real server.</p>
              <code className="block px-2.5 py-2 bg-black border border-neutral-800 rounded font-mono text-[10px] text-neutral-500 select-all">
                curl -fsSL fluxbase.co/install | bash
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

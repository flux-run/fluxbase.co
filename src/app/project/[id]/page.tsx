"use client";
import { useState, use, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Zap,
  RefreshCw,
  ChevronRight,
  Play,
  RotateCcw,
  FastForward,
  Database,
  GitBranch,
  Clock,
  Activity,
  ArrowRight,
  Terminal,
  Globe,
  Code2,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFluxApi } from "@/lib/api";
import { Project, Execution, Function, LogEntry } from "@/types/api";
import { CLIInitDialog } from "@/components/dashboard/CLIInitDialog";

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatusDot({ status }: { status: string }) {
  if (status === "error")
    return <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />;
  if (status === "ok")
    return <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />;
  return <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.8)] animate-pulse" />;
}

function PipelineStep({
  icon: Icon,
  label,
  sublabel,
  active,
  done,
  color = "blue",
}: {
  icon: LucideIcon;
  label: string;
  sublabel: string;
  active?: boolean;
  done?: boolean;
  color?: "blue" | "emerald" | "violet";
}) {
  const colors = {
    blue: {
      ring: "border-blue-500/40",
      bg: "bg-blue-500/10",
      icon: "text-blue-400",
      label: "text-blue-300",
    },
    emerald: {
      ring: "border-emerald-500/40",
      bg: "bg-emerald-500/10",
      icon: "text-emerald-400",
      label: "text-emerald-300",
    },
    violet: {
      ring: "border-violet-500/40",
      bg: "bg-violet-500/10",
      icon: "text-violet-400",
      label: "text-violet-300",
    },
  }[color];

  return (
    <div
      className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all duration-300 ${
        active
          ? `${colors.ring} ${colors.bg}`
          : done
          ? "border-neutral-800/60 bg-neutral-900/30"
          : "border-neutral-900/60 bg-transparent opacity-40"
      }`}
    >
      <div
        className={`w-8 h-8 rounded-md flex items-center justify-center ${
          active ? colors.bg : "bg-neutral-900"
        }`}
      >
        <Icon className={`w-4 h-4 ${active ? colors.icon : "text-neutral-600"}`} />
      </div>
      <div className="text-center">
        <p
          className={`text-[10px] font-black uppercase tracking-widest ${
            active ? colors.label : "text-neutral-500"
          }`}
        >
          {label}
        </p>
        <p className="text-[9px] text-neutral-700 mt-0.5">{sublabel}</p>
      </div>
    </div>
  );
}

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { session, status } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [executions, setExecs] = useState<Execution[]>([]);
  const [functions, setFuncs] = useState<Function[]>([]);
  const [heroLogs, setHeroLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [isInitOpen, setIsInitOpen] = useState(false);

  const api = useFluxApi(id);

  const load = useCallback(
    async (silent = false) => {
      if (!api.ready) return;
      if (!silent) setLoading(true);
      try {
        const [projects, execs, funcs] = await Promise.all([
          api.getProjects(),
          api.getExecutions(),
          api.getFunctions(),
        ]);
        const execArr = Array.isArray(execs) ? execs : [];
        const funcArr = Array.isArray(funcs) ? funcs : [];
        setProject(
          Array.isArray(projects)
            ? projects.find((p: Project) => p.id === id) ?? null
            : null
        );
        setExecs(execArr);
        setFuncs(funcArr);

        const hero =
          execArr.find((e: Execution) => e.status === "error") ?? execArr[0];
        if (hero) {
          const detail = await api.getExecution(hero.id).catch(() => null);
          setHeroLogs(detail?.logs ?? detail?.console_logs ?? []);
        }
      } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e));
        if (err.message.includes("Unauthorized") || err.message.includes("401")) {
          localStorage.removeItem("flux_token");
          router.push("/signup");
        } else {
          console.error("API Load Error:", err.message);
        }
      } finally {
        setLoading(false);
      }
    },
    [id, session, api]
  );

  useEffect(() => {
    load();
  }, [load]);

  const runFn = async () => {
    const token = session?.flux_token || localStorage.getItem("flux_token");
    const fn = functions[0];
    if (!token || !fn) return;
    setRunning(true);
    try {
      await api.request(fn.path || "/api/hello", {
        method: fn.method || "GET",
      });
    } catch {}
    finally {
      await load(true);
      setRunning(false);
    }
  };

  const isBooting = loading;
  const hero = executions.find((e) => e.status === "error") ?? executions[0] ?? null;
  const rest = executions.filter((e) => e.id !== hero?.id).slice(0, 5);
  const hasFailed = hero?.status === "error";
  const errorLog = heroLogs.find((l: LogEntry) => l.level === "error");
  const errorMsg = errorLog?.message ?? (hasFailed ? "Execution failed" : null);

  // Stats
  const totalExecs = executions.length;
  const failedCount = executions.filter((e) => e.status === "error").length;
  const successCount = executions.filter((e) => e.status === "ok").length;
  const avgDuration =
    totalExecs > 0
      ? Math.round(
          executions.reduce((a, e) => a + (e.duration_ms ?? 0), 0) / totalExecs
        )
      : 0;

  return (
    <div className="py-6 space-y-5 animate-in fade-in duration-300">
      <CLIInitDialog 
        isOpen={isInitOpen}
        onClose={() => setIsInitOpen(false)}
        projectId={id}
        token={session?.flux_token}
      />
      {/* ── HEADER ── */}
      <div className="flex items-start justify-between">
        <div>
          {isBooting ? (
            <div className="w-36 h-5 bg-neutral-800 rounded animate-pulse" />
          ) : (
            <h1 className="text-base font-black text-white tracking-tight">
              {project?.name ?? "Project"}
            </h1>
          )}
          <p className="text-[11px] text-neutral-600 mt-0.5 font-mono">
            execution memory · replay engine · resume safely
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isBooting && functions.length > 0 && (
            <Button
              size="sm"
              disabled={running}
              onClick={runFn}
              className="h-7 px-3 text-[10px] font-bold bg-neutral-900 border border-neutral-800 text-neutral-400 hover:bg-white hover:text-black hover:border-white transition-all gap-1.5"
            >
              {running ? (
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
              ) : (
                <Zap className="w-2.5 h-2.5" />
              )}
              Trigger
            </Button>
          )}
          <button
            onClick={() => load(true)}
            className="p-1.5 text-neutral-700 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          🥇 PRIMARY: FAILURE CARD — this is why you're here
          ══════════════════════════════════════════════════ */}
      {isBooting ? (
        <div className="border border-neutral-800 rounded-xl p-5 animate-pulse space-y-4">
          <div className="w-24 h-3 bg-neutral-800 rounded" />
          <div className="w-full h-3 bg-neutral-800/70 rounded" />
          <div className="w-3/4 h-2.5 bg-neutral-800/50 rounded" />
          <div className="w-1/2 h-2 bg-neutral-800/30 rounded" />
        </div>
      ) : hero ? (
        <div
          className={`border rounded-xl overflow-hidden ${
            hasFailed
              ? "border-red-500/25 bg-red-500/[0.04]"
              : "border-emerald-500/20 bg-emerald-500/[0.03]"
          }`}
        >
          {/* accent bar */}
          <div
            className={`h-[3px] ${
              hasFailed
                ? "bg-gradient-to-r from-red-500/80 via-red-500/40 to-transparent"
                : "bg-gradient-to-r from-emerald-500/70 via-emerald-500/30 to-transparent"
            }`}
          />
          <div className="p-5 space-y-4">
            {/* label + meta row */}
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`text-[9px] font-black uppercase tracking-widest ${
                  hasFailed ? "text-red-500/80" : "text-emerald-500/80"
                }`}
              >
                {hasFailed ? "🚨 Active Failure" : "Last Execution"}
              </span>
              <div className="flex items-center gap-2 ml-auto flex-wrap">
                <StatusDot status={hero.status} />
                <span
                  className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                    hasFailed
                      ? "text-red-400 bg-red-500/15"
                      : "text-emerald-400 bg-emerald-500/15"
                  }`}
                >
                  {hero.status}
                </span>
                <span className="font-mono text-xs text-neutral-400">
                  {hero.id.slice(0, 14)}…
                </span>
                <span className="text-xs text-neutral-500 font-mono font-bold">
                  {hero.method} {hero.path}
                </span>
                <span className="text-[10px] text-neutral-600 font-mono flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {hero.duration_ms}ms
                </span>
                <span className="text-[10px] text-neutral-700 font-mono">
                  {timeAgo(hero.started_at ?? new Date().toISOString())}
                </span>
              </div>
            </div>

            {/* error message — the most prominent element */}
            {errorMsg && (
              <div className="bg-red-500/[0.08] border border-red-500/15 rounded-lg px-4 py-3">
                <p className="text-sm text-red-300/90 font-mono leading-relaxed">
                  {errorMsg}
                </p>
              </div>
            )}

            {/* depth signals row — 2 key facts that make it feel real */}
            {hasFailed && (
              <div className="flex items-center gap-4">
                {(() => {
                  // Try to extract "failed at" from error message or logs
                  const failedAtLog = heroLogs.find(
                    (l: LogEntry) => l.level === "error" && l.message?.includes("at ")
                  );
                  const rawAt =
                    failedAtLog?.message?.split("at ")?.[1]
                      ?.split("\n")?.[0]
                      ?.trim() ??
                    (errorMsg?.includes("at ")
                      ? errorMsg?.split("at ")?.[1]?.split("\n")?.[0]?.trim()
                      : null);
                  const externalCalls = heroLogs.filter(
                    (l: LogEntry) =>
                      l.message?.toLowerCase().includes("fetch") ||
                      l.message?.toLowerCase().includes("http") ||
                      l.message?.toLowerCase().includes("request")
                  ).length;

                  return (
                    <>
                      {rawAt && (
                        <div className="flex items-center gap-1.5">
                          <GitBranch className="w-3 h-3 text-neutral-700 shrink-0" />
                          <span className="text-[10px] text-neutral-600">
                            Failed at:{" "}
                          </span>
                          <code className="text-[10px] text-neutral-400 font-mono">
                            {rawAt.length > 40 ? rawAt.slice(0, 40) + "…" : rawAt}
                          </code>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3 h-3 text-neutral-700 shrink-0" />
                        <span className="text-[10px] text-neutral-600">
                          External calls:{" "}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono font-bold">
                          {externalCalls > 0 ? externalCalls : hero.external_calls ?? 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Terminal className="w-3 h-3 text-neutral-700 shrink-0" />
                        <span className="text-[10px] text-neutral-600">
                          Log lines:{" "}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono font-bold">
                          {heroLogs.length}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* log preview */}
            {heroLogs.length > 0 && (
              <div className="bg-black/50 border border-neutral-900/80 rounded-lg p-3 space-y-1.5 max-h-[88px] overflow-hidden">
                {heroLogs.slice(0, 4).map((log: LogEntry, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <span
                      className={`text-[8px] font-black uppercase shrink-0 mt-0.5 w-6 ${
                        log.level === "error"
                          ? "text-red-500"
                          : log.level === "warn"
                          ? "text-yellow-500"
                          : "text-neutral-700"
                      }`}
                    >
                      {log.level?.slice(0, 3) ?? "log"}
                    </span>
                    <span className="text-[9px] text-neutral-500 font-mono truncate">
                      {log.message}
                    </span>
                  </div>
                ))}
                {heroLogs.length > 4 && (
                  <p className="text-[8px] text-neutral-700 pl-8">
                    +{heroLogs.length - 4} more lines
                  </p>
                )}
              </div>
            )}

            {/* CTA row — button is the strongest element */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-[10px] text-neutral-700 font-mono">
                {hasFailed
                  ? "→ replay locally · step through · fix · resume"
                  : "→ inspect execution graph · view I/O"}
              </p>
              <Button
                size="sm"
                onClick={() =>
                  router.push(`/project/${id}/executions/${hero.id}`)
                }
                className={`h-8 px-5 text-xs font-bold gap-2 transition-all ${
                  hasFailed
                    ? "bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500 hover:text-white hover:border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.15)] hover:shadow-[0_0_30px_rgba(239,68,68,0.35)]"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                {hasFailed ? (
                  <>
                    <RotateCcw className="w-3 h-3" /> Replay &amp; Fix
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" /> Inspect
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-neutral-800/40 rounded-xl p-10 flex flex-col items-center gap-3 text-center">
          <Activity className="w-8 h-8 text-neutral-800" />
          <div>
            <p className="text-xs font-bold text-neutral-500">
              No executions captured yet
            </p>
            <p className="text-[10px] text-neutral-700 mt-1">
              Install the CLI and trigger your first request
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          🥈 SECONDARY: Lifecycle context strip
          ══════════════════════════════════════════════════ */}
      <div className="border border-neutral-900/70 rounded-lg bg-neutral-950/40 px-4 py-3">
        <div className="flex items-center gap-0">
          <div className="flex-1">
            <PipelineStep
              icon={Globe}
              label="Capture"
              sublabel="record I/O"
              active={!isBooting}
              done
              color="blue"
            />
          </div>
          <ArrowRight className="w-3 h-3 text-neutral-800 shrink-0 mx-1" />
          <div className="flex-1">
            <PipelineStep
              icon={Database}
              label="Store"
              sublabel="execution graph"
              active={!isBooting && totalExecs > 0}
              done={totalExecs > 0}
              color="violet"
            />
          </div>
          <ArrowRight className="w-3 h-3 text-neutral-800 shrink-0 mx-1" />
          <div className="flex-1">
            <PipelineStep
              icon={RotateCcw}
              label="Replay"
              sublabel="deterministic"
              active={!isBooting && hasFailed}
              done={false}
              color="blue"
            />
          </div>
          <ArrowRight className="w-3 h-3 text-neutral-800 shrink-0 mx-1" />
          <div className="flex-1">
            <PipelineStep
              icon={FastForward}
              label="Resume"
              sublabel="real I/O safe"
              active={false}
              done={false}
              color="emerald"
            />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          🥉 TERTIARY: Stats — supporting metadata only
          ══════════════════════════════════════════════════ */}
      {!isBooting && (
        <div className="grid grid-cols-4 gap-2">
          {[
            {
              label: "Captured",
              value: totalExecs,
              hint: "executions",
              color: "neutral",
            },
            {
              label: "Failures",
              value: failedCount,
              hint: "replayable",
              color: failedCount > 0 ? "red" : "neutral",
            },
            {
              label: "Successful",
              value: successCount,
              hint: "ok",
              color: successCount > 0 ? "emerald" : "neutral",
            },
            {
              label: "Avg",
              value: `${avgDuration}ms`,
              hint: "per exec",
              color: "neutral",
            },
          ].map(({ label, value, hint, color }) => (
            <div
              key={label}
              className={`border rounded-lg px-3 py-2 ${
                color === "red"
                  ? "border-red-500/10 bg-red-500/[0.02]"
                  : color === "emerald"
                  ? "border-emerald-500/10 bg-emerald-500/[0.02]"
                  : "border-neutral-900/60 bg-transparent"
              }`}
            >
              <p className="text-[8px] font-black uppercase tracking-widest text-neutral-700">
                {label}
              </p>
              <p
                className={`text-lg font-black tabular-nums mt-0.5 ${
                  color === "red"
                    ? "text-red-500/70"
                    : color === "emerald"
                    ? "text-emerald-500/70"
                    : "text-neutral-500"
                }`}
              >
                {value}
              </p>
              <p className="text-[8px] text-neutral-800 font-mono">{hint}</p>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          🧩 SUPPORTING: Dashboard Grid (50/50)
          ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-4">
        {/* LEFT: recent history */}
        <div className="space-y-2">
          {!isBooting && executions.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-700">
                  Recent Executions
                </p>
                <button
                  onClick={() => router.push(`/project/${id}/executions`)}
                  className="text-[9px] text-neutral-700 hover:text-neutral-400 font-bold flex items-center gap-0.5 transition-colors"
                >
                  All <ChevronRight className="w-2.5 h-2.5" />
                </button>
              </div>
              <div className="border border-neutral-900/50 rounded-lg divide-y divide-neutral-900/50 overflow-hidden">
                {executions.slice(0, 5).map((exec) => (
                  <div
                    key={exec.id}
                    onClick={() =>
                      router.push(`/project/${id}/executions/${exec.id}`)
                    }
                    className="group flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/[0.015] cursor-pointer transition-colors"
                  >
                    <StatusDot status={exec.status} />
                    <span className="font-mono text-[10px] text-neutral-600 flex-1">
                      {exec.id.slice(0, 18)}…
                    </span>
                    <span className="text-[10px] text-neutral-700 font-mono">
                      {exec.method} {exec.path}
                    </span>
                    <span className="text-[10px] text-neutral-800 font-mono">
                      {exec.duration_ms}ms
                    </span>
                    <span className="text-[10px] text-neutral-800 font-mono">
                      {timeAgo(exec.started_at ?? new Date().toISOString())}
                    </span>
                    <ChevronRight className="w-3 h-3 text-neutral-800 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* RIGHT: Active Endpoints */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-700">
              Active Endpoints
            </p>
            {functions.length > 0 && (
              <button
                onClick={() => router.push(`/project/${id}/functions`)}
                className="text-[9px] text-neutral-700 hover:text-neutral-400 font-bold flex items-center gap-0.5 transition-colors"
              >
                View All ({functions.length}) <ChevronRight className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
          
          {isBooting ? (
            <div className="border border-neutral-900 rounded-lg p-3 animate-pulse space-y-2">
              <div className="w-28 h-2.5 bg-neutral-800 rounded" />
            </div>
          ) : functions.length > 0 ? (
            <div className="border border-neutral-900/50 rounded-lg divide-y divide-neutral-900/50 overflow-hidden">
              {functions.slice(0, 5).map((fn) => (
                <div
                  key={fn.id}
                  onClick={() => router.push(`/project/${id}/functions`)}
                  className="group flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/[0.015] cursor-pointer transition-colors"
                >
                  <Code2 className="w-3 h-3 text-neutral-700 shrink-0 group-hover:text-neutral-400 transition-colors" />
                  <span className="text-[10px] text-neutral-500 font-bold max-w-[80px] truncate">
                    {fn.name}
                  </span>
                  <span className="text-[9px] text-neutral-600 font-mono flex-1 truncate">
                    {fn.method ?? "GET"} {fn.path ?? "/api/hello"}
                  </span>
                  <ChevronRight className="w-3 h-3 text-neutral-800 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-neutral-900/40 rounded-lg p-4 text-center group cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => setIsInitOpen(true)}>
              <p className="text-[10px] text-neutral-500 font-bold group-hover:text-blue-400 transition-colors">No functions registered yet</p>
              <p className="text-[9px] text-neutral-700 mt-0.5">Click to view CLI deployment guide</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

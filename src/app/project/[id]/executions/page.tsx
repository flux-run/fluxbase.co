"use client";
import { Suspense, useEffect, useState, use, Fragment, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useFluxApi } from "@/lib/api";
import { Activity, Search, ChevronRight, Clock, AlertTriangle } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Execution } from "@/types/api";

function normalize(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function classScore(exec: Execution, cls: string | null): number {
  if (!cls) return 0;
  const msg = `${exec.error_name ?? ""} ${exec.error_message ?? ""} ${exec.error ?? ""}`.toLowerCase();
  if (cls === "external") {
    return /dns|enotfound|getaddrinfo|fetch|network|host|socket/.test(msg) ? 30 : 0;
  }
  if (cls === "infra") {
    return /platform|runtime|executor|artifact|bootstrap|init/.test(msg) ? 30 : 0;
  }
  if (cls === "user") {
    return /referenceerror|typeerror|syntaxerror|user code|thrown/.test(msg) ? 30 : 0;
  }
  return 0;
}

function pickDebuggerExecution(
  executions: Execution[],
  incident: string | null,
  cls: string | null,
  afterDeploy: string | null,
): Execution | null {
  const tokens = (incident ? normalize(incident).split(" ") : []).filter((t) => t.length > 3);
  const failed = executions.filter((e) => e.status !== "ok");
  if (failed.length === 0) return null;

  const scored = failed.map((e) => {
    const hay = normalize(`${e.error_name ?? ""} ${e.error_message ?? ""} ${e.error ?? ""} ${e.path ?? ""} ${e.function_name ?? ""}`);
    let score = 0;

    if (afterDeploy && e.code_sha?.startsWith(afterDeploy)) score += 40;
    if (tokens.length > 0) {
      const hits = tokens.filter((t) => hay.includes(t)).length;
      score += hits * 8;
    }
    score += classScore(e, cls);

    // Prefer most recent when score ties.
    const ts = e.started_at ? new Date(e.started_at).getTime() : 0;
    return { e, score, ts };
  });

  scored.sort((a, b) => (b.score - a.score) || (b.ts - a.ts));
  return scored[0]?.e ?? failed[0] ?? null;
}

function ExecutionsPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const api = useFluxApi(id);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const initialFilter = searchParams.get("status") === "error" ? "error" : "all";
  const [filter, setFilter] = useState(initialFilter);
  const redirectedToDebugger = useRef(false);

  useEffect(() => {
    if (!api.ready) return;
    
    api.getExecutions().then(data => {
      setExecutions(data);
      setLoading(false);
    }).catch(console.error);
  }, [id, api]);

  useEffect(() => {
    const wantsDebugger = searchParams.get("debugger") === "1";
    if (!wantsDebugger || loading || redirectedToDebugger.current) return;

    const target = pickDebuggerExecution(
      executions,
      searchParams.get("incident"),
      searchParams.get("class"),
      searchParams.get("afterDeploy"),
    );
    if (!target) return;

    redirectedToDebugger.current = true;
    router.replace(`/project/${id}/executions/${target.id}?debugger=1`);
  }, [executions, id, loading, router, searchParams]);

  const filtered = filter === "all" ? executions : executions.filter(e => e.status === filter);

  // Group by deployment sha, preserving chronological order of first appearance
  const groups = filtered.reduce<{ sha: string; fullSha: string | null; execs: Execution[] }[]>((acc, exec) => {
    const key = exec.code_sha ?? '__unknown__';
    const existing = acc.find(g => g.sha === key);
    if (existing) existing.execs.push(exec);
    else acc.push({ sha: key, fullSha: exec.code_sha ?? null, execs: [exec] });
    return acc;
  }, []).map((g, i) => {
    const total = g.execs.length;
    const errors = g.execs.filter(e => e.status !== 'ok').length;
    const rate = total > 0 ? errors / total : 0;
    return { ...g, total, errors, rate, isLatest: i === 0 };
  });

  // Regression = latest deploy has >20% failures, previous was healthy (<10%)
  const isRegression = groups.length >= 2 && groups[0].rate > 0.2 && groups[1].rate < 0.1;

  return (
    <div className="space-y-4">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Executions</h2>
          <p className="text-sm text-neutral-500 mt-1">Real-time log of every isolated compute unit.</p>
        </div>
        <div className="flex gap-3">
           <div className="relative w-64">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input placeholder="Filter by ID..." className="pl-9 bg-neutral-900 border-neutral-800 text-xs h-9" />
           </div>
           <div className="flex bg-neutral-900 border border-neutral-800 rounded-md p-0.5 h-9">
              <button 
                onClick={() => setFilter("all")}
                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-sm transition-colors ${filter === 'all' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
              >All</button>
              <button 
                onClick={() => setFilter("error")}
                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-sm transition-colors ${filter === 'error' ? 'bg-red-950/40 text-red-500' : 'text-neutral-500 hover:text-neutral-300'}`}
              >Errors</button>
           </div>
        </div>
      </header>

      {/* Deployment summary banner — only shown when there are 2+ distinct deployments */}
      {!loading && groups.length >= 2 && (
        <div className={`flex items-center gap-4 px-4 py-3 rounded-lg border text-xs font-mono ${
          isRegression ? 'border-amber-800/50 bg-amber-950/10' : 'border-neutral-800 bg-neutral-900/30'
        }`}>
          {isRegression && (
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold pr-3 border-r border-amber-800/40">
              <AlertTriangle className="w-3.5 h-3.5" />
              Regression detected
            </div>
          )}
          <div className="flex gap-4 flex-wrap">
            {groups.slice(0, 3).map((g, i) => (
              <div key={g.sha} className="flex items-center gap-1.5">
                <span className="text-neutral-400 font-mono" title={g.fullSha ?? undefined}>
                  {g.sha === '__unknown__' ? 'unknown' : g.sha.slice(0, 7)}
                </span>
                {i === 0 && (
                  <span className="text-[9px] font-bold uppercase tracking-wide text-neutral-600 border border-neutral-700 px-1 rounded">latest</span>
                )}
                <span className={g.rate > 0.1 ? 'text-red-400' : 'text-emerald-600'}>
                  → {g.errors === 0 ? '✓ healthy' : g.errors === g.total
                    ? `${g.total} failure${g.total > 1 ? 's' : ''}`
                    : `${g.errors}/${g.total} failed`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border border-neutral-900 rounded-lg bg-[#0c0c0c] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#111] hover:bg-[#111]">
            <TableRow className="border-neutral-900 hover:bg-transparent">
              <TableHead className="w-[80px] font-mono text-[10px] uppercase tracking-widest text-neutral-500">Status</TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Execution ID</TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Function</TableHead>
              <TableHead className="text-center font-mono text-[10px] uppercase tracking-widest text-neutral-500">Duration</TableHead>
              <TableHead className="text-right font-mono text-[10px] uppercase tracking-widest text-neutral-500">Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map(group => (
              <Fragment key={group.sha}>
                {/* Deployment group header row */}
                <TableRow className="border-t border-neutral-800 bg-[#111] hover:bg-[#111]">
                  <TableCell colSpan={5} className="py-2 px-4">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs text-neutral-300" title={group.fullSha ?? undefined}>
                        {group.sha === '__unknown__' ? 'unknown' : group.sha.slice(0, 7)}
                      </span>
                      {group.isLatest && (
                        <span className="text-[9px] font-bold uppercase tracking-wide text-neutral-600 border border-neutral-700 px-1.5 py-0.5 rounded">latest</span>
                      )}
                      <span className={`text-[11px] font-mono ${
                        group.rate > 0.1 ? 'text-red-400' : 'text-emerald-700'
                      }`}>
                        {group.errors === 0
                          ? `✓ ${group.total} successful`
                          : group.errors === group.total
                          ? `❌ ${group.total} failure${group.total > 1 ? 's' : ''}`
                          : `${group.errors} failed / ${group.total} total`}
                      </span>
                      {group.isLatest && isRegression && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 px-1.5 py-0.5 rounded border border-amber-800/50 bg-amber-950/20">
                          <AlertTriangle className="w-3 h-3" /> introduced failures
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                {group.execs.map(exec => {
                  const pathDerived = exec.path.split("/").filter(Boolean)[0] ?? exec.path;
                  const funcName = exec.function_name ?? pathDerived;
                  return (
                    <TableRow key={exec.id} className="border-neutral-900 hover:bg-neutral-900/30 transition-colors group cursor-pointer">
                      <TableCell>
                        <Badge variant={exec.status === 'ok' ? 'success' : 'destructive'} className="font-mono font-bold text-[10px]">
                          {exec.status === 'ok' ? '200' : '500'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-neutral-400">
                        <Link href={`/project/${id}/executions/${exec.id}`} className="group-hover:text-blue-400 transition-colors">
                          {exec.id.slice(0, 12)}...
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-neutral-800 text-neutral-500">{exec.method}</Badge>
                          {exec.function_id ? (
                            <Link href={`/project/${id}/functions/${exec.function_id}`} className="text-neutral-200 text-xs font-mono font-medium hover:text-blue-400 transition-colors" onClick={e => e.stopPropagation()}>
                              {funcName}
                            </Link>
                          ) : (
                            <span className="text-neutral-200 text-xs font-mono font-medium">{funcName}</span>
                          )}
                          {exec.path.split("/").filter(Boolean).length > 1 && (
                            <span className="text-neutral-600 text-xs font-mono truncate max-w-[120px]">
                              /{exec.path.split("/").filter(Boolean).slice(1).join("/")}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-500 font-mono">
                          <Clock className="w-3 h-3 opacity-40" />
                          {exec.duration_ms}ms
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 text-xs text-neutral-600 font-mono group-hover:text-neutral-400 transition-colors">
                          {new Date(exec.started_at ?? new Date().toISOString()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </Fragment>
            ))}
          </TableBody>
        </Table>
        
        {loading && (
          <div className="p-12 text-center text-neutral-700 font-mono text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 animate-pulse">
            <Activity className="w-4 h-4" /> 
            Streaming cloud logs...
          </div>
        )}
        
        {!loading && filtered.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center border-t border-neutral-900/50">
             <Activity className="w-8 h-8 text-neutral-900 mb-3" />
             <p className="text-neutral-600 font-mono text-xs italic">No matching executions found in this environment.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExecutionsPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <ExecutionsPageContent params={params} />
    </Suspense>
  );
}

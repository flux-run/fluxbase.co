"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFluxApi } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { Zap, Activity, AlertCircle, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Function, FunctionStatsResult } from "@/types/api";

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Same compact-label logic as ExecutionTimeline — surfaces the real failure op
function compactIssueLabel(title: string, errorSource?: string): string {
  const raw = title.trim();
  const msg = raw.toLowerCase();

  // fetch errors
  if (msg.includes("fetch failed") || msg.includes("failed to fetch")) {
    const urlMatch = raw.match(/https?:\/\/([^/\s:]+)/);
    const domain = urlMatch ? urlMatch[1] : null;
    const hint = msg.includes("dns") || msg.includes("resolve") ? " (DNS failed)"
      : msg.includes("timeout") ? " (timeout)"
      : msg.includes("refused") || msg.includes("econnrefused") ? " (connection refused)"
      : msg.includes("certificate") || msg.includes("ssl") || msg.includes("tls") ? " (TLS error)"
      : "";
    return domain ? `fetch → ${domain}${hint}` : `fetch failed${hint}`;
  }
  if (msg.includes("dns") || (msg.includes("resolve") && !msg.includes("promise"))) return "DNS lookup failed";
  if (msg.includes("timeout")) return "Request timed out";
  if (msg.includes("connection refused") || msg.includes("econnrefused")) return "Connection refused";
  if (msg.includes("certificate") || (msg.includes("ssl") && !msg.includes("ssl_")) || msg.includes(" tls ")) return "TLS / certificate error";

  // Named JS errors — extract name + short message
  const namedErr = raw.match(/^(ReferenceError|TypeError|SyntaxError|RangeError|URIError|EvalError):\s*(.+)/);
  if (namedErr) {
    const short = namedErr[2].length > 55 ? namedErr[2].slice(0, 55) + "…" : namedErr[2];
    // Add source hint for user code errors
    const src = errorSource === "user_code" ? " (user code)" : errorSource === "platform_runtime" ? " (runtime)" : "";
    return `${namedErr[1]}: ${short}${src}`;
  }

  // Generic — truncate
  return raw.length > 72 ? raw.slice(0, 72) + "…" : raw;
}
import { CLIInitDialog } from "@/components/dashboard/CLIInitDialog";

export default function FunctionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { session } = useAuth();
  const api = useFluxApi(id);
  const [functions, setFunctions] = useState<Function[]>([]);
  const [funcStats, setFuncStats] = useState<Record<string, FunctionStatsResult>>({});
  const [loading, setLoading] = useState(true);
  const [isInitOpen, setIsInitOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!api.ready) return;
    api.getFunctions().then(data => {
      // Sort by urgency: failing-now (recent error) first, then by failure rate
      const now = Date.now();
      const sorted = [...data].sort((a, b) => {
        const rateA = (a.total_execs ?? 0) > 0 ? (a.total_errors ?? 0) / a.total_execs! : 0;
        const rateB = (b.total_execs ?? 0) > 0 ? (b.total_errors ?? 0) / b.total_execs! : 0;
        // Recency bonus: errors in last 30 min boost to top
        const recentA = a.last_error_at && (now - new Date(a.last_error_at).getTime()) < 30 * 60_000 ? 1 : 0;
        const recentB = b.last_error_at && (now - new Date(b.last_error_at).getTime()) < 30 * 60_000 ? 1 : 0;
        if (recentB !== recentA) return recentB - recentA;
        return rateB - rateA;
      });
      setFunctions(sorted);
      setLoading(false);
      // Fetch stats in parallel for failure causes
      sorted.forEach(f => {
        if (!f.id) return;
        api.getFunctionStats(f.id).then(st => {
          setFuncStats(prev => ({ ...prev, [f.id!]: st }));
        }).catch(() => {});
      });
    }).catch(console.error);
  }, [id, api]);

  const handleDelete = async (funcId: string) => {
    if (confirmId !== funcId) {
      setConfirmId(funcId);
      return;
    }
    setDeletingId(funcId);
    try {
      await api.deleteFunction(funcId);
      setFunctions(prev => prev.filter(f => f.id !== funcId));
    } catch (err) {
      console.error("Failed to delete function:", err);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Functions</h2>
          <p className="text-sm text-neutral-500 mt-1">Your serverless compute units.</p>
        </div>
        <Button 
          onClick={() => setIsInitOpen(true)}
          variant="outline" size="sm" className="bg-white text-black hover:bg-neutral-200 font-bold h-9"
        >
          <Plus className="w-4 h-4 mr-2" />
          Deploy Function
        </Button>
      </header>

      <CLIInitDialog
        isOpen={isInitOpen}
        onClose={() => setIsInitOpen(false)}
        projectId={id}
      />

      <div className="border border-neutral-900 rounded-lg bg-[#0c0c0c] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#111] hover:bg-[#111]">
            <TableRow className="border-neutral-900 hover:bg-transparent">
              <TableHead className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Function Name</TableHead>
              <TableHead className="text-center font-mono text-[10px] uppercase tracking-widest text-neutral-500">Executions</TableHead>
              <TableHead className="text-center font-mono text-[10px] uppercase tracking-widest text-neutral-500">Failure Rate</TableHead>
              <TableHead className="text-center font-mono text-[10px] uppercase tracking-widest text-neutral-500">p95</TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Status</TableHead>
              <TableHead className="text-right font-mono text-[10px] uppercase tracking-widest text-neutral-500">Last Deployed</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {functions.map(f => {
              const st = funcStats[f.id!];
              const failureRate = (f.total_execs ?? 0) > 0 ? (f.total_errors ?? 0) / f.total_execs! * 100 : 0;
              const topIssue = st?.top_issues?.[0] ?? null;
              const causeText = topIssue
                ? compactIssueLabel(topIssue.title, topIssue.error_source)
                : null;
              // Version comes directly from the functions list response
              const artifactId = f.latest_artifact_id ?? null;
              const shortSha = artifactId?.slice(0, 7) ?? null;
              const bootFailed = f.latest_deploy_status === 'boot_failed';
              const stateLabel = failureRate >= 20 ? 'failing' : failureRate > 0 ? 'intermittent' : 'healthy';
              // Regression signal: errors appeared after the most recent deploy
              const brokAfterDeploy =
                !!f.latest_deploy_at &&
                !!f.last_error_at &&
                new Date(f.last_error_at) > new Date(f.latest_deploy_at) &&
                failureRate >= 10;
              return (
              <TableRow key={f.id} className="border-neutral-900 hover:bg-neutral-900/30 transition-colors group cursor-pointer">
                <TableCell>
                  <Link href={`/project/${id}/functions/${f.id}`} className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      <span className="text-neutral-100 font-bold group-hover:text-blue-400 transition-colors">{f.name}</span>
                      {shortSha && (
                        <>
                          <span className="text-neutral-700 text-[10px] font-mono select-none">•</span>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                              bootFailed
                                ? 'text-red-400 border-red-900/60 bg-red-950/30'
                                : 'text-neutral-500 border-neutral-800 bg-neutral-900'
                            }`}
                            title={bootFailed ? 'Boot failed — function did not start' : `Artifact: ${artifactId}`}
                          >
                            {shortSha}
                            {bootFailed && <span className="text-red-500">!</span>}
                          </span>
                        </>
                      )}
                    </div>
                    {causeText ? (
                      <div className="flex items-center gap-1.5 ml-[22px]">
                        <span className={`text-[11px] font-mono leading-snug ${failureRate >= 20 ? 'text-red-400' : 'text-yellow-400'}`}>
                          {failureRate >= 20 ? '❌' : '⚠️'} {causeText}
                        </span>
                        {f.last_error_at && (
                          <span className="text-[10px] text-neutral-700 font-mono whitespace-nowrap">• {timeAgo(f.last_error_at)}</span>
                        )}
                        {brokAfterDeploy && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 px-1.5 py-0.5 rounded border border-amber-800/50 bg-amber-950/20 whitespace-nowrap">
                            <AlertTriangle className="w-3 h-3" /> broke after deploy
                          </span>
                        )}
                      </div>
                    ) : null}
                  </Link>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-300 font-mono">
                    <Activity className="w-3 h-3 text-neutral-600" />
                    {f.total_execs || 0}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <span className={`text-xs font-mono font-bold ${failureRate >= 20 ? 'text-red-500' : failureRate > 0 ? 'text-yellow-500' : 'text-neutral-600'}`}>
                      {failureRate.toFixed(0)}% errors
                    </span>
                    {f.last_error_at && failureRate > 0 && (
                      <span className="text-[10px] text-neutral-600 font-mono whitespace-nowrap">
                        last fail {timeAgo(f.last_error_at)}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="text-xs text-neutral-400 font-mono flex items-center justify-center gap-1">
                    {(f.p95 && f.p95 > 0) ? (
                      <>{Math.round(f.p95)}ms{f.p95 > 500 && <span className="text-[10px] text-yellow-500 ml-1" title="Slow response time">⚠️</span>}</>
                    ) : (
                      <span className="text-neutral-700" title="No successful executions yet">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      stateLabel === 'failing' ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.4)]' :
                      stateLabel === 'intermittent' ? 'bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.4)]' :
                      'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.35)]'
                    }`} />
                    <span className={`text-[10px] font-bold uppercase tracking-tight ${
                      stateLabel === 'failing' ? 'text-red-400' :
                      stateLabel === 'intermittent' ? 'text-yellow-400' :
                      'text-green-500'
                    }`}>
                      {stateLabel === 'failing' ? 'Failing' : stateLabel === 'intermittent' ? 'Intermittent' : 'Healthy'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-[11px] font-mono" title={f.latest_deploy_at ? new Date(f.latest_deploy_at).toLocaleString() : undefined}>
                  {f.latest_deploy_at ? (
                    <span className="text-neutral-500">{timeAgo(f.latest_deploy_at)}</span>
                  ) : f.created_at ? (
                    <span className="text-neutral-700">{timeAgo(f.created_at)}</span>
                  ) : (
                    <span className="text-neutral-800">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deletingId === f.id}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); f.id && handleDelete(f.id); }}
                    className={`h-7 px-2 text-[10px] font-mono transition-all ${
                      confirmId === f.id
                        ? "text-red-400 bg-red-950/40 hover:bg-red-950/60 border border-red-800/50"
                        : "text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    {deletingId === f.id ? "Deleting…" : confirmId === f.id ? "Confirm" : "Delete"}
                  </Button>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
        
        {loading && (
          <div className="p-12 text-center text-neutral-700 font-mono text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 animate-pulse">
            <Activity className="w-4 h-4" /> 
            Fetching registry...
          </div>
        )}
        
        {!loading && functions.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center border-t border-neutral-900/50">
            <Zap className="w-8 h-8 text-neutral-900 mb-3" />
            <p className="text-neutral-600 font-mono text-xs italic">No functions deployed in this project yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

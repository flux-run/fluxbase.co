"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFluxApi } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { Zap, Activity, AlertCircle, Plus, Trash2 } from "lucide-react";
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
import { Function, Project } from "@/types/api";
import { CLIInitDialog } from "@/components/dashboard/CLIInitDialog";

export default function FunctionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { session } = useAuth();
  const api = useFluxApi(id);
  const [functions, setFunctions] = useState<Function[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitOpen, setIsInitOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!api.ready) return;
    api.getFunctions().then(data => {
      setFunctions(data);
      setLoading(false);
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
            {functions.map(f => (
              <TableRow key={f.id} className="border-neutral-900 hover:bg-neutral-900/30 transition-colors group cursor-pointer">
                <TableCell>
                  <Link href={`/project/${id}/functions/${f.id}`} className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-neutral-100 font-bold group-hover:text-blue-400 transition-colors">{f.name}</span>
                    </div>
                    <span className="text-[10px] text-neutral-600 font-mono mt-0.5">{f.id}</span>
                  </Link>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-300 font-mono">
                    <Activity className="w-3 h-3 text-neutral-600" />
                    {f.total_execs || 0}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className={`flex items-center gap-1.5 text-xs font-mono ${(f.total_errors ?? 0) > 0 ? "text-red-500" : "text-neutral-600"}`}>
                      <AlertCircle className="w-3 h-3" />
                      {f.total_execs && f.total_execs > 0 ? (((f.total_errors ?? 0) / f.total_execs) * 100).toFixed(1) : 0}%
                    </div>
                    {(f.total_errors ?? 0) > 0 && f.last_error_at && (
                      <div className="text-[9px] text-red-500/70 mt-1 whitespace-nowrap" title={new Date(f.last_error_at).toLocaleString()}>
                        last: {new Date(f.last_error_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="text-xs text-neutral-400 font-mono flex items-center justify-center gap-1">
                    {Math.round(f.p95 || 0)}ms
                    {f.p95 && f.p95 > 500 && <span className="text-[10px] text-yellow-500" title="Slow execution">⚠️</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      f.severity === 'critical' ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 
                      f.severity === 'warning' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]' : 
                      'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                    }`} />
                    <Badge variant={f.severity === 'critical' ? 'destructive' : f.severity === 'warning' ? 'secondary' : 'success'} className="bg-transparent border-none p-0 text-[10px] font-bold uppercase tracking-tight">
                      {f.status_message || f.status || "Active"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right text-neutral-600 text-[11px] font-mono">
                  {f.created_at ? new Date(f.created_at).toLocaleDateString() : 'N/A'}
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
            ))}
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

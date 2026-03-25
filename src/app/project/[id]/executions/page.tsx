"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useFluxApi } from "@/lib/api";
import { Activity, Search, ChevronRight, Clock } from "lucide-react";
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

export default function ExecutionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const api = useFluxApi(id);
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    api.getExecutions().then(data => {
      setExecutions(data);
      setLoading(false);
    }).catch(console.error);
  }, [id]);

  const filtered = filter === "all" ? executions : executions.filter(e => e.status === filter);

  return (
    <div className="space-y-6">
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

      <div className="border border-neutral-900 rounded-lg bg-[#0c0c0c] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#111] hover:bg-[#111]">
            <TableRow className="border-neutral-900 hover:bg-transparent">
              <TableHead className="w-[100px] font-mono text-[10px] uppercase tracking-widest text-neutral-500">Status</TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Execution ID</TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Method / Path</TableHead>
              <TableHead className="text-center font-mono text-[10px] uppercase tracking-widest text-neutral-500">Duration</TableHead>
              <TableHead className="text-right font-mono text-[10px] uppercase tracking-widest text-neutral-500">Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(exec => (
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
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-neutral-800 text-neutral-500">{exec.method}</Badge>
                      <span className="text-neutral-300 text-xs truncate max-w-[200px]">{exec.path}</span>
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
                      {new Date(exec.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                    </div>
                 </TableCell>
               </TableRow>
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

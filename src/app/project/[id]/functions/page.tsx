"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { Zap, Activity, AlertCircle, Plus } from "lucide-react";
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

export default function FunctionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [functions, setFunctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi(`/functions?project_id=${id}`).then(data => {
      setFunctions(data);
      setLoading(false);
    }).catch(console.error);
  }, [id]);

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Functions</h2>
          <p className="text-sm text-neutral-500 mt-1">Your serverless compute units.</p>
        </div>
        <Button variant="outline" size="sm" className="bg-white text-black hover:bg-neutral-200 font-bold h-9">
          <Plus className="w-4 h-4 mr-2" />
          Deploy Function
        </Button>
      </header>

      <div className="border border-neutral-900 rounded-lg bg-[#0c0c0c] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#111] hover:bg-[#111]">
            <TableRow className="border-neutral-900 hover:bg-transparent">
              <TableHead className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Function Name</TableHead>
              <TableHead className="text-center font-mono text-[10px] uppercase tracking-widest text-neutral-500">Executions</TableHead>
              <TableHead className="text-center font-mono text-[10px] uppercase tracking-widest text-neutral-500">Failure Rate</TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Status</TableHead>
              <TableHead className="text-right font-mono text-[10px] uppercase tracking-widest text-neutral-500">Last Deployed</TableHead>
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
                    <div className={`flex items-center justify-center gap-1.5 text-xs font-mono ${f.total_errors > 0 ? "text-red-500" : "text-neutral-600"}`}>
                      <AlertCircle className="w-3 h-3" />
                      {f.total_execs > 0 ? ((f.total_errors / f.total_execs) * 100).toFixed(1) : 0}%
                    </div>
                 </TableCell>
                 <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                      <Badge variant="success" className="bg-transparent border-none p-0 text-[10px] font-bold uppercase tracking-tight">Active</Badge>
                    </div>
                 </TableCell>
                 <TableCell className="text-right text-neutral-600 text-[11px] font-mono">
                    {f.created_at ? new Date(f.created_at).toLocaleDateString() : 'N/A'}
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

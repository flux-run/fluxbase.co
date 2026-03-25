"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { Activity, Search, Filter, ChevronRight, Clock } from "lucide-react";

export default function ExecutionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchApi(`/executions?project_id=${id}`).then(data => {
      setExecutions(data);
      setLoading(false);
    }).catch(console.error);
  }, [id]);

  const filtered = filter === "all" ? executions : executions.filter(e => e.status === filter);

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Executions</h2>
          <p className="text-sm text-neutral-500 mt-1">Real-time log of every isolated compute unit.</p>
        </div>
        <div className="flex gap-2">
           <div className="relative group">
              <Search className="w-4 h-4 text-neutral-600 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500 transition-colors" />
              <input type="text" placeholder="Search ID..." className="bg-neutral-900 border border-neutral-800 rounded-md py-1.5 pl-9 pr-4 text-xs font-mono focus:border-neutral-700 outline-none w-48 shadow-inner" />
           </div>
           <div className="flex bg-neutral-900 border border-neutral-800 rounded-md p-1">
              <button 
                onClick={() => setFilter("all")}
                className={`px-3 py-1 text-[10px] font-bold uppercase rounded ${filter === 'all' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
              >All</button>
              <button 
                onClick={() => setFilter("error")}
                className={`px-3 py-1 text-[10px] font-bold uppercase rounded ${filter === 'error' ? 'bg-red-900/40 text-red-500' : 'text-neutral-500 hover:text-neutral-300'}`}
              >Errors</button>
           </div>
        </div>
      </header>

      <div className="border border-neutral-900 rounded-xl overflow-hidden bg-[#111] shadow-2xl shadow-black/20">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-[#181818] border-b border-neutral-800 text-[10px] uppercase tracking-widest text-neutral-500 font-bold font-mono">
            <tr>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Execution ID</th>
              <th className="px-6 py-4">Method / Path</th>
              <th className="px-6 py-4 text-center">Duration</th>
              <th className="px-6 py-4 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900 font-mono text-[13px]">
            {filtered.map(exec => (
               <tr key={exec.id} className="group hover:bg-[#141414] transition-colors">
                 <td className="px-6 py-4">
                   <div className="flex items-center gap-2">
                     <div className={`w-1.5 h-1.5 rounded-full ${exec.status === 'ok' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'}`} />
                     <span className={`font-bold ${exec.status === 'ok' ? 'text-green-500/80' : 'text-red-500/80'}`}>
                        {exec.status === 'ok' ? '200' : '500'}
                     </span>
                   </div>
                 </td>
                 <td className="px-6 py-4">
                   <Link href={`/project/${id}/executions/${exec.id}`} className="text-neutral-400 group-hover:text-blue-400 transition-colors">
                     {exec.id.slice(0, 12)}...
                   </Link>
                 </td>
                 <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] bg-neutral-950 px-1 py-0.5 rounded border border-neutral-800 text-neutral-500 font-bold">{exec.method}</span>
                      <span className="text-neutral-200 truncate max-w-[200px]">{exec.path}</span>
                    </div>
                 </td>
                 <td className="px-6 py-4 text-center text-neutral-500">
                    <div className="flex items-center justify-center gap-1.5">
                      <Clock className="w-3 h-3 opacity-40" />
                      {exec.duration_ms}ms
                    </div>
                 </td>
                 <td className="px-6 py-4 text-right text-neutral-600 flex items-center justify-end gap-2 group-hover:text-neutral-400">
                    {new Date(exec.started_at).toLocaleTimeString()}
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                 </td>
               </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="p-12 text-center text-neutral-700 animate-pulse font-mono text-xs flex items-center justify-center gap-2"><Activity className="w-4 h-4" /> Streaming cloud logs...</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center">
             <Activity className="w-10 h-10 text-neutral-900 mb-4" />
             <p className="text-neutral-600 font-mono text-sm italic">No matching executions found.</p>
          </div>
        )}
      </div>
    </div>
  );
}

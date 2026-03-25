"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { Zap, ArrowUpRight, Activity, AlertCircle } from "lucide-react";

export default function FunctionsPage({ params }: { params: { id: string } }) {
  const [functions, setFunctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi(`/functions?project_id=${params.id}`).then(data => {
      setFunctions(data);
      setLoading(false);
    }).catch(console.error);
  }, [params.id]);

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Functions</h2>
          <p className="text-sm text-neutral-500 mt-1">Your serverless compute units.</p>
        </div>
        <button className="bg-neutral-100 text-black px-4 py-2 rounded-md font-semibold text-sm hover:bg-neutral-300 transition">Deploy Function</button>
      </header>

      <div className="border border-neutral-900 rounded-xl overflow-hidden bg-[#111]">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-[#181818] border-b border-neutral-800 text-[11px] uppercase tracking-wider text-neutral-500 font-bold font-mono">
            <tr>
              <th className="px-6 py-4">Function Name</th>
              <th className="px-6 py-4 text-center">Executions</th>
              <th className="px-6 py-4 text-center">Failure Rate</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Last Deployed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900 font-mono">
            {functions.map(f => (
               <tr key={f.id} className="group hover:bg-[#141414] transition-colors cursor-pointer">
                 <td className="px-6 py-5">
                   <Link href={`/project/${params.id}/functions/${f.id}`} className="flex flex-col">
                     <span className="text-neutral-100 font-bold group-hover:text-blue-400 transition-colors flex items-center gap-2">
                       <Zap className="w-3.5 h-3.5 text-blue-500" />
                       {f.name}
                     </span>
                     <span className="text-[10px] text-neutral-600 mt-0.5">{f.id}</span>
                   </Link>
                 </td>
                 <td className="px-6 py-5 text-center text-neutral-300">
                    <div className="flex items-center justify-center gap-1.5">
                      <Activity className="w-3 h-3 text-neutral-600" />
                      {f.total_execs || 0}
                    </div>
                 </td>
                 <td className="px-6 py-5 text-center">
                    <div className={`flex items-center justify-center gap-1.5 ${f.total_errors > 0 ? "text-red-500" : "text-neutral-600"}`}>
                      <AlertCircle className="w-3 h-3" />
                      {f.total_execs > 0 ? ((f.total_errors / f.total_execs) * 100).toFixed(1) : 0}%
                    </div>
                 </td>
                 <td className="px-6 py-5">
                   <div className="flex items-center gap-2 text-green-500 font-bold">
                     <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                     <span>Deployed</span>
                   </div>
                 </td>
                 <td className="px-6 py-5 text-right text-neutral-500 text-[12px]">
                   {f.created_at ? new Date(f.created_at).toLocaleDateString() : 'N/A'}
                 </td>
               </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="p-8 text-center text-neutral-600 animate-pulse font-mono flex items-center justify-center gap-2"><Activity className="w-4 h-4" /> Fetching function registry...</div>}
        {!loading && functions.length === 0 && (
          <div className="p-16 text-center text-neutral-600 font-mono text-xs">
            No functions deployed. Generate an artifact and upload via CLI.
          </div>
        )}
      </div>
    </div>
  );
}

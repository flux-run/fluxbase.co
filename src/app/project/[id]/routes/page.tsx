"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Globe, Plus, ArrowUpRight, Zap, MoreVertical } from "lucide-react";

export default function RoutesPage({ params }: { params: { id: string } }) {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi(`/routes?project_id=${params.id}`).then(data => {
      setRoutes(data);
      setLoading(false);
    }).catch(console.error);
  }, [params.id]);

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Routes</h2>
          <p className="text-sm text-neutral-500 mt-1">Map public URL paths to your functions.</p>
        </div>
        <button className="bg-neutral-100 text-black px-4 py-2 rounded-md font-semibold text-sm hover:bg-neutral-300 transition flex items-center gap-2">
           <Plus className="w-4 h-4" />
           New Route
        </button>
      </header>

      <div className="border border-neutral-900 rounded-xl overflow-hidden bg-[#111]">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-[#181818] border-b border-neutral-800 text-[10px] uppercase tracking-widest text-neutral-600 font-bold font-mono">
            <tr>
              <th className="px-8 py-4">Method</th>
              <th className="px-8 py-4">Path</th>
              <th className="px-8 py-4">Function Mapping</th>
              <th className="px-8 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900 font-mono">
            {routes.map(r => (
               <tr key={r.id} className="group hover:bg-[#141414] transition-colors">
                 <td className="px-8 py-5">
                    <span className="px-2 py-0.5 bg-neutral-950 rounded border border-neutral-800 text-[10px] font-black text-neutral-400 uppercase">
                       {r.method}
                    </span>
                 </td>
                 <td className="px-8 py-5 text-neutral-200 font-medium tracking-tight">
                    {r.path}
                 </td>
                 <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-blue-500/80 font-bold">
                       <Zap className="w-3.5 h-3.5" />
                       <span className="truncate max-w-[200px] hover:underline cursor-pointer">
                          func_{r.function_id?.split('-')[0] || "unbound"}
                       </span>
                    </div>
                 </td>
                 <td className="px-8 py-5 text-right">
                    <button className="text-neutral-700 hover:text-white transition-colors">
                       <MoreVertical className="w-4 h-4" />
                    </button>
                 </td>
               </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="p-12 text-center text-neutral-700 animate-pulse font-mono text-xs">Fetching dynamic route table...</div>}
        {!loading && routes.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center">
             <Globe className="w-10 h-10 text-neutral-900 mb-4" />
             <p className="text-neutral-600 font-mono text-xs italic tracking-widest">NO DYNAMIC ROUTES DEFINED</p>
          </div>
        )}
      </div>

      <div className="bg-[#111] border border-neutral-900 p-8 rounded-2xl flex items-center justify-between group cursor-help">
         <div>
            <h4 className="text-white font-bold text-sm">Wildcard Routing</h4>
            <p className="text-neutral-500 text-xs mt-1 font-medium">Capture multiple paths by using the `/*` suffix in your route definitions.</p>
         </div>
         <ArrowUpRight className="w-5 h-5 text-neutral-800 group-hover:text-blue-500 transition-colors" />
      </div>
    </div>
  );
}

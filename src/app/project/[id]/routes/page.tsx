"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";

export default function Routes({ params }: { params: { id: string } }) {
  const [routes, setRoutes] = useState<any[]>([]);

  useEffect(() => {
    fetchApi(`/routes?project_id=${params.id}`).then(setRoutes).catch(console.error);
  }, [params.id]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-white">Routes</h2>
        <button className="bg-neutral-100 text-black px-3.5 py-1.5 rounded-md text-sm font-medium hover:bg-neutral-300 transition shadow-lg">New Route</button>
      </div>
      <div className="border border-neutral-800 rounded-lg overflow-hidden bg-[#111]">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#1A1A1A] border-b border-neutral-800 text-neutral-400 font-mono">
            <tr>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Path</th>
              <th className="px-4 py-3 font-medium">Function Binding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800 font-mono">
            {routes.map(r => (
               <tr key={r.id} className="hover:bg-neutral-900 transition">
                 <td className="px-4 py-3 font-semibold text-neutral-300">{r.method}</td>
                 <td className="px-4 py-3 text-white">{r.path}</td>
                 <td className="px-4 py-3 text-neutral-500 opacity-60">func_{r.function_id?.split('-')[0] || "unbound"}</td>
               </tr>
            ))}
          </tbody>
        </table>
        {routes.length === 0 && <div className="p-8 text-center text-neutral-500 font-mono text-sm">No routing rules mapped.</div>}
      </div>
    </div>
  );
}

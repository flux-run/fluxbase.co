"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";

export default function Executions({ params }: { params: { id: string } }) {
  const [executions, setExecutions] = useState<any[]>([]);

  useEffect(() => {
    fetchApi(`/executions?project_id=${params.id}`).then(setExecutions).catch(console.error);
  }, [params.id]);

  return (
    <div>
      <h2 className="text-2xl font-semibold text-white mb-6">Executions</h2>
      <div className="border border-neutral-800 rounded-lg overflow-hidden bg-[#111]">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#1A1A1A] border-b border-neutral-800 text-neutral-400 font-mono">
            <tr>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Path</th>
              <th className="px-4 py-3 font-medium">Duration</th>
              <th className="px-4 py-3 font-medium">Time (UTC)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800 font-mono">
            {executions.map(exec => (
               <tr key={exec.id} className="hover:bg-neutral-900 transition cursor-pointer">
                 <td className="px-4 py-3">
                   <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${exec.status === 'ok' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-500'}`}>
                     {exec.status === 'ok' ? '200 OK' : 'ERR'}
                   </span>
                 </td>
                 <td className="px-4 py-3 font-semibold text-neutral-300">{exec.method}</td>
                 <td className="px-4 py-3">
                   <Link href={`/project/${params.id}/executions/${exec.id}`} className="text-blue-400 hover:text-blue-300 hover:underline">
                     {exec.path}
                   </Link>
                 </td>
                 <td className="px-4 py-3 text-neutral-500">{exec.duration_ms}ms</td>
                 <td className="px-4 py-3 text-neutral-500">{new Date(exec.started_at).toISOString()}</td>
               </tr>
            ))}
          </tbody>
        </table>
        {executions.length === 0 && <div className="p-8 text-center text-neutral-500 font-mono text-sm">Waiting for first execution...</div>}
      </div>
    </div>
  );
}

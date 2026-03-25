"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useFluxApi } from "@/lib/api";
import { Zap, Activity, AlertCircle, Clock, Globe, Terminal, Save, Play, ArrowUpRight, LucideIcon } from "lucide-react";
import { Function, Execution, Route } from "@/types/api";

export default function FunctionDetail({ params }: { params: Promise<{ id: string, func_id: string }> }) {
  const { id, func_id } = use(params);
  const api = useFluxApi(id);
  const [data, setData] = useState<Function | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!api.ready) return;

    try {
      const [func, execs] = await Promise.all([
        api.getFunction(func_id),
        api.getFunctionExecutions(func_id)
      ]);
      setData(func);
      setExecutions(execs);
    } catch (err) {
      console.error("Failed to load function details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (api.ready) {
        api.getFunctionExecutions(func_id).then(setExecutions).catch(console.error);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [func_id, api]);

  if (!data) return <div className="animate-pulse text-sm font-mono text-neutral-500">Loading function orchestration...</div>;

  const stats = [
    { name: "Executions", value: data.stats?.total_execs || 0, icon: Activity as LucideIcon },
    { name: "Error Rate", value: `${(data.stats?.total_execs ?? 0) > 0 ? (((data.stats?.errors ?? 0) / (data.stats?.total_execs ?? 1)) * 100).toFixed(1) : 0}%`, icon: AlertCircle as LucideIcon, color: (data.stats?.errors ?? 0) > 0 ? "text-red-500" : "text-neutral-500" },
    { name: "Avg Duration", value: `${Math.round(data.stats?.avg_duration || 0)}ms`, icon: Clock as LucideIcon },
  ];

  return (
    <div className="space-y-10 pb-20">
      <header className="flex justify-between items-start border-b border-neutral-900 pb-8">
        <div>
          <div className="flex items-center gap-3">
             <div className="p-1.5 bg-blue-600/10 border border-blue-600/20 rounded">
                <Zap className="w-5 h-5 text-blue-500" />
             </div>
             <h2 className="text-3xl font-bold text-white tracking-tight">{data.name}</h2>
          </div>
          <p className="text-neutral-500 font-mono text-sm mt-3 flex items-center gap-4">
            <span>id: {data.id}</span>
            <span className="w-1.5 h-1.5 bg-neutral-800 rounded-full" />
            <span className="text-green-500 font-bold flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
               Deployed
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-md text-sm font-medium hover:border-neutral-700 transition">
            <Play className="w-4 h-4" />
            Run Test
          </button>
          <button className="bg-neutral-100 text-black px-4 py-1.5 rounded-md font-semibold text-sm hover:bg-neutral-300 transition">Logs</button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map(s => (
          <div key={s.name} className="bg-[#111] border border-neutral-800 p-6 rounded-xl">
             <div className="flex items-center justify-between mb-4">
               <s.icon className={`w-4 h-4 ${s.color || "text-neutral-500"}`} />
               <span className="text-[10px] uppercase font-bold text-neutral-600 tracking-widest">{s.name}</span>
             </div>
             <div className="text-3xl font-bold font-mono text-neutral-100">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-10">
          <section>
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                 <Terminal className="w-4 h-4" />
                 Live Executions
               </h3>
               <div className="text-[10px] bg-green-900/20 text-green-500 border border-green-900/50 px-2 py-0.5 rounded-full font-bold animate-pulse">LIVE POLLING</div>
            </div>
            <div className="border border-neutral-900 rounded-xl overflow-hidden bg-[#0c0c0c] shadow-inner">
              <table className="w-full text-left text-[13px] font-mono">
                <thead className="bg-[#111] border-b border-neutral-800 text-neutral-600 text-[10px]">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">STATUS</th>
                    <th className="px-4 py-3">DURATION</th>
                    <th className="px-4 py-3 text-right">TIME</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {executions.map(exec => (
                    <tr key={exec.id} className="hover:bg-neutral-900/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/project/${id}/executions/${exec.id}`} className="text-blue-500 hover:underline">{exec.id.slice(0, 8)}</Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${exec.status === 'ok' ? 'text-green-500' : 'text-red-500'}`}>{exec.status.toUpperCase()}</span>
                      </td>
                       <td className="px-4 py-3 text-neutral-500">{exec.duration_ms}ms</td>
                       <td className="px-4 py-3 text-right text-neutral-600">{new Date(exec.started_at ?? new Date().toISOString()).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                  {executions.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-neutral-700 italic underline-offset-4 decoration-neutral-800 decoration-dashed underline">Waiting for live data surge...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
             <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-4 flex items-center gap-2">
               <Globe className="w-4 h-4" />
               Mapped Routes
             </h3>
              <div className="flex flex-col gap-2">
                 {data.routes?.map((r: Route) => (
                  <div key={r.id} className="bg-[#111] border border-neutral-800 px-4 py-3 rounded-lg flex items-center justify-between font-mono text-sm">
                    <div className="flex items-center gap-3">
                      <span className="px-1.5 py-0.5 bg-neutral-900 rounded border border-neutral-800 text-[10px] font-bold text-neutral-400">{r.method}</span>
                      <span className="text-neutral-200">{r.path}</span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-neutral-700" />
                  </div>
                ))}
                {(!data.routes || data.routes.length === 0) && (
                  <div className="text-neutral-700 text-sm font-mono italic">No routes mapped to this function.</div>
                )}
             </div>
          </section>
        </div>

        <div className="space-y-10">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500">Environment</h3>
              <button className="text-blue-500 hover:text-blue-400 transition flex items-center gap-1.5 text-xs font-bold">
                <Save className="w-3 h-3" />
                Save
              </button>
            </div>
            <div className="bg-neutral-950 border border-neutral-900 rounded-xl p-4 space-y-4 shadow-inner">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">DATABASE_URL</label>
                  <input type="password" value="********" readOnly className="w-full bg-black border border-neutral-800 rounded p-2 text-xs font-mono text-neutral-400 cursor-not-allowed" />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">STRIPE_KEY</label>
                  <input type="text" value="sk_test_..." readOnly className="w-full bg-black border border-neutral-800 rounded p-2 text-xs font-mono text-neutral-400 cursor-not-allowed" />
               </div>
               <button className="w-full bg-neutral-900 border border-neutral-800 py-1.5 rounded text-[11px] font-bold text-neutral-400 hover:bg-neutral-800 transition">Edit Secrets</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

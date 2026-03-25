"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { Header } from "@/components/dashboard/Header";
import { Plus, ArrowUpRight, AlertCircle, Activity } from "lucide-react";

export default function Dashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const orgId = localStorage.getItem("current_org_id");
    fetchApi(`/projects?org_id=${orgId}`).then(data => {
      setProjects(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans flex flex-col">
      <Header />
      
      <main className="max-w-6xl mx-auto w-full p-8">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-100 tracking-tight">Projects</h1>
            <p className="text-sm text-neutral-500 mt-1">Manage your infrastructure environments.</p>
          </div>
          <button className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-md font-semibold text-sm hover:bg-neutral-200 transition">
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-neutral-900 border border-neutral-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(p => (
              <Link 
                key={p.id} 
                href={`/project/${p.id}`} 
                className="group relative flex flex-col justify-between border border-neutral-800 p-6 rounded-xl bg-[#111] hover:border-neutral-600 transition-all hover:shadow-2xl hover:shadow-black/50"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-neutral-100 group-hover:text-white transition-colors">{p.name}</h3>
                    <ArrowUpRight className="w-4 h-4 text-neutral-600 group-hover:text-white transition-all opacity-0 group-hover:opacity-100" />
                  </div>
                  <p className="text-xs text-neutral-600 mt-1 font-mono uppercase tracking-widest">{p.id.slice(0, 8)}</p>
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-neutral-500">Executions (24h)</span>
                      <div className="flex items-center gap-1.5 text-sm font-mono text-neutral-300">
                        <Activity className="w-3.5 h-3.5 text-blue-500" />
                        {p.execs_24h || 0}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-neutral-500">Error Rate</span>
                      <div className="flex items-center gap-1.5 text-sm font-mono text-red-500">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {p.execs_24h > 0 ? ((p.errors_24h / p.execs_24h) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            
            {projects.length === 0 && (
              <div className="col-span-full py-16 flex flex-col items-center justify-center border border-dashed border-neutral-800 rounded-xl bg-neutral-950/50">
                <p className="text-neutral-500 text-sm font-medium">Waiting for your first project...</p>
                <button className="mt-4 text-xs text-blue-500 hover:underline">Deploy a sample function →</button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

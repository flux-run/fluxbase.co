"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { Header } from "@/components/dashboard/Header";
import { Plus, ArrowUpRight, Activity, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
        <header className="mb-12 flex items-center justify-between pb-4 border-b border-neutral-900">
          <div>
            <h1 className="text-xl font-bold font-mono tracking-tight text-neutral-200">
              <span className="text-neutral-500">flux /</span> projects
            </h1>
          </div>
          <Button variant="outline" size="sm" className="bg-white text-black hover:bg-neutral-200 hover:text-black font-bold h-9">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="h-40 bg-[#111] border-neutral-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(p => (
              <Link 
                key={p.id} 
                href={`/project/${p.id}`} 
                className="group transition-transform active:scale-[0.98]"
              >
                <Card className="bg-[#111] border-neutral-800 p-6 h-full hover:border-neutral-600 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-bold text-neutral-100 group-hover:text-blue-400 transition-colors uppercase tracking-tight">{p.name}</h3>
                      <ArrowUpRight className="w-4 h-4 text-neutral-700 group-hover:text-white transition-all opacity-0 group-hover:opacity-100" />
                    </div>
                    <p className="text-xs text-neutral-600 mt-1 font-mono">{p.id.slice(0, 12)}</p>
                  </div>

                  <div className="mt-8 flex items-center gap-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-neutral-600 tracking-widest">Execs (24h)</span>
                      <div className="flex items-center gap-1.5 text-sm font-mono text-neutral-300">
                        <Activity className="w-3.5 h-3.5 text-blue-500" />
                        {p.execs_24h || 0}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-neutral-600 tracking-widest">Errors</span>
                      <div className="flex items-center gap-1.5 text-sm font-mono text-red-500/80">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {p.execs_24h > 0 ? ((p.errors_24h / p.execs_24h) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
            
            {projects.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-neutral-800 rounded-xl bg-[#0c0c0c]">
                <p className="text-neutral-500 text-sm font-mono italic">Waiting for your first project deployment...</p>
                <Button variant="link" className="mt-2 text-blue-500 text-xs font-bold hover:text-blue-400">Deploy a sample function →</Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

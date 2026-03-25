"use client";
import { useEffect, useState, use } from "react";
import { fetchApi } from "@/lib/api";
import { Activity, AlertCircle, Clock, Zap } from "lucide-react";

export default function ProjectOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchApi(`/stats/project?project_id=${id}`).then(setStats).catch(console.error);
  }, [id]);

  if (!stats) return <div className="animate-pulse text-sm font-mono text-neutral-500">Calculating environment metrics...</div>;

  const cards = [
    { name: "Total Executions", value: stats.total || 0, icon: Activity, detail: "Total lifetime" },
    { name: "Success Rate", value: `${stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : 100}%`, icon: Zap, detail: "Across all functions" },
    { name: "Error Rate", value: `${stats.total > 0 ? ((stats.errors / stats.total) * 100).toFixed(1) : 0}%`, icon: AlertCircle, detail: "Last 24h", color: "text-red-500" },
    { name: "Avg Duration", value: `${Math.round(stats.avg_duration || 0)}ms`, icon: Clock, detail: "Median latency" },
  ];

  return (
    <div className="space-y-10">
      <header>
        <h2 className="text-2xl font-bold text-white tracking-tight">Overview</h2>
        <p className="text-sm text-neutral-500 mt-1">Real-time health of your infrastructure.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div key={card.name} className="bg-[#111] border border-neutral-800 p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <card.icon className={`w-5 h-5 ${card.color || "text-blue-500"}`} />
              <span className="text-[10px] uppercase font-bold text-neutral-600 tracking-widest">{card.name}</span>
            </div>
            <div className="text-3xl font-bold text-neutral-100 font-mono tracking-tighter">{card.value}</div>
            <div className="mt-2 text-[11px] text-neutral-500 font-medium">{card.detail}</div>
          </div>
        ))}
      </div>

      <section className="bg-[#111] border border-neutral-900 rounded-xl p-8 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mb-6">
          <Activity className="w-8 h-8 text-neutral-700" />
        </div>
        <h3 className="text-lg font-bold text-neutral-200">Execution Stream Coming Soon</h3>
        <p className="text-sm text-neutral-500 mt-2 max-w-sm">We are building an interactive 3D flamegraph for your entire infrastructure execution flow. Stay tuned.</p>
      </section>
    </div>
  );
}

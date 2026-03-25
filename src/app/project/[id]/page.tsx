"use client";
import { useEffect, useState, use } from "react";
import { fetchApi } from "@/lib/api";
import { Activity, AlertCircle, Clock, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ProjectOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchApi(`/stats/project?project_id=${id}`).then(setStats).catch(console.error);
  }, [id]);

  if (!stats) return <div className="animate-pulse text-sm font-mono text-neutral-500 p-8">Calculating environment metrics...</div>;

  const cards = [
    { name: "Total Executions", value: stats.total || 0, icon: Activity, detail: "Total lifetime", color: "text-blue-500" },
    { name: "Success Rate", value: `${stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : 100}%`, icon: Zap, detail: "Across all functions", color: "text-emerald-500" },
    { name: "Error Rate", value: `${stats.total > 0 ? ((stats.errors / stats.total) * 100).toFixed(1) : 0}%`, icon: AlertCircle, detail: "Last 24h", color: "text-red-500" },
    { name: "Avg Duration", value: `${Math.round(stats.avg_duration || 0)}ms`, icon: Clock, detail: "Median latency", color: "text-amber-500" },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-white tracking-tight">Overview</h2>
        <p className="text-sm text-neutral-500 mt-1">Real-time health of your infrastructure.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <Card key={card.name} className="bg-[#111] border-neutral-800 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                {card.name}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-neutral-100 font-mono tracking-tighter">{card.value}</div>
              <p className="text-[10px] text-neutral-600 font-medium mt-1">
                {card.detail}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-[#111] border border-neutral-900 shadow-xl">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-[#0a0a0a] border border-neutral-900 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <Activity className="w-8 h-8 text-neutral-800" />
          </div>
          <CardTitle className="text-lg font-bold text-neutral-200">Execution Stream Coming Soon</CardTitle>
          <CardDescription className="text-sm text-neutral-600 mt-2 max-w-sm">
            We are building an interactive 3D flamegraph for your entire infrastructure execution flow.
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}

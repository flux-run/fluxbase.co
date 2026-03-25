"use client";
import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { Activity, Search, Zap, ArrowRight, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function ProjectOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [execId, setExecId] = useState("");

  const handleDebug = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!execId.trim()) return;
    router.push(`/project/${id}/executions/${execId.trim()}`);
  };

  const handleDemo = () => {
    // Shared demo ID seeded in the backend
    const demoId = "d3b07455-da1a-4ec1-9231-111111111111";
    router.push(`/project/${id}/executions/${demoId}`);
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-12 max-w-4xl mx-auto">
      
      {/* MOMENTUM HERO */}
      <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600/10 border border-blue-500/20 rounded-3xl mb-4 shadow-[0_0_50px_rgba(37,99,235,0.1)]">
           <Zap className="w-10 h-10 text-blue-500" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
          Debug a production failure
        </h1>
        <p className="text-lg text-neutral-500 max-w-xl mx-auto font-medium">
          Replay failures. Apply fixes. Resume execution. <br/>
          <span className="text-neutral-600">Enter an execution ID to instantly reconstruct the state.</span>
        </p>
      </div>

      {/* SEARCH / DEBUG INPUT */}
      <form 
        onSubmit={handleDebug}
        className="w-full max-w-2xl relative group animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200"
      >
        <div className="absolute inset-0 bg-blue-600/20 blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000" />
        <Card className="relative bg-[#0D0D0D]/80 backdrop-blur-3xl border-white/[0.08] shadow-2xl overflow-hidden group-focus-within:border-blue-500/50 transition-colors">
          <CardContent className="p-2 flex items-center gap-2">
            <div className="pl-4 text-neutral-600 group-focus-within:text-blue-500 transition-colors">
              <Search className="w-5 h-5" />
            </div>
            <Input 
              placeholder="Paste execution ID or request ID..." 
              value={execId}
              onChange={(e) => setExecId(e.target.value)}
              className="flex-1 bg-transparent border-none text-lg font-mono placeholder:text-neutral-700 focus-visible:ring-0 text-white h-14"
            />
            <Button 
              type="submit"
              disabled={!execId.trim()}
              className="bg-white text-black hover:bg-neutral-200 font-black px-6 h-12 rounded-xl transition-all disabled:opacity-30 flex items-center gap-2 group/btn"
            >
              Debug Execution
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
        </Card>
      </form>

      {/* INSTANT WOW / DEMO */}
      <div className="flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
        <button 
          onClick={handleDemo}
          className="flex items-center gap-3 text-blue-500 hover:text-blue-400 font-bold tracking-tight transition-all hover:scale-105 active:scale-95 group"
        >
          <PlayCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          Try a sample debugging session →
        </button>

        <div className="flex items-center justify-center gap-8 opacity-40 hover:opacity-100 transition-opacity">
           <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-500">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Infrastructure Ready
           </div>
           <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-black text-neutral-500">
              <Zap className="w-3 h-3 text-blue-500" />
              0s Cold Start
           </div>
        </div>
      </div>

    </div>
  );
}

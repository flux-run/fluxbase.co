"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { Header } from "@/components/dashboard/Header";
import { Plus, ArrowUpRight, Activity, AlertCircle, Zap, Search, ArrowRight, PlayCircle, Copy, Check, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

import { useSession } from "next-auth/react";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [execId, setExecId] = useState("");
  const router = useRouter();

  const handleDebug = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!execId.trim()) return;
    router.push(`/project/demo/executions/${execId.trim()}`);
  };

  const handleDemo = () => {
    const demoId = "d3b07455-da1a-4ec1-9231-111111111111";
    router.push(`/project/demo/executions/${demoId}`);
  };

  useEffect(() => {
    if (status === "loading") return;
    
    if (status === "unauthenticated") {
        window.location.href = "/login";
        return;
    }

    const orgId = session?.org_id || localStorage.getItem("current_org_id");
    const token = session?.flux_token || localStorage.getItem("flux_token");

    if (!orgId || !token) {
      // If we are authenticated by NextAuth but induction hasn't finished 
      // or synced yet, we wait.
      return;
    }

    fetchApi(`/projects?org_id=${orgId}`, { token }).then(data => {
      setProjects(data);
      setLoading(false);
    }).catch(err => {
      console.error("Dashboard fetch error:", err);
      setLoading(false);
    });
  }, [session, status]);

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
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="bg-white text-black hover:bg-neutral-200 hover:text-black font-bold h-9">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0c0c0c] border border-neutral-800 sm:max-w-md text-white">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold font-mono">Create a new Project</DialogTitle>
                <DialogDescription className="text-neutral-500 font-mono text-xs">
                  Flux is completely CLI-driven. To create and deploy a new project, run these commands:
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="bg-black border border-neutral-900 rounded-lg p-3 space-y-4">
                  <CopyBlock label="1. Initialize locally" command="npx create-flux-app my-project" />
                  <CopyBlock label="2. Deploy to Flux" command="cd my-project && flux deploy" />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="h-40 bg-[#111] border-neutral-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-16">
            {/* MOMENTUM HERO */}
            <div className="flex flex-col items-center justify-center space-y-12 max-w-4xl mx-auto py-12">
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

            {/* PROJECTS SECTION */}
            {projects.length > 0 && (
              <div className="border-t border-neutral-900 pt-12">
                <h2 className="text-xl font-bold font-mono text-neutral-300 mb-6">Your Projects</h2>
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
                </div>
              </div>
            )}
            {projects.length === 0 && (
              <div className="text-center mt-12 mb-20">
                <p className="text-neutral-500 text-sm font-mono italic">Waiting for your first project deployment...</p>
                <Link href="/docs">
                  <Button variant="link" className="mt-2 text-blue-500 text-xs font-bold hover:text-blue-400">Deploy a sample function →</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function CopyBlock({ label, command }: { label: string, command: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-neutral-600 text-[10px] uppercase font-bold tracking-wider">{label}</span>
      <div className="flex items-center justify-between text-blue-400 bg-[#0a0a0a] border border-neutral-900/50 p-2.5 rounded-md font-mono text-xs">
        <code>{command}</code>
        <button onClick={handleCopy} className="hover:scale-110 active:scale-95 transition-all outline-none">
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-neutral-600 hover:text-white" />}
        </button>
      </div>
    </div>
  );
}

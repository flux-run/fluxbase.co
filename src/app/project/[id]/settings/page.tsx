"use client";
import { useEffect, useState, use } from "react";
import { Bell, Globe, Plus, Trash2, Key, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function ProjectSettings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [webhooks, setWebhooks] = useState<any[]>([]);

  useEffect(() => {
    setWebhooks([
      { id: 'wh_1', url: 'https://api.example.com/webhooks/flux', events: ['execution.failed'], status: 'active' }
    ]);
  }, [id]);

  const deleteWebhook = (id: string) => {
    setWebhooks(prev => prev.filter(w => w.id !== id));
  };

  return (
    <div className="space-y-10 max-w-4xl pb-24">
      <header>
        <h2 className="text-2xl font-bold text-white tracking-tight">Project Settings</h2>
        <p className="text-sm text-neutral-500 mt-1">Configure environment variables, webhooks, and security.</p>
      </header>

      {/* WEBHOOKS */}
      <Card className="bg-[#111] border-neutral-900 shadow-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-900/50 pb-6">
          <div className="space-y-1.5">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Webhooks
            </CardTitle>
            <CardDescription className="text-xs text-neutral-600 font-medium italic">
              Notify external services of execution failures.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" className="bg-white text-black hover:bg-neutral-200 font-bold h-8">
            <Plus className="w-3.5 h-3.5 mr-2" />
            Add Webhook
          </Button>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
           {webhooks.map(wh => (
             <div key={wh.id} className="bg-black border border-neutral-900 p-4 rounded-lg flex items-center justify-between group hover:border-neutral-800 transition-colors">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-[#0a0a0a] border border-neutral-900 rounded flex items-center justify-center text-neutral-700">
                      <Globe className="w-5 h-5" />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-xs font-mono text-neutral-300 truncate max-w-[300px]">{wh.url}</span>
                      <div className="flex items-center gap-2 mt-1.5">
                         {wh.events.map((e: string) => (
                           <Badge key={e} variant="outline" className="text-[9px] font-bold text-blue-500 border-blue-500/20 bg-blue-500/5 px-2 py-0 uppercase">
                             {e}
                           </Badge>
                         ))}
                      </div>
                   </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteWebhook(wh.id)} className="h-8 w-8 text-neutral-800 hover:text-red-500 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                   <Trash2 className="w-4 h-4" />
                </Button>
             </div>
           ))}
           {webhooks.length === 0 && (
             <div className="py-12 text-center text-neutral-700 font-mono text-[10px] uppercase tracking-widest border border-dashed border-neutral-800 rounded-lg bg-[#0c0c0c]">
                No configured webhooks.
             </div>
           )}
        </CardContent>
      </Card>

      {/* API KEYS / SECRETS */}
      <Card className="bg-[#111] border-neutral-900 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-neutral-900/50 pb-6">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2">
            <Key className="w-4 h-4" />
            Environment Secrets
          </CardTitle>
          <CardDescription className="text-xs text-neutral-600 font-medium italic">
            Shared secrets accessible across all functions in this environment.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8 flex flex-col gap-6 max-w-lg">
           <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-neutral-600 tracking-wider">DATABASE_URL</Label>
              <div className="flex gap-2">
                 <Input type="password" value="************************" readOnly className="flex-1 bg-black border-neutral-800 text-xs text-neutral-500 h-9 font-mono" />
                 <Button variant="outline" size="sm" className="bg-neutral-900 border-neutral-800 h-9 font-bold text-[11px] uppercase tracking-tight">Reveal</Button>
              </div>
           </div>
           <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-neutral-600 tracking-wider">STRIPE_SECRET_KEY</Label>
              <div className="flex gap-2">
                 <Input type="password" value="************************" readOnly className="flex-1 bg-black border-neutral-800 text-xs text-neutral-500 h-9 font-mono" />
                 <Button variant="outline" size="sm" className="bg-neutral-900 border-neutral-800 h-9 font-bold text-[11px] uppercase tracking-tight">Reveal</Button>
              </div>
           </div>
           <Button variant="link" className="text-blue-500 hover:text-blue-400 font-bold text-xs p-0 h-auto justify-start w-fit mt-2">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add secret variable
           </Button>
        </CardContent>
      </Card>

      {/* DANGER ZONE */}
      <Card className="bg-[#111] border-red-900/20 shadow-xl overflow-hidden">
        <CardHeader className="bg-red-950/5 border-b border-red-900/10">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-red-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
           <div className="flex items-center justify-between p-5 border border-red-900/20 rounded-lg bg-red-950/5">
              <div className="space-y-1">
                 <h4 className="text-white font-bold text-sm tracking-tight">Delete Project</h4>
                 <p className="text-neutral-600 text-xs italic">Permanently remove this environment and all telemetry logs.</p>
              </div>
              <Button variant="destructive" size="sm" className="bg-red-600 text-white font-bold text-[10px] uppercase tracking-widest px-6 h-9 shadow-lg shadow-red-600/10 hover:bg-red-500">
                Nuclear Option
              </Button>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}

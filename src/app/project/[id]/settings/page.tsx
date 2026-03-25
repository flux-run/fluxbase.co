"use client";
import { useEffect, useState, use } from "react";
import { fetchApi } from "@/lib/api";
import { Bell, Globe, Plus, Trash2, Key, ShieldCheck, Mail } from "lucide-react";

export default function ProjectSettings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [webhooks, setWebhooks] = useState<any[]>([]);

  useEffect(() => {
    // Simulated fetching for webhooks as they aren't fully baked in the Deno backend yet
    setWebhooks([
      { id: 'wh_1', url: 'https://api.example.com/webhooks/flux', events: ['execution.failed'], status: 'active' }
    ]);
  }, [id]);

  const deleteWebhook = (id: string) => {
    setWebhooks(prev => prev.filter(w => w.id !== id));
  };

  return (
    <div className="space-y-12 max-w-4xl pb-24">
      <header>
        <h2 className="text-2xl font-bold text-white tracking-tight">Project Settings</h2>
        <p className="text-sm text-neutral-500 mt-1">Configure environment variables, webhooks, and security.</p>
      </header>

      {/* WEBHOOKS */}
      <section className="bg-[#111] border border-neutral-900 rounded-2xl p-8 space-y-6">
        <div className="flex justify-between items-center">
           <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-1 flex items-center gap-2">
                 <Bell className="w-4 h-4" />
                 Webhooks
              </h3>
              <p className="text-[11px] text-neutral-600 font-medium">Notify external services of execution failures.</p>
           </div>
           <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-neutral-100 text-black px-3 py-1.5 rounded-md hover:bg-neutral-300 transition">
              <Plus className="w-3.5 h-3.5" />
              Add Webhook
           </button>
        </div>

        <div className="space-y-3">
           {webhooks.map(wh => (
             <div key={wh.id} className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl flex items-center justify-between group">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center text-neutral-600">
                      <Globe className="w-5 h-5" />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-xs font-mono text-neutral-300 truncate max-w-[300px]">{wh.url}</span>
                      <div className="flex items-center gap-2 mt-1">
                         {wh.events.map((e: string) => (
                           <span key={e} className="text-[9px] font-bold text-blue-500 px-1.5 py-0.5 bg-blue-500/5 border border-blue-500/10 rounded uppercase">
                             {e}
                           </span>
                         ))}
                      </div>
                   </div>
                </div>
                <button onClick={() => deleteWebhook(wh.id)} className="p-2 text-neutral-800 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                   <Trash2 className="w-4 h-4" />
                </button>
             </div>
           ))}
           {webhooks.length === 0 && (
             <div className="py-8 text-center text-neutral-700 font-mono text-xs italic border border-dashed border-neutral-800 rounded-xl bg-neutral-950/20">
                No webhooks configured for this environment.
             </div>
           )}
        </div>
      </section>

      {/* API KEYS / SECRETS */}
      <section className="bg-[#111] border border-neutral-900 rounded-2xl p-8 space-y-8">
         <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-1 flex items-center gap-2">
               <Key className="w-4 h-4" />
               Environment Secrets
            </h3>
            <p className="text-[11px] text-neutral-600 font-medium">Shared secrets accessible across all functions in this project.</p>
         </div>

         <div className="space-y-4 max-w-lg">
            <div className="flex flex-col gap-1.5">
               <label className="text-[10px] uppercase font-bold text-neutral-500">DATABASE_URL</label>
               <div className="flex gap-2">
                  <input type="password" value="************************" readOnly className="flex-1 bg-black border border-neutral-800 rounded-lg p-2 font-mono text-xs text-neutral-500" />
                  <button className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-bold hover:bg-neutral-800 transition">Reveal</button>
               </div>
            </div>
            <div className="flex flex-col gap-1.5">
               <label className="text-[10px] uppercase font-bold text-neutral-500">STRIPE_SECRET_KEY</label>
               <div className="flex gap-2">
                  <input type="password" value="************************" readOnly className="flex-1 bg-black border border-neutral-800 rounded-lg p-2 font-mono text-xs text-neutral-500" />
                  <button className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-bold hover:bg-neutral-800 transition">Reveal</button>
               </div>
            </div>
            <button className="flex items-center gap-2 text-blue-500 hover:text-blue-400 font-bold text-xs mt-2 transition">
               <Plus className="w-3.5 h-3.5" />
               Add Secret variable
            </button>
         </div>
      </section>

      {/* RADIUS OF DESTRUCTION */}
      <section className="bg-[#111] border border-red-900/10 rounded-2xl p-8 space-y-6">
         <h3 className="text-sm font-bold uppercase tracking-widest text-red-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Danger Zone
         </h3>
         <div className="flex items-center justify-between border border-red-900/20 p-4 rounded-xl bg-red-900/5">
            <div>
               <h4 className="text-white font-bold text-xs">Delete Project</h4>
               <p className="text-neutral-600 text-[11px] mt-0.5">Permanently remove this environment and all execution logs.</p>
            </div>
            <button className="bg-red-600 text-white font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded shadow-lg shadow-red-600/10 hover:bg-red-500 transition">Nuclear Option</button>
         </div>
      </section>
    </div>
  );
}

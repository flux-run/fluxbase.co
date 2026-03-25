"use client";
import React from 'react';
import Link from 'next/link';

export default function DocsPage() {
  return (
    <div className="space-y-16 animate-in fade-in duration-1000">
      {/* Header section */}
      <section className="space-y-4">
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-[1.1]">
          Flux Documentation
        </h1>
        <p className="text-xl text-neutral-500 font-medium">
          Debug production failures by replaying them locally.
        </p>
      </section>

      {/* Quickstart Card */}
      <section className="relative group">
        <div className="absolute -inset-px bg-gradient-to-r from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 rounded-xl pointer-events-none" />
        <div className="relative bg-[#0D0D0D] border border-neutral-900 rounded-xl overflow-hidden p-8 sm:p-10 space-y-10">
          <div className="flex items-center justify-between">
             <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">
                Get running in 60 seconds
             </h3>
             <div className="flex gap-1.5 opacity-30">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
             </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <QuickStep 
              number="1" 
              title="Install Flux CLI" 
              cmd="curl -fsSL fluxbase.co/install | bash" 
            />
            <QuickStep 
              number="2" 
              title="Start your node app" 
              cmd="flux serve index.ts" 
            />
            <QuickStep 
              number="3" 
              title="Watch live traffic" 
              cmd="flux tail" 
            />
            <QuickStep 
              number="4" 
              title="Understand a failure" 
              cmd="flux why <id>" 
            />
            <QuickStep 
              number="5" 
              title="Test your fix safely" 
              cmd="flux replay <id>" 
            />
            <QuickStep 
              number="6" 
              title="Apply fix with real IO" 
              cmd="flux resume <id>" 
              isLast
            />
          </div>
        </div>
      </section>

      {/* Navigation Hub */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Link href="/docs/quickstart" className="p-8 bg-blue-600/5 border border-blue-500/20 rounded-xl hover:bg-blue-600/10 hover:border-blue-500/40 transition-all group">
          <div className="text-2xl mb-4 group-hover:scale-110 transition-transform">🚀</div>
          <h4 className="text-lg font-black uppercase tracking-tight text-white mb-2">Quickstart Guide</h4>
          <p className="text-sm text-neutral-500 leading-relaxed font-medium">
            From first install to your first production replay in 5 minutes.
          </p>
        </Link>
        <Link href="/docs/install" className="p-8 bg-neutral-900/40 border border-neutral-800 rounded-xl hover:bg-neutral-900/60 hover:border-neutral-700 transition-all group">
          <div className="text-2xl mb-4 group-hover:scale-110 transition-transform">⬇️</div>
          <h4 className="text-lg font-black uppercase tracking-tight text-white mb-2">Detailed Install</h4>
          <p className="text-sm text-neutral-500 leading-relaxed font-medium">
            CLI reference, server architecture, and runtime environments.
          </p>
        </Link>
      </section>

      {/* Main explanation content */}
      <div className="prose prose-invert max-w-none space-y-12">
        <section className="space-y-6">
          <h2 className="text-2xl font-black uppercase tracking-widest text-white border-b border-neutral-900 pb-4">How it works</h2>
          <p className="text-neutral-400 font-medium leading-relaxed">
            Flux runs alongside your existing TypeScript backend. It records every incoming request — inputs, outputs, database calls, console logs — atomically. When a request fails, Flux provides a deterministic way to debug and fix it without duplicate side effects.
          </p>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-medium border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 text-[10px] uppercase font-black tracking-widest text-neutral-600">
                  <th className="py-4 px-2">Command</th>
                  <th className="py-4 px-2">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                <tr>
                  <td className="py-4 px-2"><code className="text-blue-500 italic">flux why &lt;id&gt;</code></td>
                  <td className="py-4 px-2 text-neutral-400">Explains why it failed — showing error logs and the exact IO line that crashed.</td>
                </tr>
                <tr>
                  <td className="py-4 px-2"><code className="text-blue-500 italic">flux replay &lt;id&gt;</code></td>
                  <td className="py-4 px-2 text-neutral-400">Replays execution using your latest local code. DB/API calls are virtualized.</td>
                </tr>
                <tr>
                  <td className="py-4 px-2"><code className="text-emerald-500 italic font-bold">flux resume &lt;id&gt;</code></td>
                  <td className="py-4 px-2 text-neutral-400">Atomically commits the fix to production with real IO side effects.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-8">
           <h2 className="text-2xl font-black uppercase tracking-widest text-white border-b border-neutral-900 pb-4">Simple Implementation</h2>
           <p className="text-neutral-400 font-medium">
              Flux is non-invasive. Use Hono and <code className="text-neutral-100">flux:pg</code> for database interactions.
           </p>
           <div className="bg-[#080808] border border-neutral-900 rounded-xl p-8 font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto shadow-2xl">
<pre><code>{`import { Hono } from "npm:hono"
import pg from "flux:pg"

const app = new Hono()
const pool = new pg.Pool({ connectionString: Deno.env.get("DATABASE_URL") })

app.post("/orders", async (c) => {
  const body = await c.req.json()
  const result = await pool.query(
    "INSERT INTO orders (email) VALUES ($1) RETURNING *",
    [body.email]
  )
  return c.json(result.rows[0])
})

export default app`}</code></pre>
           </div>
           <div className="pt-6">
              <p className="text-xs text-neutral-600 font-black uppercase tracking-widest italic leading-relaxed text-center">
                 Every request is automatically recorded. No instrumentation required.
              </p>
           </div>
        </section>
      </div>
    </div>
  );
}

function QuickStep({ number, title, cmd, isLast }: { number: string, title: string, cmd: string, isLast?: boolean }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-6 pb-6 ${!isLast ? 'border-b border-neutral-900/50' : ''}`}>
      <div className="flex items-center gap-4 flex-1">
        <div className="h-7 w-7 rounded-sm bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-500 text-[10px] font-black shrink-0">
          {number}
        </div>
        <span className="text-sm font-black uppercase tracking-tight text-neutral-300">
          {title}
        </span>
      </div>
      <div className="group/cmd relative">
        <div className="bg-[#050505] border border-neutral-800 py-2.5 px-4 rounded-sm font-mono text-xs text-neutral-500 sm:min-w-[280px] flex items-center justify-between group-hover/cmd:border-blue-500/30 transition-all">
          <div className="flex items-center gap-2">
            <span className="text-neutral-700">$</span>
            <span className="text-blue-500/80 font-medium">{cmd}</span>
          </div>
          <button className="opacity-0 group-hover/cmd:opacity-100 transition-opacity ml-4 text-[9px] uppercase font-black text-neutral-500 hover:text-white">Copy</button>
        </div>
      </div>
    </div>
  );
}

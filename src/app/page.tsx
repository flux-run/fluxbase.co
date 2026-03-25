"use client";
import React from 'react';
import Link from 'next/link';
import { FluxTerminalDemo } from '@/components/marketing/FluxTerminalDemo';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-blue-500/30 selection:text-white overflow-x-hidden">
      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-6 py-6 md:px-12 md:py-8 border-b border-white/5 sticky top-0 bg-[#0A0A0A]/80 backdrop-blur-xl z-[100]">
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
          <span className="text-2xl font-black tracking-tighter text-white">flux</span>
        </Link>
        <div className="flex items-center gap-6 md:gap-10">
          <Link href="/docs" className="text-sm font-bold uppercase tracking-widest text-neutral-500 hover:text-white transition-colors">Docs</Link>
          <Link href="https://github.com/flux-run/flux" className="text-sm font-bold uppercase tracking-widest text-neutral-500 hover:text-white transition-colors">GitHub</Link>
          <Link href="/login" className="bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-sm hover:bg-neutral-200 transition-all active:scale-95">
            Get Started →
          </Link>
        </div>
      </nav>

      <main className="flex flex-col items-center">
        {/* ── Hero Section ── */}
        <section className="w-full max-w-6xl px-6 pt-24 pb-40 flex flex-col items-center text-center">
          <div className="space-y-8 mb-16 animate-in fade-in slide-in-from-top-4 duration-1000">
            <h1 className="text-5xl md:text-8xl font-black tracking-tight leading-[1] text-balance">
              Reproduce <br className="hidden md:block"/> production bugs <br />
              <span className="text-neutral-700">with one command.</span>
            </h1>
            <div className="max-w-3xl mx-auto">
              <p className="text-xl md:text-2xl text-neutral-400 font-medium leading-relaxed text-balance">
                No logs. No guessing. Replay exactly what happened in production — locally.
                <span className="block mt-2 text-white">Fix the bug and resume execution instantly.</span>
              </p>
            </div>
            
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-10">
               <Link href="/login" className="h-14 px-10 bg-blue-600 text-white flex items-center justify-center text-sm font-black uppercase tracking-[0.2em] rounded-sm hover:bg-blue-500 hover:shadow-[0_0_40px_rgba(59,130,246,0.3)] transition-all active:scale-95 group">
                  Start Debugging <span className="ml-3 group-hover:translate-x-1 transition-transform">→</span>
               </Link>
               <div className="flex items-center gap-3 px-5 py-3 rounded-sm border border-neutral-800 bg-neutral-900/30 font-mono text-xs text-neutral-600 transition-colors hover:border-neutral-700 group">
                  <span className="text-neutral-700 select-none">$</span>
                  <span className="group-hover:text-neutral-500 transition-colors">curl -fsSL fluxbase.co/install | bash</span>
               </div>
            </div>
          </div>

          {/* ── Terminal Hero - PULLED UP ── */}
          <div className="w-full relative group animate-in fade-in zoom-in-95 duration-1000 delay-300">
            <div className="absolute -inset-40 bg-blue-500/10 blur-[160px] rounded-full pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity duration-1000" />
            
            <div className="relative mb-6 flex flex-col items-center gap-4">
              <p className="uppercase tracking-[0.4em] text-neutral-800 text-[9px] font-black pointer-events-none">
                 The modern debugging workflow
              </p>
            </div>
            
            <div className="relative transform group-hover:scale-[1.005] transition-transform duration-1000">
              <FluxTerminalDemo />
              
              <div className="mt-8 text-center">
                <p className="text-[10px] text-neutral-700 font-black uppercase tracking-widest leading-relaxed max-w-md mx-auto">
                  Works with your existing backend. <br />
                  No complex configuration required.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features Grid - Outcome Driven ── */}
        <section className="w-full max-w-6xl px-6 py-40 border-t border-neutral-900">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-sm bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <span className="text-blue-500 font-bold text-sm">01</span>
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight">Replay production <br/> exactly as it happened</h3>
              <p className="text-neutral-500 leading-relaxed font-medium">
                Flux captures the exact outcome of every API call and database query. Replay them locally without mock data or environment sync.
              </p>
            </div>
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-sm bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <span className="text-amber-500 font-bold text-sm">02</span>
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight">Fix bugs without <br/> breaking anything else</h3>
              <p className="text-neutral-500 leading-relaxed font-medium">
                Test your fixes safely. External services are never hit during replay, ensuring no duplicate emails, charges, or corrupt state.
              </p>
            </div>
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-sm bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <span className="text-emerald-500 font-bold text-sm">03</span>
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight">Resume failed <br/> requests instantly</h3>
              <p className="text-neutral-500 leading-relaxed font-medium">
                Once fixed, resume the execution precisely from where it failed. No retries, no data loss, just progress.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-20 border-t border-neutral-900 flex flex-col md:flex-row justify-between items-center gap-12 opacity-50 hover:opacity-100 transition-opacity duration-700">
        <div className="flex flex-col items-center md:items-start gap-4">
          <span className="text-xl font-black tracking-tighter text-white">flux</span>
          <p className="text-neutral-600 text-[10px] uppercase tracking-[0.3em] font-black">
            Deterministic Debugging for modern infra
          </p>
        </div>
        <div className="flex gap-12 text-neutral-500 text-[11px] font-bold uppercase tracking-widest">
          <Link href="/docs" className="hover:text-white transition-colors">Documentation</Link>
          <Link href="https://github.com/flux-run/flux" className="hover:text-white transition-colors">GitHub</Link>
          <Link href="mailto:shashis339@gmail.com" className="hover:text-white transition-colors">Contact</Link>
        </div>
      </footer>
    </div>
  );
}

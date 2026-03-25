"use client";
import React, { useState, useEffect, useRef } from 'react';

interface TerminalLine {
  text: string;
  type: 'command' | 'output' | 'error' | 'success' | 'warning';
  delay?: number;
}

interface Step {
  command: string;
  outputs: TerminalLine[];
  pauseAfter?: number;
}

const STEPS: Step[] = [
  {
    command: "flux why exec_123",
    outputs: [
      { text: "→ Stripe API returned 402", type: 'output' },
      { text: "→ Error: payment failed", type: 'error' },
    ],
    pauseAfter: 800,
  },
  {
    command: "flux replay exec_123",
    outputs: [
      { text: "→ Replaying execution locally...", type: 'output' },
      { text: "→ Applying patch...", type: 'warning' },
      { text: "→ Success: Environment synced", type: 'success' },
    ],
    pauseAfter: 800,
  },
  {
    command: "flux resume exec_123",
    outputs: [
      { text: "→ Resuming request in production...", type: 'output' },
      { text: "→ Completed successfully", type: 'success' },
    ],
    pauseAfter: 3000,
  }
];

export function FluxTerminalDemo() {
  const [visibleLines, setVisibleLines] = useState<TerminalLine[]>([]);
  const [currentCommand, setCurrentCommand] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPaused = useRef(false);

  useEffect(() => {
    let active = true;

    const runStep = async (index: number) => {
      if (!active) return;
      if (isPaused.current) {
        await new Promise(r => setTimeout(r, 500));
        return runStep(index);
      }
      
      const step = STEPS[index];
      
      // Snappy initial delay (reduced from 600ms)
      await new Promise(r => setTimeout(r, 200));
      
      setIsTyping(true);
      // Type command character by character - slightly faster
      for (let i = 0; i <= step.command.length; i++) {
        if (!active) return;
        setCurrentCommand(step.command.slice(0, i));
        await new Promise(r => setTimeout(r, 20 + Math.random() * 40));
      }
      
      setIsTyping(false);
      await new Promise(r => setTimeout(r, 300));

      // Push command to history
      setVisibleLines(prev => [...prev, { text: step.command, type: 'command' }]);
      setCurrentCommand("");

      // Reveal outputs line by line
      for (const output of step.outputs) {
        if (!active) return;
        await new Promise(r => setTimeout(r, index === 0 && output.type === 'error' ? 300 : 80 + Math.random() * 80));
        setVisibleLines(prev => [...prev, output]);
      }

      // Pause before next step
      await new Promise(r => setTimeout(r, step.pauseAfter || 800));

      // Next step or loop
      if (index < STEPS.length - 1) {
        runStep(index + 1);
      } else {
        await new Promise(r => setTimeout(r, 3000));
        if (!active) return;
        setVisibleLines([]);
        runStep(0);
      }
    };

    runStep(0);

    return () => {
      active = false;
      isPaused.current = true;
    };
  }, []);

  return (
    <div 
      className="w-full max-w-2xl mx-auto overflow-hidden rounded-xl border border-neutral-800 bg-[#050505] shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 hover:border-neutral-700 group relative"
      onMouseEnter={() => { isPaused.current = true; }}
      onMouseLeave={() => { isPaused.current = false; }}
    >
      {/* Subtle Glow */}
      <div className="absolute -inset-px bg-gradient-to-b from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      {/* Terminal Header */}
      <div className="flex items-center justify-between border-b border-neutral-900 bg-[#0A0A0A] px-5 py-4">
        <div className="flex gap-2.5">
          <div className="h-3 w-3 rounded-full bg-red-500/20 group-hover:bg-red-500/40 transition-colors" />
          <div className="h-3 w-3 rounded-full bg-amber-500/20 group-hover:bg-amber-500/40 transition-colors" />
          <div className="h-3 w-3 rounded-full bg-emerald-500/20 group-hover:bg-emerald-500/40 transition-colors" />
        </div>
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600 font-mono">
          flux-cli — session:exec_123
        </div>
        <div className="w-12" />
      </div>

      {/* Terminal Body */}
      <div 
        ref={containerRef}
        className="h-[320px] overflow-y-auto p-8 font-mono text-sm sm:text-base leading-relaxed scrollbar-hide"
      >
        <div className="space-y-2">
          {visibleLines.map((line, i) => (
            <div 
              key={i} 
              className={`flex gap-4 animate-in fade-in slide-in-from-left-3 duration-500 ${
                line.type === 'command' ? 'text-white font-bold' : 
                line.type === 'error' ? 'text-red-400 font-medium drop-shadow-[0_0_8px_rgba(248,113,113,0.4)]' : 
                line.type === 'success' ? 'text-emerald-400 font-medium' : 
                line.type === 'warning' ? 'text-amber-400/80 italic' :
                'text-neutral-500'
              }`}
            >
              <span className="shrink-0 select-none text-neutral-700 font-normal">
                {line.type === 'command' ? '$' : ' '}
              </span>
              <span>{line.text}</span>
            </div>
          ))}

          {/* Current Typing Cursor */}
          <div className="flex gap-4 text-white font-bold pt-1">
            <span className="shrink-0 select-none text-neutral-700 font-normal">$</span>
            <div className="flex items-center">
              <span>{currentCommand}</span>
              <span className="ml-1.5 h-5 w-2 animate-pulse bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Footer */}
      <div className="border-t border-neutral-900 bg-[#080808] px-5 py-3 flex items-center justify-between">
         <div className="text-[10px] text-neutral-700 font-bold tracking-tight">
            PID: 84920 · STATUS: <span className="text-emerald-500/80 uppercase tracking-widest ml-1">Active</span>
         </div>
         <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping opacity-75" />
            <span className="text-[10px] text-neutral-600 font-black uppercase tracking-widest">Connected</span>
         </div>
      </div>
    </div>
  );
}

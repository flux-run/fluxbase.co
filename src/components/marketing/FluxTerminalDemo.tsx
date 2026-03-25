"use client";
import React, { useState, useEffect, useRef } from 'react';

interface TerminalLine {
  text: string;
  type: 'command' | 'output' | 'error' | 'success';
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
    pauseAfter: 1200,
  },
  {
    command: "flux replay exec_123",
    outputs: [
      { text: "→ Replaying execution locally...", type: 'output' },
      { text: "→ Applying patch...", type: 'output' },
      { text: "→ Success", type: 'success' },
    ],
    pauseAfter: 1200,
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
  const [stepIndex, setStepIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPaused = useRef(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const runStep = async (index: number) => {
      if (isPaused.current) return;
      
      const step = STEPS[index];
      setIsTyping(true);
      
      // Type command character by character
      for (let i = 0; i <= step.command.length; i++) {
        if (isPaused.current) break;
        setCurrentCommand(step.command.slice(0, i));
        await new Promise(r => setTimeout(r, 40 + Math.random() * 40));
      }
      
      setIsTyping(false);
      await new Promise(r => setTimeout(r, 300));

      // Push command to history
      setVisibleLines(prev => [...prev, { text: step.command, type: 'command' }]);
      setCurrentCommand("");

      // Reveal outputs line by line
      for (const output of step.outputs) {
        if (isPaused.current) break;
        await new Promise(r => setTimeout(r, 80 + Math.random() * 100));
        setVisibleLines(prev => [...prev, output]);
      }

      // Pause before next step
      await new Promise(r => setTimeout(r, step.pauseAfter || 1000));

      // Next step or loop
      if (index < STEPS.length - 1) {
        runStep(index + 1);
      } else {
        await new Promise(r => setTimeout(r, 2000));
        setVisibleLines([]);
        setStepIndex(0);
        runStep(0);
      }
    };

    runStep(0);

    return () => {
      isPaused.current = true;
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div 
      className="w-full max-w-lg mx-auto overflow-hidden rounded-xl border border-neutral-800 bg-[#050505] shadow-2xl transition-all duration-500 hover:border-neutral-700 hover:shadow-blue-500/5 group"
      onMouseEnter={() => { isPaused.current = true; }}
      onMouseLeave={() => { isPaused.current = false; }}
    >
      {/* Terminal Header */}
      <div className="flex items-center justify-between border-b border-neutral-900 bg-[#0A0A0A] px-4 py-3">
        <div className="flex gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500/30 group-hover:bg-red-500/50 transition-colors" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500/30 group-hover:bg-amber-500/50 transition-colors" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/30 group-hover:bg-emerald-500/50 transition-colors" />
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 font-mono">
          flux-cli — debug session
        </div>
        <div className="w-10" />
      </div>

      {/* Terminal Body */}
      <div 
        ref={containerRef}
        className="h-[240px] overflow-y-auto p-6 font-mono text-sm leading-relaxed scrollbar-hide"
      >
        <div className="space-y-1.5">
          {visibleLines.map((line, i) => (
            <div 
              key={i} 
              className={`flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300 ${
                line.type === 'command' ? 'text-neutral-100' : 
                line.type === 'error' ? 'text-red-400/90' : 
                line.type === 'success' ? 'text-emerald-400/90' : 
                'text-neutral-500'
              }`}
            >
              <span className="shrink-0 select-none text-neutral-700">
                {line.type === 'command' ? '$' : ' '}
              </span>
              <span>{line.text}</span>
            </div>
          ))}

          {/* Current Typing Cursor */}
          <div className="flex gap-3 text-neutral-100">
            <span className="shrink-0 select-none text-neutral-700">$</span>
            <div className="flex items-center">
              <span>{currentCommand}</span>
              <span className="ml-1 h-4 w-1.5 animate-pulse bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Footer */}
      <div className="border-t border-neutral-900 bg-[#080808] px-4 py-2 flex items-center justify-between">
         <div className="text-[9px] text-neutral-700 font-medium">
            PID: 84920 · SESSION: ACTIVE
         </div>
         <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-blue-500 animate-ping" />
            <span className="text-[9px] text-neutral-600 font-bold uppercase tracking-tighter">Ready</span>
         </div>
      </div>
    </div>
  );
}

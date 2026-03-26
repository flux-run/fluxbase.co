"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo } from "react";
import { Terminal, Copy, Check, Info } from "lucide-react";
import { useLatestVersion } from "@/lib/use-latest-version";
import { useFluxApi } from "@/lib/api";

interface CLIInitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export function CLIInitDialog({ isOpen, onClose, projectId }: CLIInitDialogProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [serviceToken, setServiceToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const version = useLatestVersion();
  const api = useFluxApi(projectId);

  useEffect(() => {
    if (isOpen && !serviceToken && !loadingToken) {
      const getOrCreateToken = async () => {
        setLoadingToken(true);
        try {
          // Provision a new one for the guide to ensure the user SEES it
          const newToken = await api.createServiceToken("CLI Onboarding Token");
          setServiceToken(newToken.token || null);
        } catch (err) {
          console.error("Failed to provision CLI token:", err);
        } finally {
          setLoadingToken(false);
        }
      };
      getOrCreateToken();
    }
  }, [isOpen, projectId, api, serviceToken, loadingToken]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const steps = useMemo(() => [
    {
      title: "Install CLI",
      command: "curl -fsSL https://fluxbase.co/install | bash",
    },
    {
      title: "Authenticate",
      command: `flux login --url https://api.fluxbase.co --token ${serviceToken || (loadingToken ? "PROVISIONING..." : "YOUR_SERVICE_TOKEN")}`,
    },
    {
      title: "Initialize Project",
      command: "flux init",
    },
    {
      title: "Run Development",
      command: "flux dev",
    }
  ], [serviceToken, loadingToken]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#0A0A0A] border-white/[0.08] text-white sm:max-w-[550px] p-0 rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/10 border-t-blue-500/30">
        {/* Glow Header */}
        <div className="h-48 absolute top-0 left-0 w-full bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />
        
        <div className="relative p-7 pb-2">
          <DialogHeader className="mb-7">
            <div className="flex items-center gap-3.5 mb-2.5">
              <div className="w-9 h-9 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center shadow-inner">
                <Terminal className="w-4.5 h-4.5 text-blue-400" />
              </div>
              <DialogTitle className="text-xl font-black tracking-tight uppercase italic leading-none flex items-center gap-2.5">
                Step-by-Step Deployment
                <span className="text-[10px] font-mono font-bold bg-white/10 px-1.5 py-0.5 rounded text-neutral-400 border border-white/5 non-italic tracking-normal">CLI {version || "v0.2.1"}</span>
              </DialogTitle>
            </div>
            <DialogDescription className="text-neutral-500 text-[11px] font-medium leading-relaxed max-w-[420px]">
              Deploy your functions from any local environment. Your auth token is pre-provisioned for this session.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pb-4">
            {steps.map((step, idx) => (
              <div key={idx} className="relative group w-full overflow-hidden">
                <div className="flex items-center gap-2.5 mb-2 px-1">
                  <span className="text-[10px] font-black font-mono text-blue-500/80">0{idx + 1}</span>
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-neutral-500 group-hover:text-neutral-200 transition-colors">
                    {step.title}
                  </span>
                </div>
                
                <div className="relative flex flex-col rounded-xl bg-[#0F0F0F] border border-white/[0.06] group-hover:border-blue-500/30 transition-all shadow-inner overflow-hidden w-full min-w-0">
                  {/* Copy Button Overlay */}
                  <button 
                    onClick={() => copyToClipboard(step.command, `step-${idx}`)}
                    className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 px-2 py-1 rounded bg-black/40 hover:bg-black/60 border border-white/10 backdrop-blur-md transition-all active:scale-95 group/btn"
                  >
                    {copied === `step-${idx}` ? (
                      <>
                        <Check className="w-3 h-3 text-blue-400" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-blue-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-neutral-500 group-hover/btn:text-neutral-300 transition-colors" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500 group-hover/btn:text-neutral-300">Copy</span>
                      </>
                    )}
                  </button>

                  <div className="w-full min-w-0 overflow-x-auto scrollbar-hide py-4 px-5 pr-20">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-neutral-700 font-mono text-[11px] select-none mt-0.5">$</span>
                      <code className="text-[11px] font-mono text-neutral-200 whitespace-pre-wrap break-all block selection:bg-blue-500/30 min-w-0">
                        {step.command}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-[#080808] border-t border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2 group/help cursor-pointer">
            <div className="w-6 h-6 rounded bg-white/[0.03] flex items-center justify-center border border-white/[0.05] group-hover/help:bg-white/10 transition-colors">
              <Info className="w-3 h-3 text-neutral-600 group-hover/help:text-neutral-300" />
            </div>
            <span className="text-[10px] font-bold text-neutral-600 group-hover/help:text-neutral-400 transition-colors uppercase tracking-tight">Access API Keys</span>
          </div>
          <Button 
            onClick={onClose}
            className="bg-blue-600 text-white hover:bg-blue-500 font-black px-10 rounded-lg uppercase text-[10px] tracking-widest h-10 transition-all border border-blue-400/20 shadow-[0_0_15px_rgba(37,99,235,0.2)]"
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

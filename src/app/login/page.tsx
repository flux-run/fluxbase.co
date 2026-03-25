"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FluxTerminalDemo } from "@/components/marketing/FluxTerminalDemo";

// Minimal Icons
function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
  );
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleOAuth = async (provider: string) => {
    setLoading(true);
    try {
      await signIn(provider, { callbackUrl: "/dashboard" });
    } catch (err: any) {
      setError("Authentication failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center p-8 sm:p-12 lg:p-20 overflow-x-hidden selection:bg-blue-500/30 selection:text-white">
      {/* Absolute Logo */}
      <div className="absolute top-8 left-8 sm:top-12 sm:left-12">
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
          <span className="text-xl font-black tracking-tighter text-white">flux</span>
        </Link>
      </div>

      <main className="w-full max-w-5xl flex flex-col items-center pt-20 sm:pt-32">
        {/* Hero Copy Section */}
        <div className="text-center space-y-8 mb-20 animate-in fade-in slide-in-from-top-4 duration-1000">
          <h1 className="text-4xl md:text-7xl lg:text-8xl font-black tracking-tight text-white leading-[1] text-balance">
            Reproduce any <br className="hidden md:block"/> production bug <br />
            <span className="text-neutral-700">with one command.</span>
          </h1>
          <div className="space-y-4 max-w-2xl mx-auto">
              <p className="text-xl md:text-2xl text-neutral-300 font-medium leading-relaxed text-balance">
                  No logs. No guessing. <br className="hidden sm:block" />
                  Replay exactly what happened in production — locally.
              </p>
          </div>
        </div>

        {/* Terminal Section - THE HERO */}
        <div className="w-full relative group space-y-8 animate-in fade-in zoom-in-95 duration-1000 delay-300">
           {/* Terminal background glow */}
          <div className="absolute -inset-20 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
          
          <div className="relative text-center uppercase tracking-[0.4em] text-neutral-800 text-[10px] font-black pointer-events-none">
             This is your debugging workflow now
          </div>
          
          <div className="relative transform group-hover:scale-[1.01] transition-transform duration-700">
            <FluxTerminalDemo />
          </div>

          <div className="relative text-center">
            <p className="text-xs text-neutral-600 font-bold uppercase tracking-widest leading-relaxed">
               Works with your existing backend. <br className="sm:hidden" /> 
               <span className="text-neutral-700 ml-1">No setup required.</span>
            </p>
          </div>
        </div>

        {/* Login Section - SECONDARY */}
        <section className="w-full max-w-md mt-32 mb-40 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
          <Card className="bg-transparent border border-neutral-800/50 shadow-2xl backdrop-blur-sm relative overflow-visible group hover:border-neutral-700/50 transition-colors">
            <div className="absolute -top-10 left-0 right-0 text-center">
              <p className="text-[10px] uppercase tracking-[0.3em] font-black text-neutral-700 group-hover:text-neutral-500 transition-colors">
                Start debugging instantly
              </p>
            </div>
            
            <CardHeader className="space-y-1 text-center pb-4 pt-10">
              <CardTitle className="text-2xl font-bold tracking-tight text-white">Login to Flux</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 px-10 pb-10">
              <Button 
                onClick={() => handleOAuth("github")}
                className="w-full bg-[#1A1A1A] text-white hover:bg-white hover:text-black transition-all font-bold h-12 flex items-center justify-center gap-4 border border-neutral-800 active:scale-95 duration-200"
                disabled={loading}
              >
                <GitHubIcon className="w-5 h-5 fill-current" />
                Continue with GitHub →
              </Button>
              <Button 
                onClick={() => handleOAuth("google")}
                className="w-full bg-white text-black hover:bg-neutral-200 transition-all font-bold h-12 flex items-center justify-center gap-4 active:scale-95 duration-200"
                disabled={loading}
              >
                <GoogleIcon className="w-5 h-5" />
                Continue with Google →
              </Button>
              
              {error && <p className="text-xs text-red-500 font-medium text-center pt-2">{error}</p>}
            </CardContent>
          </Card>
        </section>

        {/* Global Footer */}
        <footer className="w-full max-w-lg text-center border-t border-neutral-900/50 pt-12 pb-20 opacity-50 hover:opacity-100 transition-opacity duration-500">
          <p className="text-neutral-600 text-[10px] uppercase tracking-[0.3em] font-black mb-6 leading-relaxed">
            Zero logs. Zero friction. <br className="sm:hidden" /> Total visibility.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link href="/docs" className="text-neutral-500 hover:text-white transition text-xs font-bold uppercase tracking-widest">
              Technical architecture →
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}

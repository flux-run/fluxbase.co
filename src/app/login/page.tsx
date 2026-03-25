"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

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
    <div className="min-h-screen bg-[#0A0A0A] relative flex flex-col items-center justify-center p-8 selection:bg-blue-500/30 selection:text-white overflow-hidden">
      {/* High-fidelity background depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(30,60,120,0.15)_0%,_transparent_60%)] pointer-events-none" />
      
      <main className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-500">
        
        {/* Logo - Grouped tightly for unified system feel */}
        <div className="mb-6 flex flex-col items-center">
          <Link href="/" className="flex flex-col items-center hover:opacity-80 transition-opacity">
            <span className="text-3xl font-black tracking-tighter text-white">flux</span>
          </Link>
        </div>

        <Card className="bg-[#0D0D0D]/80 backdrop-blur-3xl border-white/[0.12] shadow-[0_0_80px_rgba(0,0,0,0.4)] relative overflow-hidden group">
          {/* Elite accent lines */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-20" />
          
          <CardHeader className="space-y-4 text-center pb-8 pt-12">
            <CardTitle className="text-3xl font-black tracking-tight text-white leading-tight">Fix production <br/> bugs instantly</CardTitle>
            <div className="space-y-1">
               <p className="text-[14px] text-neutral-300 font-medium tracking-tight">
                  Replay failures. Apply fixes. Resume execution.
               </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-10 px-10 pb-12">
            <div className="space-y-4">
              <Button 
                onClick={() => handleOAuth("github")}
                className="w-full bg-[#EAEAEA] text-black hover:bg-white transition-all font-black h-14 flex items-center justify-center gap-4 shadow-xl hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:-translate-y-1 active:scale-[0.98] duration-300 text-xs uppercase tracking-[0.2em] border-none group/btn"
                disabled={loading}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/[0.05] to-blue-500/0 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                <GitHubIcon className="w-5 h-5 fill-current relative z-10" />
                <span className="relative z-10">Continue with GitHub</span>
              </Button>
              <Button 
                onClick={() => handleOAuth("google")}
                className="w-full bg-transparent text-neutral-600 hover:text-neutral-400 hover:bg-white/5 transition-all font-bold h-12 flex items-center justify-center gap-4 border border-white/5 opacity-40 hover:opacity-100 active:scale-[0.98] duration-200 text-[10px] uppercase tracking-widest"
                disabled={loading}
              >
                <GoogleIcon className="w-3.5 h-3.5 grayscale opacity-50 contrast-125" />
                Continue with Google
              </Button>
            </div>

            <div className="space-y-6 text-center pt-2">
               <p className="text-[11px] text-neutral-500 font-black uppercase tracking-tight leading-relaxed opacity-100">
                  Works with your backend. <br />
                  <span className="text-neutral-600 italic">No complex setup required.</span>
               </p>
            </div>
            
            {error && (
              <div className="pt-2 animate-in fade-in slide-in-from-top-1">
                <p className="text-[10px] text-red-500 font-bold text-center border border-red-500/20 bg-red-500/5 py-2 rounded-sm uppercase tracking-tighter">
                   {error}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Minimal Footer Links */}
        <div className="mt-12 text-center space-y-6 opacity-20 hover:opacity-100 transition-opacity duration-700">
          <p className="text-neutral-500 text-[9px] uppercase tracking-[0.3em] font-black italic">
             Zero logs. Zero friction. Total visibility.
          </p>
          <div className="flex items-center justify-center gap-8">
            <Link href="/" className="text-neutral-600 hover:text-white transition text-[10px] font-black uppercase tracking-widest">
              Landing Page
            </Link>
            <Link href="/docs" className="text-neutral-600 hover:text-white transition text-[10px] font-black uppercase tracking-widest">
              Docs
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

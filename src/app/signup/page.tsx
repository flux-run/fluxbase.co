"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";


export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleOAuth = (provider: string) => {
    if (provider === "github") {
      window.location.href = "/api/auth/login/github";
    } else if (provider === "google") {
      window.location.href = "/api/auth/login/google";
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
      <Link href="/" className="mb-12 flex items-center hover:opacity-80 transition-opacity">
        <span className="text-xl font-bold tracking-tighter text-white">flux</span>
      </Link>

      <div className="w-full max-w-lg mb-12 text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
          Reproduce any production bug <br />
          <span className="text-neutral-500">with one command.</span>
        </h1>
        <p className="text-lg text-neutral-400 font-medium">
          Replay any real execution from your system — instantly.
        </p>
        <div className="pt-4 flex justify-center">
          <div className="magic-code relative px-6 py-4 text-sm inline-flex items-center gap-3">
             <span className="text-neutral-600">$</span>
             <code className="text-white">flux replay abc123</code>
             <div className="w-2 h-4 bg-blue-500 animate-pulse" />
          </div>
        </div>
      </div>

      <Card className="w-full max-w-md bg-[#111] border-neutral-800 shadow-2xl relative">
        <div className="absolute -top-12 left-0 right-0 text-center">
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-neutral-600">
            Start debugging real production failures locally
          </p>
        </div>
        <CardHeader className="space-y-1 text-center pb-2">
          <CardTitle className="text-2xl font-bold tracking-tight text-white">Sign up</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={() => handleOAuth("github")}
            className="w-full bg-[#24292F] text-white hover:bg-[#24292F]/90 font-bold h-12 flex items-center justify-center gap-3 border-none"
            disabled={loading}
          >
            <GitHubIcon className="w-5 h-5 fill-current" />
            Continue with GitHub
          </Button>
          <Button 
            onClick={() => handleOAuth("google")}
            className="w-full bg-white text-black hover:bg-neutral-100 font-bold h-12 flex items-center justify-center gap-3"
            disabled={loading}
          >
            <GoogleIcon className="w-5 h-5" />
            Continue with Google
          </Button>
          
          {error && <p className="text-xs text-red-500 font-medium text-center pt-2">{error}</p>}
        </CardContent>
        <CardFooter className="flex flex-col gap-6 pt-2">
          <div className="grid grid-cols-3 gap-2 w-full text-[10px] uppercase tracking-wider font-bold text-neutral-600">
            <div className="border border-neutral-900 py-2 rounded flex items-center justify-center gap-1">
              Open Source
            </div>
            <div className="border border-neutral-900 py-2 rounded flex items-center justify-center gap-1 text-center">
              Deterministic
            </div>
            <div className="border border-neutral-900 py-2 rounded flex items-center justify-center gap-1">
              CLI Native
            </div>
          </div>
          
          <div className="text-sm text-neutral-500 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-white hover:underline font-medium ml-1">Log in</Link>
          </div>
          <div className="w-full h-px bg-neutral-900" />
          <p className="text-xs text-neutral-600 italic text-center">
            "Used to debug real production failures — not logs."
          </p>
        </CardFooter>
      </Card>

      <div className="mt-12 text-center max-w-sm">
        <p className="text-neutral-600 text-xs font-bold uppercase tracking-[0.2em] mb-4 text-center">
          Core Engine
        </p>
        <p className="text-neutral-500 text-xs text-center">
          Built for debugging distributed systems. Works with your existing backend via CLI.
        </p>
      </div>
    </div>
  );
}

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

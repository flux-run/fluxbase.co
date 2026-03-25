"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";

export default function Login() {
  const [email, setEmail] = useState("dev@fluxbase.co");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetchApi("/auth/login", { method: "POST", body: JSON.stringify({ email }) });
      localStorage.setItem("flux_token", res.token);
      router.push("/dashboard");
    } catch(err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center font-mono">
      <form onSubmit={handleLogin} className="p-8 border border-neutral-800 rounded-lg flex flex-col gap-4 w-96 bg-neutral-900 shadow-2xl">
        <div className="mb-6">
          <Link href="/" className="inline-block hover:opacity-80 transition-opacity mb-4">
            <h1 className="text-2xl font-black tracking-tighter text-white">flux</h1>
          </Link>
          <p className="text-xs text-neutral-500 uppercase tracking-widest leading-relaxed">
            Authentication Required<br/>
            <span className="opacity-40">Production Observability</span>
          </p>
        </div>
        <input 
          className="bg-black border border-neutral-800 text-sm focus:border-neutral-500 outline-none p-3 rounded" 
          value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
        />
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <button className="bg-white text-black font-semibold py-2.5 rounded mt-2 hover:bg-neutral-200 transition">
          Authenticate
        </button>
        {/* Replaced CardFooter with a div to maintain syntactic correctness */}
        <div className="flex flex-col gap-4 text-center pb-8"> 
          <div className="text-sm text-neutral-500">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-white hover:underline font-medium">Sign up</Link>
          </div>
        </div>
      </form>
    </div>
  );
}

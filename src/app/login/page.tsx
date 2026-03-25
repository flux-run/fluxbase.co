"use client";
import { useState } from "react";
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
        <div className="mb-4">
          <h1 className="text-xl font-bold text-white tracking-widest">FLUX_CONTROL</h1>
          <p className="text-xs text-neutral-500 mt-1 uppercase">Authentication Required</p>
        </div>
        <input 
          className="bg-black border border-neutral-800 text-sm focus:border-neutral-500 outline-none p-3 rounded" 
          value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
        />
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <button className="bg-white text-black font-semibold py-2.5 rounded mt-2 hover:bg-neutral-200 transition">
          Authenticate
        </button>
      </form>
    </div>
  );
}

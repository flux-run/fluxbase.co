"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not send reset link");
      }
      setDone(true);
    } catch (err: any) {
      setError(err.message || "Could not send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/40 p-8">
        <h1 className="text-xl font-black">Forgot password</h1>
        <p className="mt-2 text-sm text-neutral-400">Enter your email and we will send a reset link.</p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-11 px-4 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[13px] text-neutral-200 placeholder-neutral-600 outline-none focus:border-white/20 transition-colors font-mono"
          />

          {error && (
            <p className="text-[10px] text-red-400 font-mono bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">{error}</p>
          )}

          {done && (
            <p className="text-[10px] text-emerald-300 font-mono bg-emerald-950/30 border border-emerald-900/40 rounded-lg px-3 py-2">
              If this account exists, we sent a reset link to your email.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg border border-white/[0.12] bg-white/[0.05] hover:bg-white/[0.10] text-[12px] font-black text-white uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <Link href="/login" className="inline-block mt-5 text-[11px] text-neutral-400 hover:text-white underline underline-offset-4">
          Back to login
        </Link>
      </div>
    </div>
  );
}

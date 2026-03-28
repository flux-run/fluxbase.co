"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Missing verification token.");
      return;
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Verification failed");
        }
        setStatus("success");
      })
      .catch((err: any) => {
        setStatus("error");
        setError(err.message || "Verification failed");
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/40 p-8 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-neutral-400" />
            <h1 className="mt-4 text-xl font-black">Verifying your email</h1>
            <p className="mt-2 text-sm text-neutral-500">Please wait...</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-8 h-8 mx-auto text-emerald-400" />
            <h1 className="mt-4 text-xl font-black">Email verified</h1>
            <p className="mt-2 text-sm text-neutral-400">You can now sign in with email and password.</p>
            <Link href="/login" className="inline-block mt-6 px-4 py-2 rounded-lg bg-white text-black font-black text-sm hover:bg-neutral-200 transition-colors">
              Go to login
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-8 h-8 mx-auto text-red-400" />
            <h1 className="mt-4 text-xl font-black">Verification failed</h1>
            <p className="mt-2 text-sm text-neutral-400">{error}</p>
            <Link href="/login" className="inline-block mt-6 px-4 py-2 rounded-lg border border-neutral-700 text-neutral-300 font-black text-sm hover:text-white hover:border-neutral-500 transition-colors">
              Back to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

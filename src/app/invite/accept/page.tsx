"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle, XCircle, Users } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useFluxApi } from "@/lib/api";

type InviteDetails = {
  id: string;
  email: string;
  role: string;
  org_id: string;
  org_name: string;
  org_slug: string;
  expires_at: string;
};

const roleLabel = (r: string) =>
  ({ owner: "Owner", admin: "Admin", member: "Member", viewer: "Viewer" }[r] ?? r);

function InviteAcceptPageContent() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const token         = searchParams.get("token") ?? "";
  const { session, status } = useAuth();
  const api           = useFluxApi();

  const [invite, setInvite]     = useState<InviteDetails | null>(null);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted]   = useState(false);
  const [acceptErr, setAcceptErr] = useState<string | null>(null);

  // Load invite details (unauthenticated)
  useEffect(() => {
    if (!token) { setFetchErr("No invitation token found."); return; }
    api.getInvitation(token)
      .then(data => setInvite(data.invitation))
      .catch(err => setFetchErr(err.message));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleAccept = async () => {
    if (!invite) return;
    setAccepting(true);
    setAcceptErr(null);
    try {
      await api.acceptInvitation(token);
      setAccepted(true);
      // Redirect to dashboard after short delay
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err: any) {
      setAcceptErr(err.message);
    } finally {
      setAccepting(false);
    }
  };

  const loginUrl = `/login?redirect=${encodeURIComponent(`/invite/accept?token=${token}`)}`;

  // ── Loading invite details ──────────────────────────────────────────────
  if (!fetchErr && !invite) {
    return (
      <Shell>
        <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
        <p className="text-sm text-neutral-500 font-mono mt-3">Loading invitation…</p>
      </Shell>
    );
  }

  // ── Error loading invite ────────────────────────────────────────────────
  if (fetchErr) {
    return (
      <Shell>
        <XCircle className="w-8 h-8 text-red-500" />
        <p className="text-sm font-black text-white mt-3">Invalid invitation</p>
        <p className="text-[11px] text-neutral-500 font-mono mt-1 text-center">{fetchErr}</p>
        <button onClick={() => router.push("/")} className="mt-6 text-[10px] font-black text-neutral-400 hover:text-white transition-colors underline underline-offset-4">
          Go home
        </button>
      </Shell>
    );
  }

  // ── Accepted ────────────────────────────────────────────────────────────
  if (accepted) {
    return (
      <Shell>
        <CheckCircle className="w-8 h-8 text-emerald-400" />
        <p className="text-sm font-black text-white mt-3">You're in!</p>
        <p className="text-[11px] text-neutral-500 font-mono mt-1">Redirecting to dashboard…</p>
      </Shell>
    );
  }

  // ── Main invite card ────────────────────────────────────────────────────
  return (
    <Shell>
      <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center mb-1">
        <Users className="w-5 h-5 text-neutral-300" />
      </div>

      <p className="text-base font-black text-white mt-3">You've been invited</p>
      <p className="text-[11px] text-neutral-500 font-mono mt-1 text-center">
        Join <span className="text-neutral-200 font-bold">{invite!.org_name}</span> on Flux
      </p>

      <div className="w-full mt-6 rounded-xl border border-neutral-800 bg-neutral-900/40 divide-y divide-neutral-800">
        <Row label="Organization" value={invite!.org_name} />
        <Row label="Invited email" value={invite!.email} />
        <Row label="Role" value={roleLabel(invite!.role)} />
      </div>

      {/* Not logged in */}
      {status !== "loading" && !session && (
        <div className="w-full mt-5 space-y-3">
          <p className="text-[10px] text-neutral-500 font-mono text-center">
            Log in with the account for <span className="text-neutral-300">{invite!.email}</span> to accept.
          </p>
          <a
            href={loginUrl}
            className="block w-full py-2.5 text-center text-[11px] font-black bg-white text-black hover:bg-neutral-200 rounded-xl transition-colors"
          >
            Log in to accept
          </a>
        </div>
      )}

      {/* Wrong account */}
      {status === "authenticated" && session?.user?.email !== invite!.email && (
        <div className="w-full mt-5 space-y-2">
          <p className="text-[10px] text-amber-400 font-mono text-center bg-amber-950/30 border border-amber-900/40 rounded-xl px-4 py-3">
            You're logged in as <strong>{session?.user?.email}</strong>.<br />
            This invite was sent to <strong>{invite!.email}</strong>.
          </p>
          <a
            href={loginUrl}
            className="block w-full py-2.5 text-center text-[11px] font-black border border-neutral-700 text-neutral-300 hover:text-white hover:border-neutral-500 rounded-xl transition-colors"
          >
            Switch account
          </a>
        </div>
      )}

      {/* Correct account — show accept button */}
      {status === "authenticated" && session?.user?.email === invite!.email && (
        <div className="w-full mt-5 space-y-2">
          {acceptErr && (
            <p className="text-[10px] text-red-400 font-mono bg-red-950/30 border border-red-900/40 rounded-xl px-4 py-3 text-center">{acceptErr}</p>
          )}
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full py-2.5 text-[11px] font-black bg-white text-black hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {accepting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {accepting ? "Accepting…" : "Accept invitation"}
          </button>
        </div>
      )}

      {/* Loading auth */}
      {status === "loading" && (
        <div className="mt-5">
          <Loader2 className="w-4 h-4 animate-spin text-neutral-600 mx-auto" />
        </div>
      )}
    </Shell>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={null}>
      <InviteAcceptPageContent />
    </Suspense>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl px-8 py-10 flex flex-col items-center">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600">{label}</span>
      <span className="text-[11px] font-mono text-neutral-300">{value}</span>
    </div>
  );
}

"use client";
import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, UserPlus, X, Trash2, Mail, Loader2 } from "lucide-react";
import { avatarColor, TeamRole } from "@/lib/teamStore";
import { useFluxApi } from "@/lib/api";

type ApiMember = { id: string; email: string; role: string };
type ApiPending = { id: string; email: string; role: string; created_at: string };

const ROLES: { value: TeamRole; label: string; desc: string }[] = [
  { value: "owner",    label: "Owner",    desc: "Full access, billing, delete" },
  { value: "member",   label: "Member",    desc: "Can view and act on incidents" },
  { value: "viewer",   label: "Viewer",   desc: "Read-only access" },
];

function Avatar({ name }: { name: string }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black shrink-0 text-[11px] ${avatarColor(name)}`}>
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function InviteModal({ orgId, api, onClose, onSuccess }: {
  orgId: string;
  api: ReturnType<typeof useFluxApi>;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail]     = useState("");
  const [role, setRole]       = useState<TeamRole>("member");
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const backendRole = role === "owner" ? "admin" : role === "member" ? "member" : "viewer";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setError(null);
    try {
      await api.sendInvite(orgId, email.trim(), backendRole);
      setSent(true);
      onSuccess();
      setTimeout(onClose, 1400);
    } catch (err: any) {
      setError(err.message || "Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-800/60 flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-white">Invite team member</p>
            <p className="text-[10px] text-neutral-600 font-mono mt-0.5">An invite link will be sent to their email</p>
          </div>
          <button onClick={onClose} className="text-neutral-600 hover:text-neutral-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {sent ? (
          <div className="px-6 py-8 flex flex-col items-center gap-2 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center">
              <Mail className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-sm font-black text-white">Invite sent</p>
            <p className="text-[10px] text-neutral-600 font-mono">{email}</p>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Email *</label>
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="rahul@example.com"
                className="w-full text-[11px] font-mono bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 focus:border-neutral-600 rounded-lg px-3 py-2 text-neutral-200 placeholder-neutral-700 outline-none transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Role</label>
              <div className="flex gap-2">
                {ROLES.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`flex-1 text-[10px] font-black py-2 rounded-lg border transition-colors ${
                      role === r.value
                        ? "bg-neutral-800 border-neutral-600 text-white"
                        : "border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            {error && (
              <p className="text-[10px] text-red-400 font-mono bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">{error}</p>
            )}
            <button
              type="submit"
              disabled={sending}
              className="w-full py-2.5 text-[11px] font-black bg-white text-black hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors mt-2 flex items-center justify-center gap-2"
            >
              {sending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {sending ? "Sending…" : "Send invite"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();
  const api     = useFluxApi(id);
  const [showInvite, setShowInvite] = useState(false);
  const [members, setMembers]       = useState<ApiMember[]>([]);
  const [pending, setPending]       = useState<ApiPending[]>([]);
  const [loadError, setLoadError]   = useState<string | null>(null);

  const orgId = typeof window !== "undefined"
    ? localStorage.getItem("current_org_id") ?? ""
    : "";

  const loadTeam = useCallback(async () => {
    if (!orgId) return;
    try {
      const data = await api.getTeam(orgId);
      setMembers(data.members);
      setPending(data.pending);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err.message);
    }
  }, [api, orgId]);

  useEffect(() => { if (api.ready) loadTeam(); }, [api.ready, loadTeam]);

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await api.updateMemberRole(orgId, userId, role);
      await loadTeam();
    } catch (err: any) { alert(err.message); }
  };

  const handleRemove = async (userId: string, email: string) => {
    if (!confirm(`Remove ${email} from the team?`)) return;
    try {
      await api.removeMember(orgId, userId);
      await loadTeam();
    } catch (err: any) { alert(err.message); }
  };

  const handleRevokeInvite = async (invId: string) => {
    if (!confirm("Revoke this invitation?")) return;
    try {
      await api.revokeInvite(orgId, invId);
      await loadTeam();
    } catch (err: any) { alert(err.message); }
  };

  const roleLabel = (r: string) =>
    ({ owner: "Owner", admin: "Admin", member: "Member", viewer: "Viewer" }[r] ?? r);

  const ownerCount = members.filter(m => m.role === "owner" || m.role === "admin").length;

  return (
    <div className="py-6 max-w-2xl space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push(`/project/${id}/settings`)}
        className="flex items-center gap-1.5 text-[10px] text-neutral-500 hover:text-neutral-300 font-mono transition-colors"
      >
        <ArrowLeft className="w-3 h-3" />
        Settings
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-neutral-400" />
            <h1 className="text-base font-black text-white">Team</h1>
            <span className="text-[9px] font-black text-neutral-600 bg-neutral-900 border border-neutral-800 rounded-full px-2 py-0.5">
              {members.length + pending.length}
            </span>
          </div>
          <p className="text-[11px] text-neutral-600 font-mono">Manage who has access to this project.</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 text-[10px] font-black text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-500 rounded-xl px-4 py-2 transition-all shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Invite member
        </button>
      </div>

      {/* Members list */}
      {loadError && (
        <p className="text-[10px] text-red-400 font-mono bg-red-950/30 border border-red-900/40 rounded-xl px-4 py-3">{loadError}</p>
      )}
      <div className="rounded-xl border border-neutral-800/60 overflow-hidden">
        {members.length === 0 && pending.length === 0 && !loadError && (
          <div className="px-4 py-6 text-center text-[10px] text-neutral-600 font-mono">
            {api.ready ? "No members yet" : "Loading…"}
          </div>
        )}
        {members.map((u, i) => (
          <div
            key={u.id}
            className={`flex items-center gap-4 px-4 py-3.5 ${
              i < members.length - 1 || pending.length > 0 ? "border-b border-neutral-800/40" : ""
            } hover:bg-neutral-900/30 transition-colors group`}
          >
            <Avatar name={u.email} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black text-neutral-200">{u.email}</span>
                <span className="text-[8px] font-black text-emerald-500 bg-emerald-950/40 border border-emerald-900/40 rounded px-1.5 py-0.5">Active</span>
              </div>
            </div>
            <select
              value={u.role}
              onChange={e => handleRoleChange(u.id, e.target.value)}
              disabled={u.role === "owner" && ownerCount === 1}
              className="text-[10px] font-bold px-2 py-1 rounded border border-neutral-800 bg-neutral-900/60 text-neutral-300 outline-none hover:border-neutral-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={() => handleRemove(u.id, u.email)}
              disabled={u.role === "owner" && ownerCount === 1}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-700 hover:text-red-400 disabled:pointer-events-none"
              title="Remove member"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {pending.map((inv, i) => (
          <div
            key={inv.id}
            className={`flex items-center gap-4 px-4 py-3.5 ${i < pending.length - 1 ? "border-b border-neutral-800/40" : ""} hover:bg-neutral-900/30 transition-colors group`}
          >
            <Avatar name={inv.email} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black text-neutral-400">{inv.email}</span>
                <span className="text-[8px] font-black text-amber-500 bg-amber-950/40 border border-amber-900/40 rounded px-1.5 py-0.5">Invited</span>
              </div>
              <p className="text-[9px] text-neutral-700 font-mono mt-0.5">{roleLabel(inv.role)}</p>
            </div>
            <button
              onClick={() => handleRevokeInvite(inv.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-700 hover:text-red-400"
              title="Revoke invitation"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Role legend */}
      <div className="rounded-xl border border-neutral-800/40 bg-neutral-950/40 px-5 py-4">
        <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600 mb-3">Roles</p>
        <div className="space-y-2">
          {ROLES.map(r => (
            <div key={r.value} className="flex items-baseline gap-3">
              <span className="text-[10px] font-black text-neutral-400 w-20 shrink-0">{r.label}</span>
              <span className="text-[10px] text-neutral-600 font-mono">{r.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {showInvite && orgId && (
        <InviteModal
          orgId={orgId}
          api={api}
          onClose={() => setShowInvite(false)}
          onSuccess={loadTeam}
        />
      )}
    </div>
  );
}

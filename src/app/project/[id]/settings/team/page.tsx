"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, UserPlus, X, ChevronDown, Trash2, Mail } from "lucide-react";
import { useTeam, avatarColor, TeamRole, TeamUser } from "@/lib/teamStore";

const ROLES: { value: TeamRole; label: string; desc: string }[] = [
  { value: "owner",    label: "Owner",    desc: "Full access, billing, delete" },
  { value: "engineer", label: "Engineer", desc: "Can view and act on incidents" },
  { value: "viewer",   label: "Viewer",   desc: "Read-only access" },
];

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "w-6 h-6 text-[9px]" : size === "lg" ? "w-10 h-10 text-sm" : "w-8 h-8 text-[11px]";
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-black shrink-0 ${avatarColor(name)}`}>
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function RoleSelect({ value, onChange, disabled }: { value: TeamRole; onChange: (r: TeamRole) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const current = ROLES.find(r => r.value === value)!;
  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded border transition-colors ${
          disabled ? "text-neutral-600 border-transparent cursor-default" :
          "text-neutral-300 border-neutral-800 hover:border-neutral-600 bg-neutral-900/60"
        }`}
      >
        {current.label}
        {!disabled && <ChevronDown className="w-3 h-3 text-neutral-600" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-52 rounded-xl border border-neutral-800 bg-neutral-950 shadow-xl overflow-hidden">
            {ROLES.map(r => (
              <button
                key={r.value}
                onClick={() => { onChange(r.value); setOpen(false); }}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-neutral-900 transition-colors ${
                  r.value === value ? "bg-neutral-900/60" : ""
                }`}
              >
                <div className="flex-1">
                  <p className={`text-[10px] font-black ${r.value === value ? "text-white" : "text-neutral-300"}`}>{r.label}</p>
                  <p className="text-[9px] text-neutral-600 font-mono mt-0.5">{r.desc}</p>
                </div>
                {r.value === value && <span className="text-[8px] text-blue-400 font-black mt-0.5">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function InviteModal({ onClose, onInvite }: {
  onClose: () => void;
  onInvite: (name: string, email: string, role: TeamRole) => void;
}) {
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole]   = useState<TeamRole>("engineer");
  const [sent, setSent]   = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    onInvite(name, email, role);
    setSent(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-800/60 flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-white">Invite team member</p>
            <p className="text-[10px] text-neutral-600 font-mono mt-0.5">They'll be added with invited status</p>
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
              <label className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Name (optional)</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Rahul"
                className="w-full text-[11px] font-mono bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 focus:border-neutral-600 rounded-lg px-3 py-2 text-neutral-200 placeholder-neutral-700 outline-none transition-colors"
              />
            </div>
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
            <button
              type="submit"
              className="w-full py-2.5 text-[11px] font-black bg-white text-black hover:bg-neutral-200 rounded-xl transition-colors mt-2"
            >
              Send invite
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { users, updateRole, removeUser, addUser } = useTeam();
  const [showInvite, setShowInvite] = useState(false);

  const handleInvite = (name: string, email: string, role: TeamRole) => {
    addUser(name, email, role);
  };

  const statusBadge = (u: TeamUser) =>
    u.status === "invited"
      ? <span className="text-[8px] font-black text-amber-500 bg-amber-950/40 border border-amber-900/40 rounded px-1.5 py-0.5">Invited</span>
      : <span className="text-[8px] font-black text-emerald-500 bg-emerald-950/40 border border-emerald-900/40 rounded px-1.5 py-0.5">Active</span>;

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
              {users.length}
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
      <div className="rounded-xl border border-neutral-800/60 overflow-hidden">
        {users.map((u, i) => (
          <div
            key={u.id}
            className={`flex items-center gap-4 px-4 py-3.5 ${
              i < users.length - 1 ? "border-b border-neutral-800/40" : ""
            } hover:bg-neutral-900/30 transition-colors group`}
          >
            {/* Avatar */}
            <Avatar name={u.name} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black text-neutral-200">{u.name}</span>
                {statusBadge(u)}
              </div>
              <p className="text-[10px] text-neutral-600 font-mono mt-0.5 truncate">{u.email}</p>
            </div>

            {/* Role */}
            <RoleSelect
              value={u.role}
              onChange={role => updateRole(u.id, role)}
              disabled={u.role === "owner" && users.filter(x => x.role === "owner").length === 1}
            />

            {/* Remove */}
            <button
              onClick={() => {
                if (u.role === "owner" && users.filter(x => x.role === "owner").length === 1) return;
                if (confirm(`Remove ${u.name} from the team?`)) removeUser(u.id);
              }}
              className={`opacity-0 group-hover:opacity-100 transition-opacity text-neutral-700 hover:text-red-400 ${
                u.role === "owner" && users.filter(x => x.role === "owner").length === 1 ? "pointer-events-none" : ""
              }`}
              title="Remove member"
            >
              <Trash2 className="w-3.5 h-3.5" />
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

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvite={handleInvite}
        />
      )}
    </div>
  );
}

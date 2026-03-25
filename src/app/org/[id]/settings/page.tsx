"use client";
import { useEffect, useState, use } from "react";
import { fetchApi } from "@/lib/api";
import { Building, Users, CreditCard, Shield, UserPlus, Mail, Trash2 } from "lucide-react";

export default function OrgSettings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [org, setOrg] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrgData = async () => {
      try {
        const orgs = await fetchApi(`/orgs`);
        const found = orgs.find((o: any) => o.id === id);
        setOrg(found);
        
        const memberData = await fetchApi(`/orgs/${id}/members`);
        setMembers(memberData);
      } catch (err) {
        console.error("Failed to load org settings:", err);
      } finally {
        setLoading(false);
      }
    };

    loadOrgData();
  }, [id]);

  if (loading) return <div className="animate-pulse text-sm font-mono text-neutral-500 p-12">Loading organization context...</div>;

  return (
    <div className="space-y-12 max-w-4xl pb-24">
      <header>
        <h2 className="text-2xl font-bold text-white tracking-tight">Organization Settings</h2>
        <p className="text-sm text-neutral-500 mt-1">Manage your team and billing infrastructure.</p>
      </header>

      {/* GENERAL */}
      <section className="bg-[#111] border border-neutral-900 rounded-2xl p-8">
        <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-6 flex items-center gap-2">
          <Building className="w-4 h-4" />
          General
        </h3>
        <div className="space-y-6 max-w-md">
           <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Organization Name</label>
              <input 
                type="text" 
                value={org?.name || ""} 
                readOnly 
                className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-sm font-medium text-white shadow-inner outline-none focus:border-blue-500/50 transition-colors" 
              />
           </div>
           <div className="space-y-2 text-[11px] text-neutral-600 font-mono">
              <p>Organization ID: {id}</p>
           </div>
           <button className="text-xs font-bold text-blue-500 hover:text-blue-400 transition">Update organization details →</button>
        </div>
      </section>

      {/* TEAM */}
      <section className="bg-[#111] border border-neutral-900 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-8 pb-4 flex justify-between items-center">
           <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team Members
           </h3>
           <button className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest bg-white text-black px-3 py-1.5 rounded-md hover:bg-neutral-200 transition">
              <UserPlus className="w-4 h-4" />
              Invite Member
           </button>
        </div>
        <div className="mt-4">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-[#181818] border-y border-neutral-800 text-[10px] uppercase tracking-widest text-neutral-600 font-bold font-mono">
              <tr>
                <th className="px-8 py-3">Member</th>
                <th className="px-8 py-3">Role</th>
                <th className="px-8 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 font-mono">
               {members.map(m => (
                 <tr key={m.id} className="hover:bg-neutral-900/50 transition-colors group">
                    <td className="px-8 py-5 flex items-center gap-4">
                       <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center text-xs font-bold text-neutral-400 border border-neutral-700 shadow-sm">
                          {m.email[0].toUpperCase()}
                       </div>
                       <div className="flex flex-col">
                          <span className="text-neutral-200 font-medium">{m.email}</span>
                          <span className="text-[10px] text-neutral-600">{m.id}</span>
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <span className="px-2 py-0.5 rounded border border-neutral-800 text-[10px] font-bold uppercase text-neutral-400 bg-neutral-950">
                          {m.role}
                       </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <div className="flex items-center justify-end gap-4">
                          <span className="text-green-500 text-[11px] font-bold">Active</span>
                          <Trash2 className="w-4 h-4 text-neutral-800 group-hover:text-red-500 hover:!text-red-400 cursor-pointer transition-colors" />
                       </div>
                    </td>
                 </tr>
               ))}
            </tbody>
          </table>
          {members.length === 0 && !loading && (
            <div className="p-12 text-center text-neutral-700 italic text-sm font-mono">
              No additional members found.
            </div>
          )}
        </div>
      </section>

      {/* BILLING */}
      <section className="bg-[#111] border border-neutral-900 rounded-2xl p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rotate-45 translate-x-32 -translate-y-32 blur-3xl group-hover:bg-blue-600/10 transition-colors" />
        <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-8 flex items-center gap-2">
           <CreditCard className="w-4 h-4" />
           Billing & Usage
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
           <div className="space-y-6">
              <div className="p-6 bg-black border border-neutral-800 rounded-2xl space-y-4 shadow-inner">
                 <div className="flex justify-between items-center text-neutral-500 text-[10px] font-black uppercase tracking-widest">
                    <span>Plan Tier</span>
                    <span className="text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20 text-[9px]">Infinite Compute</span>
                 </div>
                 <div className="flex items-baseline gap-1.5 pt-2">
                    <span className="text-4xl font-black text-white tracking-tighter">$0</span>
                    <span className="text-neutral-500 text-sm font-medium tracking-tight">/mo pro-rata</span>
                 </div>
                 <p className="text-[11px] text-neutral-500 leading-relaxed">You are currently on the Early Access program with unlimited isolated execution time.</p>
                 <button className="w-full bg-white text-black font-black py-2.5 rounded-xl text-xs uppercase tracking-widest hover:bg-neutral-200 transition shadow-xl active:scale-95">Upgrade to Enterprise</button>
              </div>
           </div>
           <div className="space-y-6">
              <div className="space-y-4">
                 <div className="flex justify-between items-end border-b border-neutral-900 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600">Runtime Usage</span>
                    <span className="text-xs font-mono text-neutral-400">1,240 / 10,000 <span className="text-neutral-700">(12.4%)</span></span>
                 </div>
                 <div className="w-full h-2 bg-[#050505] rounded-full overflow-hidden border border-neutral-900">
                    <div className="h-full bg-blue-600 w-[12.4%] shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all duration-1000" />
                 </div>
                 <div className="flex justify-between items-center mt-2">
                    <p className="text-[10px] text-neutral-600 font-mono italic">Billing cycle ends in 12 days.</p>
                    <button className="text-[10px] font-bold text-neutral-500 hover:text-white transition underline decoration-neutral-800 underline-offset-4">View detailed metrics →</button>
                 </div>
              </div>
           </div>
        </div>
      </section>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Users, Mail, UserPlus, Shield, CreditCard, Building } from "lucide-react";

export default function OrgSettings({ params }: { params: { id: string } }) {
  const [members, setMembers] = useState<any[]>([]);
  const [org, setOrg] = useState<any>(null);

  useEffect(() => {
    fetchApi(`/orgs`).then(data => {
      const found = data.find((o: any) => o.id === params.id);
      setOrg(found);
    });
    fetchApi(`/orgs/${params.id}/members`).then(setMembers).catch(console.error);
  }, [params.id]);

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
              <input type="text" value={org?.name || ""} readOnly className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-sm font-medium text-white shadow-inner" />
           </div>
           <button className="text-xs font-bold text-blue-500 hover:text-blue-400 transition">Update name →</button>
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
                 <tr key={m.id} className="hover:bg-neutral-900/50 transition-colors">
                    <td className="px-8 py-5 flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-400 border border-neutral-700">
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
                       <span className="text-green-500 text-[11px] font-bold">Active</span>
                    </td>
                 </tr>
               ))}
            </tbody>
          </table>
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
              <div className="p-5 bg-neutral-950 border border-neutral-800 rounded-xl space-y-4 shadow-inner">
                 <div className="flex justify-between items-center text-neutral-500 text-xs font-bold uppercase tracking-widest">
                    <span>Current Plan</span>
                    <span className="text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Developer</span>
                 </div>
                 <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white tracking-tighter">$0</span>
                    <span className="text-neutral-500 font-medium tracking-tight">/mo pro-rata</span>
                 </div>
                 <button className="w-full bg-white text-black font-bold py-2 rounded-lg text-sm hover:bg-neutral-200 transition shadow-lg">Upgrade to Production</button>
              </div>
           </div>
           <div className="space-y-6">
              <div className="space-y-2">
                 <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-neutral-600">
                    <span>Execution Usage</span>
                    <span>1,240 / 10,000</span>
                 </div>
                 <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                    <div className="h-full bg-blue-600 w-[12.4%] shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
                 </div>
                 <p className="text-[11px] text-neutral-500 italic mt-2">Resets in 12 days.</p>
              </div>
           </div>
        </div>
      </section>
    </div>
  );
}

"use client";
import { useEffect, useState, use } from "react";
import { useFluxApi } from "@/lib/api";
import { Building, Users, CreditCard, Shield, UserPlus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function OrgSettings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [org, setOrg] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const api = useFluxApi();

  useEffect(() => {
    const loadOrgData = async () => {
      try {
        const orgs = await api.getOrgs();
        const found = orgs.find((o: any) => o.id === id);
        setOrg(found);
        
        const memberData = await api.getOrgMembers(id);
        setMembers(memberData);
      } catch (err) {
        console.error("Failed to load org settings:", err);
      } finally {
        setLoading(false);
      }
    };

    loadOrgData();
  }, [id, api]);

  if (loading) return <div className="animate-pulse text-sm font-mono text-neutral-500 p-12 text-center mt-20">Loading organization context...</div>;

  return (
    <div className="space-y-10 max-w-4xl pb-24 mx-auto">
      <header>
        <h2 className="text-2xl font-bold text-white tracking-tight">Organization Settings</h2>
        <p className="text-sm text-neutral-500 mt-1">Manage your team and billing infrastructure.</p>
      </header>

      {/* GENERAL */}
      <Card className="bg-[#111] border-neutral-900 shadow-xl">
        <CardHeader className="border-b border-neutral-900/50 pb-6">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2">
            <Building className="w-4 h-4" />
            General
          </CardTitle>
          <CardDescription className="text-xs text-neutral-600 font-medium italic">
            Core identity and identification.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8 space-y-6 max-w-md">
           <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-neutral-600 tracking-wider">Organization Name</Label>
              <Input 
                type="text" 
                value={org?.name || ""} 
                readOnly 
                className="bg-black border-neutral-800 text-sm font-bold text-white h-11" 
              />
           </div>
           <div className="text-[10px] text-neutral-600 font-mono bg-black/50 p-2 rounded border border-neutral-900 inline-block">
              ID: {id}
           </div>
           <div>
              <Button variant="link" className="text-blue-500 hover:text-blue-400 font-bold text-xs p-0 h-auto">
                Update organization details →
              </Button>
           </div>
        </CardContent>
      </Card>

      {/* TEAM */}
      <Card className="bg-[#111] border-neutral-900 shadow-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-900/50 pb-6">
           <div className="space-y-1.5">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                 <Users className="w-4 h-4" />
                 Team Members
              </CardTitle>
              <CardDescription className="text-xs text-neutral-600 font-medium italic">Collaborate across environments.</CardDescription>
           </div>
           <Button variant="outline" size="sm" className="bg-white text-black hover:bg-neutral-200 font-bold h-9">
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Member
           </Button>
        </CardHeader>
        <Table>
          <TableHeader className="bg-black/40 hover:bg-black/40">
            <TableRow className="border-neutral-900 hover:bg-transparent">
              <TableHead className="px-8 font-mono text-[10px] uppercase tracking-widest text-neutral-500">Member</TableHead>
              <TableHead className="px-8 font-mono text-[10px] uppercase tracking-widest text-neutral-500">Role</TableHead>
              <TableHead className="px-8 text-right font-mono text-[10px] uppercase tracking-widest text-neutral-500">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {members.map(m => (
               <TableRow key={m.id} className="border-neutral-900 hover:bg-neutral-900/30 transition-colors group">
                  <TableCell className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-950 flex items-center justify-center text-xs font-bold text-neutral-500 border border-neutral-800 shadow-inner">
                         {m.email[0].toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                         <span className="text-neutral-200 font-bold text-sm tracking-tight">{m.email}</span>
                         <span className="text-[10px] text-neutral-600 font-mono mt-0.5">{m.id.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-8">
                     <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-tighter text-neutral-500 border-neutral-800 bg-neutral-950">
                        {m.role}
                     </Badge>
                  </TableCell>
                  <TableCell className="px-8 text-right">
                     <div className="flex items-center justify-end gap-5">
                        <Badge variant="success" className="bg-transparent border-none p-0 text-[10px] font-bold uppercase">Active</Badge>
                        <Trash2 className="w-4 h-4 text-neutral-800 group-hover:text-red-500 cursor-pointer transition-colors" />
                     </div>
                  </TableCell>
               </TableRow>
             ))}
          </TableBody>
        </Table>
        {members.length === 0 && (
          <div className="p-16 text-center text-neutral-700 font-mono text-xs italic">
            No active members found in this orbit.
          </div>
        )}
      </Card>

      {/* BILLING */}
      <Card className="bg-[#111] border-neutral-900 shadow-xl overflow-hidden group">
        <CardHeader className="border-b border-neutral-900/50 pb-6 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full" />
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2">
             <CreditCard className="w-4 h-4" />
             Billing & Usage
          </CardTitle>
          <CardDescription className="text-xs text-neutral-600 font-medium italic">Infinite compute limits & credits.</CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
             <div className="space-y-6">
                <div className="p-6 bg-black border border-neutral-800 rounded-xl space-y-4 shadow-inner relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-3">
                      <Badge variant="outline" className="text-blue-500 bg-blue-500/10 border-blue-500/20 text-[9px] font-black uppercase">Early Access</Badge>
                   </div>
                   <div className="flex items-baseline gap-1.5 pt-2">
                      <span className="text-5xl font-black text-white tracking-tighter">$0</span>
                      <span className="text-neutral-600 text-xs font-bold uppercase tracking-widest">/ month</span>
                   </div>
                   <p className="text-[11px] text-neutral-500 leading-relaxed font-medium italic">You are currently participating in the Flux Pilot program with unlimited compute time.</p>
                   <Button className="w-full bg-white text-black font-black py-5 rounded-lg text-xs uppercase tracking-widest hover:bg-neutral-200 transition-all shadow-xl active:scale-95">Upgrade to Enterprise</Button>
                </div>
             </div>
             <div className="space-y-6 py-2">
                <div className="space-y-4">
                   <div className="flex justify-between items-end border-b border-neutral-900 pb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">Free Tier Usage</span>
                      <span className="text-[11px] font-mono text-neutral-400 font-bold">1,240 / 10,000 <span className="text-blue-500/60">(12.4%)</span></span>
                   </div>
                   <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-900">
                      <div className="h-full bg-blue-600 w-[12.4%] shadow-[0_0_10px_rgba(37,99,235,0.3)] transition-all duration-1000" />
                   </div>
                   <div className="flex justify-between items-center mt-3 pt-2">
                      <p className="text-[10px] text-neutral-700 font-mono">Billing cycle resets in 12 days.</p>
                      <Button variant="link" className="text-[10px] font-bold text-neutral-500 hover:text-white p-0 h-auto">View usage metrics →</Button>
                   </div>
                </div>
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

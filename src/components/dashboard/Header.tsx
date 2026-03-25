"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Bell, Search, User, ChevronDown, Rocket, LayoutDashboard, Settings as SettingsIcon, LogOut, Plus } from "lucide-react";
import Link from "next/link";
import { FluxLogo } from "@/components/FluxLogo";
import { usePathname, useRouter } from "next/navigation";

export function Header() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [currentOrg, setCurrentOrg] = useState<any>(null);
  const [isOrgOpen, setIsOrgOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetchApi("/orgs").then(data => {
      setOrgs(data);
      const stored = localStorage.getItem("current_org_id");
      const found = data.find((o: any) => o.id === stored) || data[0];
      if (found) {
        setCurrentOrg(found);
        localStorage.setItem("current_org_id", found.id);
      }
    }).catch(console.error);
  }, []);

  const switchOrg = (org: any) => {
    setCurrentOrg(org);
    localStorage.setItem("current_org_id", org.id);
    setIsOrgOpen(false);
    router.push("/dashboard");
    setTimeout(() => window.location.reload(), 100);
  };

  return (
    <header className="h-16 border-b border-neutral-900 bg-black flex items-center justify-between px-6 sticky top-0 z-40 backdrop-blur-md bg-black/80">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="p-1 bg-white rounded-md group-hover:bg-blue-500 transition-colors">
            <FluxLogo className="w-5 h-5 text-black" />
          </div>
          <span className="font-mono font-black text-xl tracking-tighter text-white">flux</span>
        </Link>
        <div className="h-4 w-[1px] bg-neutral-800" />
        
        {/* ORG SWITCHER */}
        <div className="relative">
          <button 
            onClick={() => setIsOrgOpen(!isOrgOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-neutral-900 rounded-lg transition text-sm font-bold text-neutral-200 border border-transparent hover:border-neutral-800"
          >
            <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center text-[10px] font-black shadow-lg shadow-blue-500/20">
              {currentOrg?.name?.[0] || "F"}
            </div>
            <span className="truncate max-w-[140px] uppercase tracking-tight">{currentOrg?.name || "Loading..."}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-neutral-600 transition-transform ${isOrgOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOrgOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsOrgOpen(false)} />
              <div className="absolute top-full left-0 mt-2 w-64 bg-[#0F0F0F] border border-neutral-800 rounded-xl shadow-2xl z-20 overflow-hidden py-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-neutral-600 font-black">Context</div>
                {orgs.map(org => (
                  <button 
                    key={org.id}
                    onClick={() => switchOrg(org)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-neutral-800/50 transition group"
                  >
                    <span className={`font-medium ${org.id === currentOrg?.id ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-200'}`}>{org.name}</span>
                    {org.id === currentOrg?.id && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.6)]" />}
                  </button>
                ))}
                <div className="border-t border-neutral-900 my-2" />
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-neutral-800/50 transition text-neutral-500 hover:text-white">
                  <Plus className="w-4 h-4 text-neutral-700" />
                  Create Orbit
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="hidden lg:flex items-center gap-3 px-3.5 py-1.5 bg-neutral-950 border border-neutral-900 rounded-lg text-neutral-600 text-[11px] font-bold w-72 group focus-within:border-neutral-700 transition-all shadow-inner">
          <Search className="w-3.5 h-3.5 group-focus-within:text-blue-500 transition-colors" />
          <span className="tracking-tight">Scan environments...</span>
          <span className="ml-auto opacity-30 font-mono tracking-tighter">⌘K</span>
        </div>
        
        <div className="h-4 w-[1px] bg-neutral-900 mx-1" />

        <button className="p-2 text-neutral-500 hover:text-white transition-all relative group">
          <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-red-600 rounded-full border border-black" />
        </button>

        {/* USER MENU */}
        <div className="relative">
          <button 
            onClick={() => setIsUserOpen(!isUserOpen)}
            className="w-8 h-8 rounded-full bg-gradient-to-b from-neutral-800 to-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-500 hover:border-neutral-600 hover:text-white transition-all overflow-hidden shadow-lg shadow-black/40"
          >
            <User className="w-4 h-4" />
          </button>

          {isUserOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsUserOpen(false)} />
              <div className="absolute top-full right-0 mt-2 w-56 bg-[#0F0F0F] border border-neutral-800 rounded-xl shadow-2xl z-20 overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="px-4 py-3 border-b border-neutral-900">
                   <p className="text-xs font-bold text-white truncate">dev@fluxbase.co</p>
                   <p className="text-[10px] text-neutral-600 font-mono mt-0.5">Admin Role</p>
                </div>
                <div className="py-1">
                  <Link href={`/org/${currentOrg?.id}/settings`} className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-neutral-400 hover:bg-neutral-800/50 hover:text-white transition group" onClick={() => setIsUserOpen(false)}>
                    <SettingsIcon className="w-4 h-4 text-neutral-700 group-hover:text-blue-500" />
                    Orbit Settings
                  </Link>
                  <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-neutral-400 hover:bg-neutral-800/50 hover:text-white transition group" onClick={() => setIsUserOpen(false)}>
                    <LayoutDashboard className="w-4 h-4 text-neutral-700 group-hover:text-blue-500" />
                    Console
                  </Link>
                </div>
                <div className="border-t border-neutral-900" />
                <button className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-900/60 hover:text-red-500 hover:bg-red-500/5 transition group">
                  <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  Log Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

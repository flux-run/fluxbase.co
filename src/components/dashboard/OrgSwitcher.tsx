"use client";
import { useEffect, useState } from "react";
import { useFluxApi } from "@/lib/api";
import { ChevronDown, Plus, Building } from "lucide-react";
import { useSession } from "next-auth/react";

export function OrgSwitcher() {
  const { data: session, status } = useSession();
  const api = useFluxApi();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [currentOrg, setCurrentOrg] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") return;
    api.getOrgs().then(data => {
      setOrgs(data);
      if (data && data.length > 0) {
        const stored = localStorage.getItem("current_org_id") || session?.org_id;
        const found = data.find((o: any) => o.id === stored) || data[0];
        if (found && found.id) {
          setCurrentOrg(found);
          localStorage.setItem("current_org_id", found.id);
        }
      }
      setLoading(false);
    }).catch(err => {
      console.error("OrgSwitcher fetch failed:", err);
      setLoading(false);
    });
  }, [session, status]);

  const switchOrg = (org: any) => {
    setCurrentOrg(org);
    if (org.id) localStorage.setItem("current_org_id", org.id);
    setIsOpen(false);
    window.location.reload(); // Context refresh
  };

  const displayName = loading ? "Loading..." : (currentOrg?.name || (orgs.length > 0 ? orgs[0].name : "Personal"));

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-900 rounded-md transition text-sm font-medium border border-transparent hover:border-neutral-800"
      >
        <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
          {displayName[0] || "F"}
        </div>
        <span className="truncate max-w-[140px] text-neutral-200">{displayName}</span>
        <ChevronDown className="w-3.5 h-3.5 text-neutral-600" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-64 bg-[#111] border border-neutral-800 rounded-lg shadow-2xl z-20 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Organizations</div>
            {orgs.map(org => (
              <button 
                key={org.id}
                onClick={() => switchOrg(org)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs transition-colors hover:bg-neutral-800 ${org.id === currentOrg?.id ? 'text-white font-bold' : 'text-neutral-400'}`}
              >
                <div className="flex items-center gap-3">
                   <div className="w-4 h-4 rounded-sm bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[8px]">
                      {org.name[0]}
                   </div>
                   <span>{org.name}</span>
                </div>
                {org.id === currentOrg?.id && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
              </button>
            ))}
            <div className="border-t border-neutral-800 my-1.5" />
            <button className="w-full flex items-center gap-3 px-3 py-2.5 text-xs hover:bg-neutral-800 transition text-neutral-500 hover:text-white font-medium">
              <Plus className="w-4 h-4" />
              Create Organization
            </button>
          </div>
        </>
      )}
    </div>
  );
}

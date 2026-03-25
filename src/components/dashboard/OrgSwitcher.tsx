"use client";
import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { ChevronDown, Plus, Building, Settings, LogOut } from "lucide-react";

export function OrgSwitcher() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [currentOrg, setCurrentOrg] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);

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
    setIsOpen(false);
    window.location.reload(); // Context refresh
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-900 rounded-md transition text-sm font-medium border border-transparent hover:border-neutral-800"
      >
        <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-[10px] font-bold">
          {currentOrg?.name?.[0] || "F"}
        </div>
        <span className="truncate max-w-[120px]">{currentOrg?.name || "Loading..."}</span>
        <ChevronDown className="w-4 h-4 text-neutral-500" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-56 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-20 overflow-hidden py-1 animate-in fade-in zoom-in duration-100">
            <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Organizations</div>
            {orgs.map(org => (
              <button 
                key={org.id}
                onClick={() => switchOrg(org)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-neutral-800 transition"
              >
                <span>{org.name}</span>
                {org.id === currentOrg?.id && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
              </button>
            ))}
            <div className="border-t border-neutral-800 my-1" />
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-800 transition text-neutral-400">
              <Plus className="w-4 h-4" />
              Create Organization
            </button>
          </div>
        </>
      )}
    </div>
  );
}

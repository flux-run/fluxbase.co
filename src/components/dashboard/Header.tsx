"use client";
import Link from "next/link";
import { Search, Bell, User } from "lucide-react";
import { FluxLogo } from "@/components/FluxLogo";
import { OrgSwitcher } from "./OrgSwitcher";
import { UserNav } from "./UserNav";

export function Header() {
  return (
    <header className="h-16 border-b border-neutral-900 bg-black flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center text-white hover:opacity-80 transition-opacity">
          <span className="font-mono font-black text-xl tracking-tighter">flux</span>
        </Link>
        <div className="h-4 w-[1px] bg-neutral-800" />
        <OrgSwitcher />
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-md text-neutral-500 text-xs w-64">
          <Search className="w-3.5 h-3.5" />
          <span>Search...</span>
          <span className="ml-auto opacity-50 font-mono">⌘K</span>
        </div>
        <button className="p-2 text-neutral-500 hover:text-white transition">
          <Bell className="w-5 h-5" />
        </button>
        <UserNav />
      </div>
    </header>
  );
}

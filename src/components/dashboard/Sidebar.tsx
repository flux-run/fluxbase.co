"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Zap, Activity, Repeat, Settings, Globe, AlertTriangle } from "lucide-react";

export function Sidebar({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  const nav = [
    { name: "Overview", href: `/project/${projectId}`, icon: LayoutDashboard },
    { name: "Incidents", href: `/project/${projectId}/incidents`, icon: AlertTriangle },
    { name: "Functions", href: `/project/${projectId}/functions`, icon: Zap },
    { name: "Executions", href: `/project/${projectId}/executions`, icon: Activity },
    { name: "Routes", href: `/project/${projectId}/routes`, icon: Globe },
    { name: "Settings", href: `/project/${projectId}/settings`, icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-neutral-900 bg-black flex flex-col pt-6 fixed h-[calc(100vh-64px)] overflow-y-auto">
      <nav className="flex-1 px-3 space-y-1">
        {nav.map((item) => {
          const isActive = pathname === item.href || (item.href !== `/project/${projectId}` && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-neutral-900 text-white shadow-sm border border-neutral-800" 
                  : "text-neutral-500 hover:text-neutral-200 hover:bg-neutral-950"
              }`}
            >
              <item.icon className={`w-4 h-4 ${isActive ? "text-blue-500" : ""}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

"use client";
import { useEffect, useState, use } from "react";
import dynamic from "next/dynamic";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { fetchApi } from "@/lib/api";

const Header = dynamic(() => import("@/components/dashboard/Header").then(m => m.Header), { ssr: false });

export default function ProjectLayout({ children, params }: { children: React.ReactNode, params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    // We can fetch project metadata if needed, but for now we trust the ID
    // Later we can add a check to ensure project exists in current org
  }, [id]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-neutral-300 font-sans flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar projectId={id} />
        <main className="flex-1 ml-64 p-8 min-w-0 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

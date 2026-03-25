"use client";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { fetchApi } from "@/lib/api";

export default function ProjectLayout({ children, params }: { children: React.ReactNode, params: { id: string } }) {
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    // We can fetch project metadata if needed, but for now we trust the ID
    // Later we can add a check to ensure project exists in current org
  }, [params.id]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-neutral-300 font-sans flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar projectId={params.id} />
        <main className="flex-1 ml-64 p-8 min-w-0 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";

export default function Dashboard() {
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    fetchApi("/projects").then(setProjects).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-8 font-sans">
      <header className="mb-12 flex items-center justify-between mx-auto max-w-5xl border-b border-neutral-800 pb-4">
        <h1 className="text-xl font-bold font-mono tracking-tight text-neutral-200">
          <span className="text-neutral-500">flux /</span> projects
        </h1>
        <button className="text-sm bg-neutral-100 text-black px-4 py-2 rounded-md font-medium hover:bg-neutral-300 transition">
          New Project
        </button>
      </header>

      <main className="max-w-5xl mx-auto">
        <div className="grid gap-3">
          {projects.map(p => (
            <Link key={p.id} href={`/project/${p.id}/executions`} className="group flex items-center justify-between border border-neutral-800 p-6 rounded-lg bg-[#111] hover:border-neutral-600 transition">
              <div>
                <h3 className="text-base font-medium text-neutral-100 group-hover:text-white transition">{p.name}</h3>
                <p className="text-sm text-neutral-500 mt-1 font-mono">id: {p.id}</p>
              </div>
              <div className="text-sm text-neutral-500 group-hover:text-white transition">
                Open →
              </div>
            </Link>
          ))}
          {projects.length === 0 && <div className="text-neutral-500 text-sm py-4 italic">No projects found. Use seed data.</div>}
        </div>
      </main>
    </div>
  );
}

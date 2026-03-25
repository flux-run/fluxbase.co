import Link from "next/link";

export default function ProjectLayout({ children, params }: { children: React.ReactNode, params: { id: string } }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-neutral-300 font-sans flex flex-col">
      <header className="border-b border-neutral-900 bg-black px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="font-mono text-lg font-bold hover:text-white transition">flux</Link>
        <div className="text-sm font-mono text-neutral-500">Project: {params.id}</div>
      </header>
      <div className="flex flex-1 max-w-6xl mx-auto w-full mt-8 gap-12 px-6 pb-16">
        <aside className="w-56 flex flex-col gap-1.5 font-medium text-sm">
          <Link href={`/project/${params.id}/executions`} className="px-3 py-2 rounded hover:bg-neutral-900 hover:text-white transition text-neutral-400">Executions</Link>
          <Link href={`/project/${params.id}/routes`} className="px-3 py-2 rounded hover:bg-neutral-900 hover:text-white transition text-neutral-400">Routes</Link>
          <Link href={`/project/${params.id}/settings`} className="px-3 py-2 rounded hover:bg-neutral-900 hover:text-white transition text-neutral-400">Settings</Link>
        </aside>
        <main className="flex-1 w-full min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";

export default async function ProjectLayout({ children, params }: { children: React.ReactNode, params: Promise<{ id: string }> }) {
  const { id } = await params;

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

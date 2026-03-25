"use client";
import { use } from "react";
import { Header } from "@/components/dashboard/Header";

export default function OrgLayout({ children, params }: { children: React.ReactNode, params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-neutral-300 font-sans flex flex-col">
      <Header />
      <main className="max-w-4xl mx-auto w-full p-12">
        {children}
      </main>
    </div>
  );
}

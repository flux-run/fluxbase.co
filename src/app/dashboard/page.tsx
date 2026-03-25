"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useFluxApi } from "@/lib/api";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const api = useFluxApi();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = "/login";
      return;
    }

    const redirect = async () => {
      const token = session?.flux_token || localStorage.getItem("flux_token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      try {
        // /projects is scoped to the user's org via JWT
        const projects = await api.getProjects();
        const project = Array.isArray(projects) && projects.length > 0 ? projects[0] : null;
        if (project) {
          router.replace(`/project/${project.id}`);
        }
        // If no project exists, stay here — edge case for broken accounts
      } catch (err) {
        console.error("Dashboard redirect failed:", err);
      }
    };

    redirect();
  }, [session, status, api]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-neutral-800 border-t-white rounded-full animate-spin" />
        <p className="text-neutral-600 text-xs font-mono uppercase tracking-widest">Loading...</p>
      </div>
    </div>
  );
}

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
    console.log(`[Dashboard] Status: ${status}, Has Token: ${!!session?.flux_token}`);
    
    if (status === "loading") return;
    
    if (status === "unauthenticated") {
      console.warn("[Dashboard] Unauthenticated, redirecting to login");
      window.location.href = "/login";
      return;
    }

    const redirect = async () => {
      const token = session?.flux_token || localStorage.getItem("flux_token");
      
      if (session?.flux_token) {
        localStorage.setItem("flux_token", session.flux_token);
      }

      if (!token) {
        console.error("[Dashboard] Authenticated but NO token found. Retrying in 2s...");
        setTimeout(() => {
          if (!session?.flux_token) window.location.href = "/login";
        }, 2000);
        return;
      }

      try {
        console.log("[Dashboard] Token found, fetching projects...");
        // /projects is scoped to the user's org via JWT
        const projects = await api.getProjects();
        const project = Array.isArray(projects) && projects.length > 0 ? projects[0] : null;
        
        if (project) {
          console.log(`[Dashboard] Redirecting to project ${project.id}`);
          router.replace(`/project/${project.id}`);
        } else {
          console.log("[Dashboard] No projects found, staying on dashboard");
        }
        // If no project exists, stay here — edge case for broken accounts
      } catch (err) {
        console.error("Dashboard redirect failed:", err);
      }
    };

    redirect();
  }, [session, status, api, router]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-neutral-800 border-t-white rounded-full animate-spin" />
        <p className="text-neutral-600 text-xs font-mono uppercase tracking-widest">Loading...</p>
        <p className="text-neutral-800 text-[10px] font-mono mt-8">v1.1-DEBUG</p>
      </div>
    </div>
  );
}

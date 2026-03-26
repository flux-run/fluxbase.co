"use client";
import { useEffect, useState } from "react";
import { useFluxApi } from "@/lib/api";
import { Project } from "@/types/api";
import { ChevronDown, Plus, Box } from "lucide-react";
import { useRouter, useParams } from "next/navigation";

export function ProjectSwitcher() {
  const api = useFluxApi();
  const router = useRouter();
  const params = useParams();
  const currentProjectId = params.id as string;

  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api.ready) return;
    api.getProjects().then(data => {
      setProjects(data);
      const found = data.find((p: Project) => p.id === currentProjectId);
      if (found) {
        setCurrentProject(found);
      }
      setLoading(false);
    }).catch(err => {
      console.error("ProjectSwitcher fetch failed:", err);
      setLoading(false);
    });
  }, [api.ready, currentProjectId]);

  const switchProject = (project: Project) => {
    setCurrentProject(project);
    localStorage.setItem("flux_last_project", project.id!);
    setIsOpen(false);
    router.push(`/project/${project.id!}`);
  };

  if (!currentProjectId && !isOpen) return null;

  const displayName = loading ? "Loading..." : (currentProject?.name || "Select Project");

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-900 rounded-md transition text-sm font-medium border border-transparent hover:border-neutral-800"
      >
        <div className="w-5 h-5 bg-neutral-800 border border-neutral-700 rounded flex items-center justify-center text-[10px] font-bold text-neutral-400">
          <Box className="w-3 h-3" />
        </div>
        <span className="truncate max-w-[140px] text-neutral-400 font-mono tracking-tight">{displayName}</span>
        <ChevronDown className="w-3.5 h-3.5 text-neutral-600" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-64 bg-[#111] border border-neutral-800 rounded-lg shadow-2xl z-20 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Projects</div>
            {projects.map(project => (
              <button 
                key={project.id}
                onClick={() => switchProject(project)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs transition-colors hover:bg-neutral-800 ${project.id === currentProject?.id ? 'text-white font-bold' : 'text-neutral-400'}`}
              >
                <div className="flex items-center gap-3">
                   <div className="w-4 h-4 rounded-sm bg-neutral-900 border border-neutral-800 flex items-center justify-center text-[8px]">
                      {project.name[0]}
                   </div>
                   <span className="truncate max-w-[160px]">{project.name}</span>
                </div>
                {project.id === currentProject?.id && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
              </button>
            ))}
            <div className="border-t border-neutral-800 my-1.5" />
            <button 
              onClick={() => router.push("/dashboard?select=true")}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-xs hover:bg-neutral-800 transition text-neutral-500 hover:text-white font-medium"
            >
              <Plus className="w-4 h-4" />
              View All Projects
            </button>
          </div>
        </>
      )}
    </div>
  );
}

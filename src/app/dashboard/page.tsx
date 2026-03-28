"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useFluxApi } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Plus, ArrowRight, Box, Clock, Activity, Mail } from "lucide-react";
import { Project, Org } from "@/types/api";
import { CreateDialog } from "@/components/dashboard/CreateDialog";

type PendingInvite = {
  id: string;
  token: string;
  email: string;
  role: string;
  org_id: string;
  org_name: string;
  org_slug: string;
  expires_at: string;
  created_at: string;
};

function DashboardContent() {
  const { session, status } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const api = useFluxApi();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = "/login";
      return;
    }

    const init = async () => {
      try {
        const [orgsData, projectsData, invitesData] = await Promise.all([
          api.getOrgs(),
          api.getProjects(),
          api.getMyInvitations().catch(() => ({ invitations: [] }))
        ]);
        
        setOrgs(orgsData);
        setProjects(projectsData);
        setPendingInvites(invitesData.invitations || []);

        // Check for manual "Back to Dashboard" intent
        const lastProjectId = localStorage.getItem("flux_last_project");
        const isManualSelect = searchParams.get("select") === "true";
        
        // If we have a last project and it still exists, auto-redirect (unless ?select=true)
        if (!isManualSelect && lastProjectId && projectsData.some(p => p.id === lastProjectId)) {
          setRedirecting(true);
          router.replace(`/project/${lastProjectId}`);
          return;
        }

        setLoading(false);
      } catch (err) {
        console.error("Dashboard init failed:", err);
        setLoading(false);
      }
    };

    if (api.ready) init();
  }, [session, status, api, router, searchParams]);

  const handleOpenCreate = (orgId: string) => {
    setActiveOrgId(orgId);
    setIsCreateOpen(true);
  };

  const handleConfirmCreate = async (name: string) => {
    if (!activeOrgId) return;

    const newProject = await api.createProject(name, activeOrgId);
    if (newProject.id) {
      localStorage.setItem("flux_last_project", newProject.id);
      router.push(`/project/${newProject.id}`);
    }
  };

  const handleSelectProject = (id: string) => {
    localStorage.setItem("flux_last_project", id);
    router.push(`/project/${id}`);
  };

  if (loading || redirecting) {
    return <DashboardLoading redirecting={redirecting} />;
  }

  return (
    <>
      <div className="min-h-screen bg-[#0A0A0A] selection:bg-blue-500/30">
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(30,60,120,0.08)_0%,_transparent_50%)] pointer-events-none" />
        
        <main className="max-w-6xl mx-auto px-8 pt-24 pb-32 relative z-10">
          <header className="mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-blue-500 mb-1">
                 <LayoutDashboard className="w-4 h-4" />
                 <span className="text-[10px] font-black uppercase tracking-[0.4em]">Dashboard</span>
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-white">Your Workspace</h1>
              <p className="text-neutral-500 text-sm font-medium">Manage your organizations and their environments.</p>
            </div>
          </header>

          <div className="space-y-20">
            {pendingInvites.length > 0 && (
              <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.05]">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Pending Invitations</h2>
                  </div>
                  <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">{pendingInvites.length} waiting</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pendingInvites.map((invite) => (
                    <Card
                      key={invite.id}
                      className="bg-[#0D0D0D] border-amber-500/20 relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-black text-white">{invite.org_name}</CardTitle>
                        <div className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">Role: {invite.role}</div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-[11px] text-neutral-400">Invite expires {new Date(invite.expires_at).toLocaleDateString()}.</p>
                        <Button
                          onClick={() => router.push(`/invite/accept?token=${encodeURIComponent(invite.token)}`)}
                          className="w-full h-10 bg-white text-black hover:bg-neutral-200 font-black text-[11px] uppercase tracking-widest"
                        >
                          Review Invite
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {orgs.map((org, orgIdx) => {
              const orgProjects = projects.filter(p => p.org_id === org.id);
              
              return (
                <section key={org.id} className="animate-in fade-in slide-in-from-bottom-8 duration-1000" style={{ animationDelay: `${orgIdx * 150}ms` }}>
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.05]">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                        {org.name[0]}
                      </div>
                      <h2 className="text-xl font-bold tracking-tight text-white uppercase tracking-widest">{org.name}</h2>
                    </div>
                    <Button 
                      onClick={() => handleOpenCreate(org.id!)}
                      variant="ghost"
                      className="text-[10px] uppercase font-black tracking-widest text-neutral-400 hover:text-white hover:bg-white/5 gap-2"
                    >
                      <Plus className="w-3 h-3" />
                      New Project
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {orgProjects.map((project, idx) => (
                      <Card 
                        key={project.id!}
                        onClick={() => handleSelectProject(project.id!)}
                        className="group bg-[#0D0D0D] border-white/[0.08] hover:border-blue-500/40 transition-all duration-500 cursor-pointer relative overflow-hidden flex flex-col pt-2"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        <CardHeader className="pb-4">
                          <div className="w-10 h-10 bg-neutral-900 border border-white/[0.05] rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-500/10 group-hover:border-blue-500/20 transition-colors">
                             <Box className="w-5 h-5 text-neutral-500 group-hover:text-blue-500 transition-colors" />
                          </div>
                          <CardTitle className="text-lg font-bold tracking-tight text-white group-hover:text-blue-400 transition-colors">
                            {project.name}
                          </CardTitle>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono uppercase tracking-widest mt-1">
                            ID: {project.id!.slice(0, 8)}...
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-6 flex-1 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-[11px] font-medium text-neutral-400">
                              <div className="flex items-center gap-2">
                                <Activity className="w-3 h-3 text-green-500/50" />
                                <span>Online</span>
                              </div>
                              <div className="flex items-center gap-2">
                                 <Clock className="w-3 h-3 text-neutral-600" />
                                 <span>{project.created_at ? new Date(project.created_at).toLocaleDateString() : "Just now"}</span>
                              </div>
                            </div>
                            <div className="w-full h-[2px] bg-neutral-900 rounded-full overflow-hidden">
                              <div className="h-full w-[40%] bg-blue-500/40 group-hover:w-full transition-all duration-1000 ease-out" />
                            </div>
                          </div>

                          <div className="flex items-center text-blue-500 text-[10px] font-black uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1 duration-500 pt-4">
                            Open Workspace
                            <ArrowRight className="w-3 h-3 ml-2" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {orgProjects.length === 0 && (
                       <div className="col-span-full py-16 border border-dashed border-white/[0.05] rounded-xl flex flex-col items-center justify-center text-center space-y-4 bg-neutral-900/5">
                          <Box className="w-10 h-10 text-neutral-800" />
                          <div className="space-y-1">
                             <p className="text-white text-xs font-bold tracking-tight opacity-50">No projects in this organization</p>
                          </div>
                       </div>
                    )}
                  </div>
                </section>
              );
            })}

            {orgs.length === 0 && (
               <div className="col-span-full py-24 border border-dashed border-white/[0.05] rounded-xl flex flex-col items-center justify-center text-center space-y-4 bg-neutral-900/10">
                  <Box className="w-12 h-12 text-neutral-800" />
                  <div className="space-y-1">
                     <p className="text-white font-bold tracking-tight">No organizations found</p>
                     <p className="text-neutral-600 text-xs italic">Switch or create an organization to get started.</p>
                  </div>
               </div>
            )}
          </div>
        </main>

        <footer className="fixed bottom-8 left-0 right-0 text-center pointer-events-none z-10 opacity-30">
           <span className="text-[10px] font-black uppercase tracking-[0.5em] text-neutral-700">Flux Control Plane</span>
        </footer>
      </div>

      <CreateDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onConfirm={handleConfirmCreate}
        title="New Project"
        description="Projects contain your functions, routes, and environment settings."
        placeholder="My Awesome App"
        label="Project Name"
      />
    </>
  );
}

function DashboardLoading({ redirecting = false }: { redirecting?: boolean }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-neutral-800 border-t-white rounded-full animate-spin" />
        <p className="text-neutral-600 text-[10px] font-mono uppercase tracking-[0.3em]">
          {redirecting ? "Redirecting to last project..." : "Loading Workspace..."}
        </p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}

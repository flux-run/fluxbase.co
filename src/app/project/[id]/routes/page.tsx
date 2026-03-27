"use client";
import { useEffect, useState, use } from "react";
import { useFluxApi } from "@/lib/api";
import { Globe, Plus, ArrowUpRight, Zap, MoreVertical, Edit2, Trash2, Shield, Activity, Clock } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Route, Function as FluxFunction } from "@/types/api";

export default function RoutesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const api = useFluxApi(id);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [functions, setFunctions] = useState<FluxFunction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    method: "GET",
    path: "/api/",
    function_id: ""
  });

  const refresh = () => {
    setLoading(true);
    Promise.all([
      api.getRoutes(),
      api.getFunctions()
    ]).then(([routesData, funcsData]) => {
      setRoutes(routesData);
      setFunctions(funcsData);
      setLoading(false);
    }).catch(console.error);
  };

  useEffect(() => {
    if (api.ready) refresh();
  }, [id, api.ready]);

  const handleOpenCreate = () => {
    setEditingRoute(null);
    setFormData({ method: "GET", path: "/api/", function_id: functions[0]?.id || "" });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      method: route.method,
      path: route.path,
      function_id: route.function_id || ""
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingRoute) {
        await api.updateRoute(editingRoute.id!, formData.method, formData.path, formData.function_id);
      } else {
        await api.createRoute(formData.method, formData.path, formData.function_id);
      }
      setIsDialogOpen(false);
      refresh();
    } catch (err) {
      alert("Failed to save route: " + err);
    }
  };

  const handleDelete = async (routeId: string) => {
    if (!confirm("Are you sure you want to delete this route?")) return;
    try {
      await api.deleteRoute(routeId);
      refresh();
    } catch (err) {
      alert("Failed to delete route: " + err);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Routes</h2>
          <p className="text-sm text-neutral-500 mt-1">Map public URL paths to your functions.</p>
        </div>
        <Button onClick={handleOpenCreate} variant="outline" size="sm" className="bg-white text-black hover:bg-neutral-200 font-bold h-9">
           <Plus className="w-4 h-4 mr-2" />
           New Route
        </Button>
      </header>

      <div className="border border-neutral-900 rounded-lg bg-[#0c0c0c] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#111] hover:bg-[#111]">
            <TableRow className="border-neutral-900 hover:bg-transparent">
              <TableHead className="px-8 font-mono text-[10px] uppercase tracking-widest text-neutral-500 w-[100px]">Method</TableHead>
              <TableHead className="px-8 font-mono text-[10px] uppercase tracking-widest text-neutral-500">Path</TableHead>
              <TableHead className="px-8 font-mono text-[10px] uppercase tracking-widest text-neutral-500">Function Mapping</TableHead>
              <TableHead className="px-8 font-mono text-[10px] uppercase tracking-widest text-neutral-500">Policy</TableHead>
              <TableHead className="px-8 font-mono text-[10px] uppercase tracking-widest text-neutral-500 w-[120px]">Rate Limit</TableHead>
              <TableHead className="px-8 font-mono text-[10px] uppercase tracking-widest text-neutral-500 w-[100px]">Timeout</TableHead>
              <TableHead className="px-8 text-right font-mono text-[10px] uppercase tracking-widest text-neutral-500">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routes.map(r => (
               <TableRow key={r.id} className="border-neutral-900 hover:bg-neutral-900/30 transition-colors group">
                 <TableCell className="px-8">
                    <Badge variant="outline" className="bg-neutral-950 border-neutral-800 text-neutral-500 text-[9px] font-black h-5 uppercase">
                       {r.method}
                    </Badge>
                 </TableCell>
                 <TableCell className="px-8 text-neutral-200 font-medium tracking-tight text-sm">
                    {r.path}
                 </TableCell>
                 <TableCell className="px-8">
                    <div className="flex items-center gap-2 text-blue-500/80 font-bold text-sm">
                       <Zap className="w-3.5 h-3.5" />
                       <span className="truncate max-w-[200px] hover:underline cursor-pointer">
                          {r.function_name || `func_${r.function_id?.split('-')[0]}`}
                       </span>
                    </div>
                 </TableCell>
                 <TableCell className="px-8">
                    <div className="flex items-center gap-1.5 text-neutral-500 text-[10px] font-bold uppercase">
                       <Shield className="w-3 h-3" />
                       {r.access_policy || "private"}
                    </div>
                 </TableCell>
                 <TableCell className="px-8">
                    <div className="flex items-center gap-1 text-neutral-600 text-[11px] font-mono">
                       <Activity className="w-3 h-3" />
                       {r.rate_limit_rpm ?? 60} RPM
                    </div>
                 </TableCell>
                 <TableCell className="px-8">
                    <div className="flex items-center gap-1 text-neutral-600 text-[11px] font-mono">
                       <Clock className="w-3 h-3" />
                       {r.max_duration_ms ?? 10000}ms
                    </div>
                 </TableCell>
                 <TableCell className="px-8 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-neutral-700 hover:text-white transition-colors p-2">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#111] border-neutral-800 text-neutral-300">
                        <DropdownMenuItem onClick={() => handleOpenEdit(r)} className="hover:bg-neutral-800 cursor-pointer text-xs">
                          <Edit2 className="w-3.5 h-3.5 mr-2" />
                          Edit Route
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={async () => {
                            const newPolicy = r.access_policy === "public" ? "private" : "public";
                            await api.updateFunction(r.function_id!, { access_policy: newPolicy });
                            refresh();
                          }}
                          className="hover:bg-neutral-800 cursor-pointer text-xs"
                        >
                          <Shield className="w-3.5 h-3.5 mr-2" />
                          Make {r.access_policy === "public" ? "Private" : "Public"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(r.id!)} className="text-red-400 hover:bg-red-400/10 cursor-pointer text-xs">
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          Delete Route
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                 </TableCell>
               </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {loading && (
          <div className="p-12 text-center text-neutral-700 font-mono text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 animate-pulse">
            <Globe className="w-4 h-4" /> 
            Fetching dynamic route table...
          </div>
        )}
        
        {!loading && routes.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center border-t border-neutral-900/50">
             <Globe className="w-8 h-8 text-neutral-900 mb-3" />
             <p className="text-neutral-600 font-mono text-xs italic">No dynamic routes defined in this project.</p>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#0f0f0f] border-neutral-900 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">
              {editingRoute ? "Edit Route" : "Create New Route"}
            </DialogTitle>
            <DialogDescription className="text-neutral-500">
              {editingRoute ? "Update your path mapping or target function." : "Map a new public path to one of your functions."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-neutral-400 text-xs">Method</Label>
              <Select value={formData.method} onValueChange={(v) => setFormData({ ...formData, method: v })}>
                <SelectTrigger className="col-span-3 bg-black border-neutral-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-neutral-800 text-white">
                  {["GET", "POST", "PUT", "DELETE", "PATCH"].map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-neutral-400 text-xs">Path</Label>
              <Input 
                value={formData.path} 
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                placeholder="/api/hello"
                className="col-span-3 bg-black border-neutral-800"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-neutral-400 text-xs">Function</Label>
              <Select value={formData.function_id} onValueChange={(v) => setFormData({ ...formData, function_id: v })}>
                <SelectTrigger className="col-span-3 bg-black border-neutral-800">
                  <SelectValue placeholder="Select a function" />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-neutral-800 text-white">
                  {functions.map(f => (
                    <SelectItem key={f.id} value={f.id!}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-neutral-500 hover:text-white">Cancel</Button>
            <Button onClick={handleSave} className="bg-white text-black font-bold hover:bg-neutral-200">
              {editingRoute ? "Update Route" : "Create Route"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="bg-[#111]/40 border-neutral-900 p-8 flex items-center justify-between group cursor-help hover:border-neutral-800 transition-colors">
         <div>
            <h4 className="text-white font-bold text-sm tracking-tight">Wildcard Routing</h4>
            <p className="text-neutral-500 text-xs mt-1 font-medium italic">Capture multiple paths by using the `/*` suffix in your route definitions.</p>
         </div>
         <ArrowUpRight className="w-5 h-5 text-neutral-800 group-hover:text-blue-400 transition-colors" />
      </Card>
    </div>
  );
}

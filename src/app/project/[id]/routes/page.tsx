"use client";
import { useEffect, useState, use } from "react";
import { fetchApi } from "@/lib/api";
import { Globe, Plus, ArrowUpRight, Zap, MoreVertical } from "lucide-react";
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

export default function RoutesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi(`/routes?project_id=${id}`).then(data => {
      setRoutes(data);
      setLoading(false);
    }).catch(console.error);
  }, [id]);

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Routes</h2>
          <p className="text-sm text-neutral-500 mt-1">Map public URL paths to your functions.</p>
        </div>
        <Button variant="outline" size="sm" className="bg-white text-black hover:bg-neutral-200 font-bold h-9">
           <Plus className="w-4 h-4 mr-2" />
           New Route
        </Button>
      </header>

      <div className="border border-neutral-900 rounded-lg bg-[#0c0c0c] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#111] hover:bg-[#111]">
            <TableRow className="border-neutral-900 hover:bg-transparent">
              <TableHead className="px-8 font-mono text-[10px] uppercase tracking-widest text-neutral-500">Method</TableHead>
              <TableHead className="px-8 font-mono text-[10px] uppercase tracking-widest text-neutral-500">Path</TableHead>
              <TableHead className="px-8 font-mono text-[10px] uppercase tracking-widest text-neutral-500">Function Mapping</TableHead>
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
                          func_{r.function_id?.split('-')[0] || "unbound"}
                       </span>
                    </div>
                 </TableCell>
                 <TableCell className="px-8 text-right">
                    <button className="text-neutral-700 hover:text-white transition-colors">
                       <MoreVertical className="w-4 h-4" />
                    </button>
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

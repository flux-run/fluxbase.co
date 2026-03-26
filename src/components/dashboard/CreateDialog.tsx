"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => Promise<void>;
  title: string;
  description?: string;
  placeholder: string;
  label: string;
}

export function CreateDialog({ isOpen, onClose, onConfirm, title, description, placeholder, label }: CreateDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onConfirm(name);
      setName("");
      onClose();
    } catch (err) {
      console.error("Create failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#0D0D0D] border-white/[0.08] text-white sm:max-w-[400px] p-8 rounded-none">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-black tracking-tighter uppercase">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-neutral-500 text-xs font-medium">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <Label htmlFor="create-name" className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-600 block">
              {label}
            </Label>
            <Input
              id="create-name"
              placeholder={placeholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[#111] border-white/[0.05] focus:border-blue-500/50 transition-all h-12 rounded-none text-sm placeholder:text-neutral-800"
              autoFocus
            />
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4 sm:space-x-0">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onClose}
              className="text-neutral-500 hover:text-white hover:bg-white/5 rounded-none uppercase text-[10px] font-black tracking-widest h-12 flex-1 sm:flex-initial"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !name.trim()}
              className="bg-white text-black hover:bg-neutral-200 font-black px-10 rounded-none uppercase text-[10px] tracking-widest h-12 flex-1 sm:flex-initial min-w-[120px] transition-all hover:-translate-y-0.5"
            >
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

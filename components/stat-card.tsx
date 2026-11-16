import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "emerald" | "red" | "slate";
  hint?: string;
}

const TONES = {
  emerald: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-600",
  slate: "bg-slate-100 text-slate-600",
};

export function StatCard({ label, value, icon: Icon, tone = "emerald", hint }: StatCardProps) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", TONES[tone])}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <p className="truncate text-2xl font-extrabold text-slate-800">{value}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    </Card>
  );
}

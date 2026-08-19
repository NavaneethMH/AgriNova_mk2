import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

export type StressLevel = "optimal" | "mild" | "moderate" | "severe";

const styles: Record<StressLevel, string> = {
  optimal: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  mild: "bg-amber-100 text-amber-800 ring-amber-200",
  moderate: "bg-orange-100 text-orange-800 ring-orange-200",
  severe: "bg-red-100 text-red-800 ring-red-200",
};

export function StressBadge({ level, className }: { level: StressLevel; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize tracking-wide ring-1 ring-inset", styles[level], className)}>
      <Activity className="h-3 w-3" />
      {level}
    </span>
  );
}

export function stressColor(level?: StressLevel | null) {
  if (level === "severe") return "#b91c1c";
  if (level === "moderate") return "#ea580c";
  if (level === "mild") return "#ca8a04";
  return "#2D6A4F";
}

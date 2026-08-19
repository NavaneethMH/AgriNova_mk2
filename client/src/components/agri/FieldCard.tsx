import { Button } from "@/components/ui/button";
import { Droplets, MapPin, Sprout, Timer } from "lucide-react";
import { useLocation } from "wouter";
import { StressBadge, type StressLevel } from "./StressBadge";

type FieldCardProps = {
  field: {
    id: number;
    name: string;
    cropType: string;
    areaHectares: number;
    soilType: string;
  };
  farmName?: string;
  stress?: { score: number; riskLevel: StressLevel; confidence: number } | null;
  irrigation?: { occurredAt: Date } | null;
  reading?: { soilMoisture: number } | null;
};

function relativeTime(date?: Date | null) {
  if (!date) return "No event recorded";
  const hours = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 3_600_000));
  if (hours < 1) return "Less than an hour ago";
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.round(hours / 24)} days ago`;
}

export function FieldCard({ field, farmName, stress, irrigation, reading }: FieldCardProps) {
  const [, setLocation] = useLocation();
  const level = stress?.riskLevel ?? "mild";
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-[#e0e6e1] bg-white p-5 shadow-[0_4px_20px_rgba(27,67,50,0.06)] transition-transform duration-200 hover:-translate-y-0.5">
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: stress?.riskLevel === "severe" ? "#b91c1c" : stress?.riskLevel === "moderate" ? "#ea580c" : stress?.riskLevel === "mild" ? "#ca8a04" : "#2D6A4F" }} />
      <div className="flex items-start justify-between gap-3 pt-1">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.13em] text-[#718078]">{farmName || "Active field"}</p>
          <h3 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[#012d1d]">{field.name}</h3>
          <p className="mt-1 text-sm text-[#64736c]">{field.cropType} · {field.areaHectares.toFixed(1)} ha</p>
        </div>
        <StressBadge level={level} />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-[#f5f7f3] p-3">
        <div>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[#718078]">Stress</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-[#012d1d]">{stress?.score ?? "—"}<span className="text-xs font-medium text-[#718078]">/100</span></p>
        </div>
        <div className="border-x border-[#dde5de] px-2">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[#718078]">Moisture</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-[#012d1d]">{reading ? `${Math.round(reading.soilMoisture)}%` : "—"}</p>
        </div>
        <div className="pl-1">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[#718078]">Confidence</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-[#012d1d]">{stress ? `${stress.confidence}%` : "—"}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2 text-xs text-[#607068]">
        <div className="flex items-center gap-2"><Timer className="h-3.5 w-3.5 text-[#2D6A4F]" /> Last irrigation: {relativeTime(irrigation?.occurredAt)}</div>
        <div className="flex items-center gap-2"><Sprout className="h-3.5 w-3.5 text-[#2D6A4F]" /> {field.soilType} soil</div>
      </div>
      <Button className="mt-5 w-full bg-[#2D6A4F] text-white hover:bg-[#1b4332]" onClick={() => setLocation(`/fields/${field.id}`)}>View field intelligence</Button>
    </article>
  );
}

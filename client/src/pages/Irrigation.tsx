import { SectionHeading } from "@/components/agri/SectionHeading";
import { StressBadge, type StressLevel } from "@/components/agri/StressBadge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, Droplets, Timer } from "lucide-react";
import { useLocation } from "wouter";

function lastIrrigation(value?: Date | null) {
  if (!value) return "No irrigation record";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default function Irrigation() {
  const [, setLocation] = useLocation();
  const dashboard = trpc.agri.dashboard.useQuery();
  return <div className="mx-auto max-w-[1200px] space-y-8"><SectionHeading eyebrow="Irrigation history" title="Record the water applied, then learn from it." description="Each completed irrigation event helps AgriNova interpret the next stress signal in the context of what the field already received." />
    <div className="overflow-hidden rounded-2xl border border-[#dce6dc] bg-white"><div className="grid grid-cols-[minmax(170px,1.4fr)_repeat(3,minmax(120px,1fr))_100px] gap-4 border-b border-[#e5ebe6] bg-[#f6f8f5] px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.13em] text-[#64766b]"><span>Field</span><span>Last irrigation</span><span>Stress status</span><span>Method</span><span className="text-right">Open</span></div>{dashboard.isLoading ? <p className="p-6 text-sm text-[#607068]">Loading irrigation history…</p> : dashboard.data?.length ? dashboard.data.map(item => <div key={item.field.id} className="grid grid-cols-[minmax(170px,1.4fr)_repeat(3,minmax(120px,1fr))_100px] items-center gap-4 border-b border-[#eef1ee] px-5 py-4 last:border-0"><div><p className="font-semibold text-[#183a29]">{item.field.name}</p><p className="mt-1 text-xs text-[#718078]">{item.field.cropType} · {item.field.areaHectares.toFixed(1)} ha</p></div><div className="flex items-center gap-2 text-sm text-[#607068]"><Timer className="h-3.5 w-3.5 text-[#2D6A4F]" />{lastIrrigation(item.latestIrrigation?.occurredAt)}</div><div>{item.latestStress ? <StressBadge level={item.latestStress.riskLevel as StressLevel} /> : <span className="text-sm text-[#718078]">Awaiting reading</span>}</div><p className="capitalize text-sm text-[#607068]">{item.field.irrigationMethod}</p><div className="text-right"><Button variant="ghost" size="icon" aria-label={`Open irrigation events for ${item.field.name}`} onClick={() => setLocation(`/fields/${item.field.id}`)}><ArrowUpRight className="h-4 w-4 text-[#2D6A4F]" /></Button></div></div>) : <div className="agri-grid p-12 text-center"><Droplets className="mx-auto h-8 w-8 text-[#72a883]" /><h2 className="mt-4 text-lg font-semibold text-[#012d1d]">No irrigation history yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#61736a]">Register a field, log a soil reading, and record the water you apply to form the first line of your irrigation history.</p><Button className="mt-5 bg-[#2D6A4F] text-white hover:bg-[#1b4332]" onClick={() => setLocation("/fields?new=1")}>Register a field</Button></div>}</div></div>;
}

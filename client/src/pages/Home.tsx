import { FieldCard } from "../components/agri/FieldCard";
import { SectionHeading } from "../components/agri/SectionHeading";
import { StressBadge, type StressLevel } from "../components/agri/StressBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { BellRing, ChevronRight, CloudSun, Droplets, Plus, TriangleAlert } from "lucide-react";
import { useLocation } from "wouter";

function formatDate(value?: Date | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default function Home() {
  const [, setLocation] = useLocation();
  const dashboard = trpc.agri.dashboard.useQuery();
  const alerts = trpc.agri.alerts.list.useQuery();
  const fields = dashboard.data ?? [];
  const urgent = fields.filter(item => item.latestStress?.riskLevel === "severe" || item.latestStress?.riskLevel === "moderate");

  return (
    <div className="mx-auto max-w-[1440px] space-y-8">
      <SectionHeading
        eyebrow="Farmer command centre"
        title="Irrigation decisions, made field by field."
        description="AgriNova combines soil, crop, weather, and irrigation context into one clear next action."
        action={<Button className="min-h-12 gap-2 bg-[#2D6A4F] px-5 text-white hover:bg-[#1b4332]" onClick={() => setLocation("/fields?new=1")}><Plus className="h-4 w-4" /> Add field</Button>}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[#dce6dc] bg-[#012d1d] p-5 text-white shadow-[0_4px_20px_rgba(27,67,50,0.12)]">
          <div className="flex items-center justify-between"><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#b4d3bf]">Monitored fields</p><SproutIcon /></div>
          <p className="mt-7 text-5xl font-bold tracking-[-0.05em] tabular-nums">{fields.length}</p>
          <p className="mt-2 text-sm text-[#c9ded0]">Active areas under crop-water observation</p>
        </div>
        <div className="rounded-2xl border border-[#ead9bd] bg-[#fffaf1] p-5">
          <div className="flex items-center justify-between"><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#856f4b]">Needs attention</p><TriangleAlert className="h-5 w-5 text-[#c66a1b]" /></div>
          <p className="mt-7 text-5xl font-bold tracking-[-0.05em] tabular-nums text-[#6f3e13]">{urgent.length}</p>
          <p className="mt-2 text-sm text-[#7f694e]">Moderate or severe fields need a decision</p>
        </div>
        <div className="rounded-2xl border border-[#d3e3ee] bg-[#f2f9fc] p-5">
          <div className="flex items-center justify-between"><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#597889]">Weather-aware plans</p><CloudSun className="h-5 w-5 text-[#287197]" /></div>
          <p className="mt-7 text-2xl font-semibold tracking-[-0.035em] text-[#174c67]">7-day outlook</p>
          <p className="mt-2 text-sm text-[#5e7d8d]">Refresh weather from any field to plan around rain.</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#587066]">Field overview</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-[#012d1d]">Current crop-water status</h2></div><Button variant="ghost" className="text-[#2D6A4F] hover:bg-[#eaf3eb]" onClick={() => setLocation("/fields")}>Manage fields <ChevronRight className="h-4 w-4" /></Button></div>
          {dashboard.isLoading ? <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-72 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div> : fields.length === 0 ? <EmptyFieldState onAdd={() => setLocation("/fields?new=1")} /> : <div className="grid gap-4 md:grid-cols-2">{fields.map(item => <FieldCard key={item.field.id} field={item.field} farmName={item.farmName} stress={item.latestStress as { score: number; riskLevel: StressLevel; confidence: number } | null} irrigation={item.latestIrrigation} reading={item.latestReading} />)}</div>}
        </div>
        <aside className="rounded-2xl border border-[#dfe6e0] bg-white p-5 shadow-[0_4px_20px_rgba(27,67,50,0.05)]">
          <div className="flex items-center justify-between"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#587066]">Field signals</p><h2 className="mt-1 text-lg font-semibold text-[#012d1d]">Alerts & reminders</h2></div><BellRing className="h-5 w-5 text-[#2D6A4F]" /></div>
          <div className="mt-5 space-y-3">
            {alerts.isLoading ? <><Skeleton className="h-20 rounded-xl" /><Skeleton className="h-20 rounded-xl" /></> : alerts.data?.length ? alerts.data.slice(0, 5).map(item => <div key={item.alert.id} className="rounded-xl border border-[#e5ebe5] p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-[#18372a]">{item.fieldName}</p><StressBadge level={item.alert.severity as StressLevel} /></div><p className="mt-2 text-xs leading-5 text-[#5e6e66]">{item.alert.message}</p><p className="mt-2 font-mono text-[10px] text-[#839087]">{formatDate(item.alert.createdAt)}</p></div>) : <p className="rounded-xl bg-[#f5f8f5] p-4 text-sm leading-6 text-[#5e6e66]">No active field alerts. Log a reading to start monitoring stress thresholds.</p>}
          </div>
          <Button variant="outline" className="mt-5 w-full border-[#cddbd0] text-[#1b5c3d] hover:bg-[#eff7f0]" onClick={() => setLocation("/alerts")}>Review all alerts</Button>
        </aside>
      </section>
    </div>
  );
}

function EmptyFieldState({ onAdd }: { onAdd: () => void }) {
  return <div className="agri-grid rounded-2xl border border-dashed border-[#b9cfbd] bg-[#f5faf5] p-8 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#dceede] text-[#2D6A4F]"><Droplets className="h-6 w-6" /></div><h3 className="mt-4 text-lg font-semibold text-[#012d1d]">Start with your first field</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#587066]">Add crop, soil, area, and coordinates. AgriNova will then turn your field data into decision-ready irrigation intelligence.</p><Button className="mt-5 bg-[#2D6A4F] text-white hover:bg-[#1b4332]" onClick={onAdd}>Add a field</Button></div>;
}

function SproutIcon() { return <Droplets className="h-5 w-5 text-[#a5d9b6]" />; }

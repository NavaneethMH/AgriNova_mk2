import { SectionHeading } from "@/components/agri/SectionHeading";
import { StressBadge, type StressLevel } from "@/components/agri/StressBadge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { BellRing, CheckCheck, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Alerts() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const alerts = trpc.agri.alerts.list.useQuery();
  const acknowledge = trpc.agri.alerts.acknowledge.useMutation({ onSuccess: () => { utils.agri.alerts.list.invalidate(); toast.success("Alert acknowledged"); }, onError: error => toast.error(error.message || "AgriNova could not acknowledge this alert.") });
  return <div className="mx-auto max-w-[1100px] space-y-8"><SectionHeading eyebrow="Decision signals" title="Alerts that lead to a clear next step." description="AgriNova surfaces critical water-stress warnings, irrigation reminders, and daily summaries directly against the affected field." /><div className="overflow-hidden rounded-2xl border border-[#dce6dc] bg-white">{alerts.isLoading ? <p className="p-6 text-sm text-[#607068]">Loading alerts…</p> : alerts.data?.length ? alerts.data.map(item => <article key={item.alert.id} className={`flex flex-col gap-4 border-b border-[#edf1ed] p-5 last:border-0 sm:flex-row sm:items-center ${item.alert.isRead ? "opacity-65" : ""}`}><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#edf6ee] text-[#2D6A4F]"><BellRing className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-[#183a29]">{item.fieldName}</h2><StressBadge level={item.alert.severity as StressLevel} /></div><p className="mt-2 text-sm leading-6 text-[#5c6e63]">{item.alert.message}</p><p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#829187]">{new Date(item.alert.createdAt).toLocaleString()}</p></div><div className="flex shrink-0 gap-2"><Button variant="outline" size="sm" className="border-[#cddbd0] text-[#1e5a3c]" onClick={() => setLocation(`/fields/${item.alert.fieldId}`)}>Open field <ChevronRight className="h-3.5 w-3.5" /></Button>{!item.alert.isRead ? <Button variant="ghost" size="sm" className="text-[#2D6A4F]" disabled={acknowledge.isPending} onClick={() => acknowledge.mutate({ alertId: item.alert.id })}><CheckCheck className="h-4 w-4" /> Acknowledge</Button> : null}</div></article>) : <div className="p-10 text-center text-sm leading-6 text-[#607068]">No alerts have been created yet. Log readings to activate the water-stress alert workflow.</div>}</div></div>;
}

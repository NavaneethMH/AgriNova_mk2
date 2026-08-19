import { cn } from "@/lib/utils";

export function SectionHeading({ eyebrow, title, description, action, className }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        {eyebrow ? <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#587066]">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#012d1d] sm:text-[32px]">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[#53635d]">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

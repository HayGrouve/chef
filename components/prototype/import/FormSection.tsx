"use client";

// PROTOTYPE — numbered section card with completion state. Mirrors the
// (non-exported) FormSection/StatusBadge in app/create/page.tsx; a real
// version would share one component.
import { Check, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export type SectionStatus = "done" | "todo" | "optional";

export type SectionMeta = {
  id: string;
  title: string;
  description: string;
  status: SectionStatus;
};

export function StatusBadge({ index, status }: { index: number; status: SectionStatus }) {
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
        status === "done" && "bg-primary text-primary-foreground",
        status === "todo" && "border-2 border-muted-foreground/30 text-muted-foreground",
        status === "optional" && "border-2 border-dashed border-muted-foreground/30 text-muted-foreground"
      )}
    >
      {status === "done" ? <Check className="h-4 w-4" /> : index + 1}
    </span>
  );
}

export function FormSection({
  meta,
  index,
  children,
  collapsible,
}: {
  meta: SectionMeta;
  index: number;
  children: React.ReactNode;
  collapsible?: { open: boolean; onOpenChange: (open: boolean) => void; summary: string };
}) {
  const header = (
    <div className="flex items-start gap-3">
      <StatusBadge index={index} status={meta.status} />
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold leading-7">
          {meta.title}
          {meta.status === "optional" && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">Optional</span>
          )}
        </h2>
        <p className="text-sm text-muted-foreground">
          {collapsible && !collapsible.open ? collapsible.summary : meta.description}
        </p>
      </div>
      {collapsible && (
        <ChevronDown
          className={cn(
            "mt-1.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            collapsible.open && "rotate-180"
          )}
        />
      )}
    </div>
  );

  return (
    <section id={meta.id} className="scroll-mt-24 rounded-xl border bg-card shadow-xs">
      {collapsible ? (
        <Collapsible open={collapsible.open} onOpenChange={collapsible.onOpenChange}>
          <CollapsibleTrigger asChild>
            <button type="button" className="w-full p-4 text-left md:p-6">
              {header}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 md:px-6 md:pb-6 md:pl-16">{children}</div>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <>
          <div className="p-4 pb-4 md:p-6 md:pb-4">{header}</div>
          <div className="px-4 pb-4 md:px-6 md:pb-6 md:pl-16">{children}</div>
        </>
      )}
    </section>
  );
}

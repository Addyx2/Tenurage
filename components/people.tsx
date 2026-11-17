import { MessageSquare, Navigation, Phone } from "lucide-react";

import { cn } from "@/lib/utils";

export function Avatar({ first, last, className }: { first: string; last: string; className?: string }) {
  return (
    <span className={cn("flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-slate-100 text-[13px] font-semibold text-slate-700", className)} aria-hidden="true">
      {`${first.charAt(0)}${last.charAt(0)}`.toUpperCase()}
    </span>
  );
}

const pill = "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50";

/**
 * Call and text a person from their phone, and directions to a property.
 * `compact` shows round icon buttons; otherwise labelled pills that share the row.
 */
export function ContactButtons({ phone, name, directions, compact = false, className }: { phone: string | null; name: string; directions?: string; compact?: boolean; className?: string }) {
  if (compact) {
    return (
      <div className={cn("flex shrink-0 gap-1.5", className)}>
        {phone ? (
          <>
            <a href={`tel:${phone}`} aria-label={`Call ${name}`} className={cn(pill, "h-9 w-9")}><Phone className="h-4 w-4" /></a>
            <a href={`sms:${phone}`} aria-label={`Text ${name}`} className={cn(pill, "h-9 w-9")}><MessageSquare className="h-4 w-4" /></a>
          </>
        ) : null}
        {directions ? <a href={directions} target="_blank" rel="noreferrer" aria-label="Directions" className={cn(pill, "h-9 w-9")}><Navigation className="h-4 w-4" /></a> : null}
      </div>
    );
  }
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {phone ? (
        <>
          <a href={`tel:${phone}`} aria-label={`Call ${name}`} className={cn(pill, "flex-1 px-4 py-2.5 sm:flex-none")}><Phone className="h-4 w-4" /> Call</a>
          <a href={`sms:${phone}`} aria-label={`Text ${name}`} className={cn(pill, "flex-1 px-4 py-2.5 sm:flex-none")}><MessageSquare className="h-4 w-4" /> Text</a>
        </>
      ) : (
        <span className="py-2 text-sm text-slate-500">No mobile number</span>
      )}
      {directions ? <a href={directions} target="_blank" rel="noreferrer" className={cn(pill, "flex-1 px-4 py-2.5 sm:flex-none")}><Navigation className="h-4 w-4" /> Directions</a> : null}
    </div>
  );
}

/** A small label for who did something: the AI's in brick orange. */
export function Source({ who }: { who: "Linkbot" | "Bot" | "Feedback" | "Office" }) {
  return <span className={cn("w-[68px] shrink-0 pt-0.5 text-xs font-semibold", who === "Linkbot" || who === "Bot" ? "text-ai-500" : "text-slate-500")}>{who}</span>;
}

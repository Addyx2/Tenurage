import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";

import { PropertyMedia } from "@/components/media";
import { Avatar, ContactButtons } from "@/components/people";
import { street } from "@/components/PropertyCard";
import { Badge, buttonClass, inputClass, subtleButtonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { displayPhone } from "@/lib/integrations/phone";
import { mismatch, money } from "@/lib/matching";
import { STAGES, stageLabel, stageOf } from "@/lib/pipeline";
import { cn } from "@/lib/utils";

import { textApplicantAction } from "../../linkbot/actions";
import { setApplicantStageAction, setApplicantStatusAction } from "../actions";

export const dynamic = "force-dynamic";
const when = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const panel = "rounded-card border border-line bg-white p-5 md:p-7";
const h2 = "flex items-baseline gap-2.5 text-lg font-semibold tracking-[-0.01em]";

export default async function ApplicantPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; sent?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { error, sent } = await searchParams;
  const a = await prisma.applicant.findFirst({ where: { id, agencyId: user.agencyId }, include: { viewings: { include: { property: true }, orderBy: { startAt: "desc" } } } });
  if (!a) notFound();
  const [available, texts] = await Promise.all([
    prisma.property.findMany({ where: { agencyId: user.agencyId, status: "AVAILABLE", market: a.market } }),
    prisma.smsMessage.findMany({ where: { agencyId: user.agencyId, applicantId: a.id }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  const suits = available.filter((p) => mismatch(p, a) === null);
  const stage = stageOf(a);
  const name = `${a.firstName} ${a.lastName}`;

  return (
    <div className="pt-4 md:pt-8">
      <Link href="/applicants" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> Applicants</Link>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-5 md:mb-8">
        <div className="flex items-center gap-4">
          <Avatar first={a.firstName} last={a.lastName} className="h-14 w-14 text-base md:h-16 md:w-16" />
          <div>
            <h1 className="headline text-3xl md:text-[44px]">{name}</h1>
            <p className="mt-1 text-[15px] text-slate-500">{a.market === "SALE" ? "Buying" : "Renting"} · {a.minBedrooms}+ beds · up to {money(a.maxPrice, a.market)} · {a.areas.join(", ") || "anywhere"}</p>
          </div>
        </div>
        <ContactButtons className="w-full md:w-auto" phone={a.phone} name={name} />
      </header>

      {/* Where they are: new → viewing booked → viewed → offer → let/sold. */}
      <section className={cn(panel, "mb-4 lg:mb-6")}>
        <ol className="grid grid-cols-5 gap-1.5" aria-label="Stage">
          {STAGES.map((s, i) => (
            <li key={s} aria-current={s === stage ? "step" : undefined} className="min-w-0">
              <span className={cn("block h-1.5 rounded-full", i <= STAGES.indexOf(stage) ? "bg-slate-900" : "bg-slate-200")} />
              <span className={cn("mt-2 block truncate text-[11px] sm:text-xs", s === stage ? "font-semibold text-slate-900" : "text-slate-500")}>{stageLabel(s, a.market)}</span>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-5">
          <form action={setApplicantStageAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="applicantId" value={a.id} />
            {stage !== "OFFER" ? <button name="stage" value="OFFER" className={subtleButtonClass}>{a.market === "SALE" ? "Offer made" : "Applied"}</button> : null}
            {stage !== "AGREED" ? <button name="stage" value="AGREED" className={subtleButtonClass}>{a.market === "SALE" ? "Sale agreed" : "Let agreed"}</button> : null}
            {a.offerStage ? <button name="stage" value="" className={subtleButtonClass}>Back to viewings</button> : null}
          </form>
          <form action={setApplicantStatusAction} className="flex flex-wrap gap-2 sm:ml-auto">
            <input type="hidden" name="applicantId" value={a.id} />
            {a.status !== "ACTIVE" ? <button name="status" value="ACTIVE" className={subtleButtonClass}>Make active</button> : <button name="status" value="PAUSED" className={subtleButtonClass}>Pause</button>}
            <button name="status" value="ARCHIVED" className={subtleButtonClass}>Archive</button>
          </form>
        </div>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="space-y-4 lg:col-span-2 lg:space-y-6">
          <section className={panel}>
            <h2 className={h2}>Viewings <span className="text-[13px] font-normal text-slate-500">{a.viewings.length}</span></h2>
            {a.viewings.length === 0 ? <p className="mt-3 text-sm text-slate-500">None yet.</p> : (
              <ul className="mt-3">
                {a.viewings.map((v, i) => (
                  <li key={v.id} className={cn("flex gap-3 py-3", i > 0 && "border-t border-slate-200")}>
                    <PropertyMedia property={v.property} video={false} label={false} className="aspect-square w-14 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                        <Link href={`/properties/${v.propertyId}`} className="font-medium hover:underline">{street(v.property.address)}</Link>
                        <span className="text-xs text-slate-500">{v.status.toLowerCase().replace("_", " ")}{v.bookedVia === "linkbot" ? " · by Linkbot" : ""}</span>
                      </p>
                      <p className="tabular text-sm text-slate-500">{when.format(v.startAt)}{v.interest ? ` · interest ${v.interest}/5` : ""}</p>
                      {v.feedback ? <p className="mt-1 font-serif text-[18px] leading-snug">“{v.feedback}”</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={panel}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className={h2}><Sparkles className="h-4 w-4 self-center text-ai-500" /> Linkbot conversation</h2>
              <Link href={`/linkbot/texts/${a.id}`} className="text-sm font-medium text-slate-500 hover:text-slate-900">All texts</Link>
            </div>
            {texts.length === 0 ? <p className="mt-3 text-sm text-slate-500">No texts yet.</p> : (
              <div className="mt-4 space-y-2">
                {[...texts].reverse().map((t) => (
                  <div key={t.id} className={cn("flex", t.direction === "IN" ? "justify-start" : "justify-end")}>
                    <p className={cn("max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm", t.direction === "IN" ? "bg-slate-100 text-slate-900" : "bg-slate-900 text-white", t.status === "FAILED" && "bg-red-100 text-red-800")}>{t.body}</p>
                  </div>
                ))}
              </div>
            )}
            {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
            {sent ? <p role="status" className="mt-4 text-sm text-emerald-700">Sent.</p> : null}
            {a.smsOptOutAt ? <p className="mt-4 text-sm text-slate-500">{a.firstName} texted STOP, so Linkbot won&apos;t text them until they text START.</p> : a.phone ? (
              <form action={textApplicantAction} className="mt-4 flex gap-2 border-t border-slate-200 pt-4">
                <input type="hidden" name="applicantId" value={a.id} />
                <input type="hidden" name="back" value={`/applicants/${a.id}`} />
                <input name="body" required maxLength={600} placeholder={`Text ${a.firstName} from the office…`} aria-label={`Text ${a.firstName}`} className={inputClass} />
                <button className={buttonClass}>Send</button>
              </form>
            ) : null}
          </section>
        </div>

        <div className="space-y-4 lg:space-y-6">
          <section className={panel}>
            <h2 className={h2}>Contact</h2>
            <p className="mt-3 text-sm text-slate-700">{a.phone ? displayPhone(a.phone) : "No mobile"}</p>
            <p className="text-sm text-slate-700">{a.email ?? "No email"}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {a.status === "PAUSED" ? <Badge tone="slate">Paused</Badge> : null}
              {a.smsOptOutAt ? <Badge tone="slate">Texted STOP</Badge> : null}
            </div>
            {a.notes ? <p className="mt-3 text-sm text-slate-500">{a.notes}</p> : null}
          </section>
          <section className={panel}>
            <h2 className={h2}>Suits them <span className="text-[13px] font-normal text-slate-500">{suits.length}</span></h2>
            {suits.length === 0 ? <p className="mt-3 text-sm text-slate-500">No available properties right now.</p> : (
              <ul className="mt-3 space-y-3">
                {suits.map((p) => (
                  <li key={p.id}>
                    <Link href={`/properties/${p.id}`} className="flex items-center gap-3">
                      <PropertyMedia property={p} video={false} label={false} className="aspect-square w-12 shrink-0 rounded-lg" />
                      <span className="min-w-0"><span className="block truncate text-sm font-medium">{street(p.address)}</span><span className="tabular text-xs text-slate-500">{money(p.price, p.market)} · {p.bedrooms} bed</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

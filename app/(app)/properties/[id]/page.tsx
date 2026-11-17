import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";

import { PropertyMedia } from "@/components/media";
import { Avatar } from "@/components/people";
import { street } from "@/components/PropertyCard";
import { Badge, inputClass, labelClass, subtleButtonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { candidates, slotLabel } from "@/lib/linkbot/campaign";
import { money } from "@/lib/matching";
import { directionsUrl } from "@/lib/media";
import { statusLabel } from "@/lib/status";
import { cn } from "@/lib/utils";

import { draftAction } from "../../docs/actions";
import { fillViewingsAction, stopFillingAction } from "../../linkbot/actions";
import { addSlotsAction, removeSlotAction, setPropertyMediaAction, setPropertyStatusAction } from "../actions";

export const dynamic = "force-dynamic";

const INVITE: Record<string, string> = { SENT: "Invited, no reply yet", BOOKED: "Booked a viewing", DECLINED: "Said no", CLOSED: "Slots filled first" };

const panel = "rounded-card border border-line bg-white p-5 md:p-7";
const h2 = "flex items-baseline gap-2.5 text-lg font-semibold tracking-[-0.01em]";

export default async function PropertyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; filling?: string; slots?: string; media?: string; mediaError?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { error, filling, slots, media, mediaError } = await searchParams;
  const p = await prisma.property.findFirst({ where: { id, agencyId: user.agencyId }, include: { viewings: { where: { startAt: { gte: new Date(Date.now() - 7 * 86_400_000) } }, include: { applicant: true }, orderBy: { startAt: "asc" } } } });
  if (!p) notFound();
  const [campaign, pool, lastCampaigns] = await Promise.all([
    prisma.viewingCampaign.findFirst({ where: { propertyId: p.id, status: "RUNNING" } }),
    candidates(user.agencyId, p.id),
    prisma.viewingCampaign.findMany({ where: { propertyId: p.id }, include: { invites: { orderBy: { createdAt: "desc" } } }, orderBy: { createdAt: "desc" }, take: 2 }),
  ]);
  // Linkbot's conversations about this property: everyone it invited, with their latest text.
  const invites = lastCampaigns.flatMap((c) => c.invites).filter((inv, i, all) => all.findIndex((x) => x.applicantId === inv.applicantId) === i).slice(0, 12);
  const ids = invites.map((i) => i.applicantId);
  const [invited, texts] = ids.length
    ? await Promise.all([
        prisma.applicant.findMany({ where: { id: { in: ids }, agencyId: user.agencyId } }),
        prisma.smsMessage.findMany({ where: { agencyId: user.agencyId, applicantId: { in: ids } }, orderBy: { createdAt: "desc" }, take: 100 }),
      ])
    : [[], []];
  const hasMedia = p.photos.length > 0 || !!p.videoUrl;
  const now = new Date();
  const upcoming = p.viewings.filter((v) => v.startAt > now);
  const open = upcoming.filter((v) => v.status === "OPEN").length;
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const statuses = p.market === "SALE" ? ["AVAILABLE", "UNDER_OFFER", "SOLD", "WITHDRAWN"] : ["AVAILABLE", "LET_AGREED", "LET", "WITHDRAWN"];

  return (
    <div className="pt-4 md:pt-8">
      <Link href="/properties" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> Properties</Link>

      <section className="relative -mx-4 overflow-hidden md:mx-0 md:rounded-[28px]">
        {hasMedia ? (
          <>
            <PropertyMedia property={p} className="aspect-[4/3] md:aspect-[21/9]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 to-transparent" />
          </>
        ) : (
          <div className="aspect-[4/3] md:aspect-[21/7]"><div className="sky" aria-hidden="true"><i /><i /><i /></div></div>
        )}
        <div className={cn("absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-5 md:p-10", hasMedia ? "text-white" : "text-slate-900")}>
          <div>
            <span className="mb-3 inline-block rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-900">{p.status === "AVAILABLE" ? (p.market === "SALE" ? "For sale" : "To let") : statusLabel(p.status)}</span>
            <h1 className={cn("headline text-[30px] md:text-[56px]", hasMedia && "text-white")}>{street(p.address)}</h1>
            <p className={cn("mt-1 text-sm md:text-base", hasMedia ? "text-white/85" : "text-slate-700")}>{p.postcode} · {p.bedrooms} bed {p.kind} · <span className="tabular font-semibold">{money(p.price, p.market)}</span></p>
          </div>
          <div className="flex gap-2">
            {!hasMedia ? <a href="#media" className="rounded-full bg-white/90 px-4 py-2.5 text-sm font-medium text-slate-900 hover:bg-white">Add photos</a> : null}
            <a href={directionsUrl(p.address, p.postcode)} target="_blank" rel="noreferrer" className="rounded-full bg-white/90 px-4 py-2.5 text-sm font-medium text-slate-900 hover:bg-white">Directions</a>
          </div>
        </div>
      </section>
      {p.photos.length > 1 ? (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Photos">
          {p.photos.map((src, i) => (
            <li key={src} className="shrink-0">
              <a href={src} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`${street(p.address)}, photo ${i + 1}`} loading="lazy" className="h-20 w-28 rounded-xl object-cover md:h-24 md:w-36" />
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-5 space-y-2">
        {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {filling ? <p role="status" className="rounded-xl bg-ai-50 px-4 py-3 text-sm text-ai-700">Linkbot is on it: {filling} applicant{filling === "1" ? "" : "s"} invited.</p> : null}
        {slots ? <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{slots} slot{slots === "1" ? "" : "s"} opened.</p> : null}
        {media ? <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Photos and video saved.</p> : null}
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="space-y-4 lg:col-span-2 lg:space-y-6">
          <section id="viewings" className={panel}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className={h2}>Viewings <span className="text-[13px] font-normal text-slate-500">{open} open, {upcoming.length - open} booked ahead</span></h2>
              {campaign ? (
                <form action={stopFillingAction}><input type="hidden" name="campaignId" value={campaign.id} /><input type="hidden" name="back" value={`/properties/${p.id}`} /><button className={subtleButtonClass}>Stop Linkbot</button></form>
              ) : p.status === "AVAILABLE" && open > 0 ? (
                <form action={fillViewingsAction}><input type="hidden" name="propertyId" value={p.id} /><button className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-black"><Sparkles className="h-4 w-4 text-ai-500" /> Fill with Linkbot</button></form>
              ) : null}
            </div>
            {campaign ? <p className="mt-3 flex items-center gap-1.5 text-sm text-ai-700"><Sparkles className="h-4 w-4 text-ai-500" /> Linkbot is texting matched applicants: wave {campaign.wave}, {campaign.invited} invited.</p> : null}
            {p.viewings.length === 0 ? <p className="mt-3 text-sm text-slate-500">No viewings yet. Open some slots below and Linkbot can fill them.</p> : (
              <ul className="mt-3">
                {p.viewings.map((v, i) => (
                  <li key={v.id} className={cn("flex flex-wrap items-center justify-between gap-2 py-3 text-sm", i > 0 && "border-t border-slate-200")}>
                    <span className="tabular w-36 font-medium">{slotLabel(v.startAt)}</span>
                    <span className="min-w-0 flex-1 text-slate-600">
                      {v.applicant ? <Link href={`/applicants/${v.applicant.id}`} className="text-slate-900 hover:underline">{v.applicant.firstName} {v.applicant.lastName}</Link> : "Free"}
                      {v.bookedVia === "linkbot" ? <span className="text-ai-600"> · by Linkbot</span> : ""}
                      {v.interest ? ` · interest ${v.interest}/5` : ""}
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge tone={v.status === "BOOKED" ? "green" : v.status === "OPEN" ? "neutral" : "slate"}>{v.status.toLowerCase().replace("_", " ")}</Badge>
                      {v.status === "OPEN" ? <form action={removeSlotAction}><input type="hidden" name="viewingId" value={v.id} /><button className="text-xs text-slate-500 hover:text-red-600">Remove</button></form> : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <form action={addSlotsAction} className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-5">
              <input type="hidden" name="propertyId" value={p.id} />
              <div className="col-span-2 sm:col-span-1"><label className={labelClass} htmlFor="date">Day</label><input id="date" name="date" type="date" defaultValue={tomorrow} required className={`mt-1 ${inputClass}`} /></div>
              <div><label className={labelClass} htmlFor="time">From</label><input id="time" name="time" type="time" defaultValue="10:00" required className={`mt-1 ${inputClass}`} /></div>
              <div><label className={labelClass} htmlFor="count">Slots</label><input id="count" name="count" type="number" min={1} max={12} defaultValue={4} className={`mt-1 ${inputClass}`} /></div>
              <div><label className={labelClass} htmlFor="length">Minutes</label><input id="length" name="length" type="number" min={10} max={120} defaultValue={20} className={`mt-1 ${inputClass}`} /></div>
              <div className="flex items-end"><button className={`${subtleButtonClass} w-full`}>Open slots</button></div>
            </form>
          </section>

          <section className={panel}>
            <h2 className={h2}><span className="text-ai-500"><Sparkles className="inline h-4 w-4" /></span> Linkbot conversations <span className="text-[13px] font-normal text-slate-500">about this property</span></h2>
            {invites.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Linkbot hasn&apos;t texted anyone about {street(p.address)} yet.{open > 0 && p.status === "AVAILABLE" ? " Fill with Linkbot to start." : ""}</p>
            ) : (
              <ul className="mt-3">
                {invites.map((inv, i) => {
                  const a = invited.find((x) => x.id === inv.applicantId);
                  if (!a) return null;
                  const last = texts.find((t) => t.applicantId === a.id);
                  return (
                    <li key={inv.id} className={cn("py-3", i > 0 && "border-t border-slate-200")}>
                      <Link href={`/linkbot/texts/${a.id}`} className="flex items-start gap-3">
                        <Avatar first={a.firstName} last={a.lastName} />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <b className="text-[15px] font-medium">{a.firstName} {a.lastName}</b>
                            <span className={cn("text-xs", inv.status === "BOOKED" ? "font-medium text-emerald-700" : "text-slate-500")}>{INVITE[inv.status] ?? inv.status}</span>
                          </span>
                          {last ? <span className="mt-0.5 block truncate text-sm text-slate-500">{last.direction === "IN" ? `${a.firstName}: ` : "Linkbot: "}{last.body}</span> : null}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className={panel}>
            <h2 className={h2}>Details</h2>
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700">{p.summary || "No description yet."}</p>
            {p.features.length ? <ul className="mt-4 flex flex-wrap gap-1.5">{p.features.map((f) => <li key={f} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{f}</li>)}</ul> : null}
            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-5">
              <form action={draftAction}><input type="hidden" name="kind" value="particulars" /><input type="hidden" name="propertyId" value={p.id} /><button className={subtleButtonClass}>Draft particulars</button></form>
            </div>
            <form action={setPropertyStatusAction} className="mt-4 flex flex-wrap gap-2">
              <input type="hidden" name="propertyId" value={p.id} />
              {statuses.map((s) => (
                <button key={s} name="status" value={s} disabled={p.status === s} aria-pressed={p.status === s} className={cn(subtleButtonClass, "py-2 disabled:opacity-100", p.status === s && "border-slate-900 bg-slate-900 text-white")}>{statusLabel(s)}</button>
              ))}
            </form>
          </section>
        </div>

        <div className="space-y-4 lg:space-y-6">
          <section className={panel}>
            <h2 className={h2}>Who Linkbot would ask</h2>
            <p className="text-sm text-slate-500">Active applicants who match, best first.</p>
            {pool.ranked.length === 0 ? <p className="mt-3 text-sm text-slate-500">Nobody right now.</p> : (
              <ul className="mt-3 space-y-2.5">
                {pool.ranked.slice(0, 12).map((a) => (
                  <li key={a.id}><Link href={`/applicants/${a.id}`} className="flex items-center gap-3"><Avatar first={a.firstName} last={a.lastName} className="h-8 w-8 text-xs" /><span className="min-w-0"><span className="block text-sm font-medium">{a.firstName} {a.lastName}</span><span className="text-xs text-slate-500">up to {money(a.maxPrice, a.market)}</span></span></Link></li>
                ))}
              </ul>
            )}
            {pool.skipped.length ? <p className="mt-4 text-xs text-slate-500">Not asked: {Object.entries(pool.skipped.reduce<Record<string, number>>((m, s) => ((m[s.reason.startsWith("budget") ? "over budget" : s.reason] = (m[s.reason.startsWith("budget") ? "over budget" : s.reason] ?? 0) + 1), m), {})).map(([r, n]) => `${n} ${r}`).join("; ")}.</p> : null}
          </section>

          <section id="media" className={panel}>
            <h2 className={h2}>Photos and video</h2>
            <p className="text-sm text-slate-500">Links to where you already keep them. The first photo is the cover; the video tour plays muted on cards.</p>
            {mediaError ? <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{mediaError}</p> : null}
            <form action={setPropertyMediaAction} className="mt-4 space-y-3">
              <input type="hidden" name="propertyId" value={p.id} />
              <div><label className={labelClass} htmlFor="photos">Photo links, one per line</label><textarea id="photos" name="photos" rows={4} defaultValue={p.photos.join("\n")} placeholder="https://…/front.jpg" className={`mt-1 ${inputClass}`} /></div>
              <div><label className={labelClass} htmlFor="videoUrl">Video tour link (.mp4, .webm or .mov)</label><input id="videoUrl" name="videoUrl" type="url" defaultValue={p.videoUrl ?? ""} placeholder="https://…/tour.mp4" className={`mt-1 ${inputClass}`} /></div>
              <button className={subtleButtonClass}>Save</button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

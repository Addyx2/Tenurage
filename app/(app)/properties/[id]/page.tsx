import Link from "next/link";
import { notFound } from "next/navigation";

import { PageTitle } from "@/components/PageTitle";
import { Badge, Card, buttonClass, inputClass, labelClass, subtleButtonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { candidates, slotLabel } from "@/lib/linkbot/campaign";
import { money } from "@/lib/matching";
import { STATUS_TONE, statusLabel } from "@/lib/status";

import { draftAction } from "../../docs/actions";
import { fillViewingsAction, stopFillingAction } from "../../linkbot/actions";
import { addSlotsAction, removeSlotAction, setPropertyStatusAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function PropertyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; filling?: string; slots?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { error, filling, slots } = await searchParams;
  const p = await prisma.property.findFirst({ where: { id, agencyId: user.agencyId }, include: { viewings: { where: { startAt: { gte: new Date(Date.now() - 7 * 86_400_000) } }, include: { applicant: true }, orderBy: { startAt: "asc" } } } });
  if (!p) notFound();
  const [campaign, pool] = await Promise.all([prisma.viewingCampaign.findFirst({ where: { propertyId: p.id, status: "RUNNING" } }), candidates(user.agencyId, p.id)]);
  const upcoming = p.viewings.filter((v) => v.startAt > new Date());
  const open = upcoming.filter((v) => v.status === "OPEN").length;
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  return (
    <>
      <PageTitle
        title={p.address}
        description={`${p.postcode} · ${p.bedrooms}-bed ${p.kind} · ${money(p.price, p.market)} · ${p.market === "SALE" ? "for sale" : "to let"}`}
        actions={
          <>
            <Badge tone={STATUS_TONE[p.status] ?? "slate"}>{statusLabel(p.status)}</Badge>
            <form action={draftAction}><input type="hidden" name="kind" value="particulars" /><input type="hidden" name="propertyId" value={p.id} /><button className={subtleButtonClass}>Draft particulars</button></form>
          </>
        }
      />
      {error ? <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {filling ? <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Linkbot is on it: {filling} applicant{filling === "1" ? "" : "s"} invited.</p> : null}
      {slots ? <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{slots} slot{slots === "1" ? "" : "s"} opened.</p> : null}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Viewings</h2>
                <p className="text-xs text-slate-500">{open} open, {upcoming.length - open} booked ahead</p>
              </div>
              {campaign ? (
                <form action={stopFillingAction}><input type="hidden" name="campaignId" value={campaign.id} /><input type="hidden" name="back" value={`/properties/${p.id}`} /><button className={subtleButtonClass}>Stop Linkbot</button></form>
              ) : p.status === "AVAILABLE" && open > 0 ? (
                <form action={fillViewingsAction}><input type="hidden" name="propertyId" value={p.id} /><button className={buttonClass}>Fill with Linkbot</button></form>
              ) : null}
            </div>
            {campaign ? <p className="mt-2 text-sm text-brand-800">Linkbot is texting matched applicants: wave {campaign.wave}, {campaign.invited} invited.</p> : null}
            <ul className="mt-3 divide-y divide-slate-100">
              {p.viewings.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="tabular">{slotLabel(v.startAt)}</span>
                  <span className="flex-1 text-slate-600">{v.applicant ? <Link href={`/applicants/${v.applicant.id}`} className="hover:text-brand-700">{v.applicant.firstName} {v.applicant.lastName}</Link> : "Free"}{v.bookedVia === "linkbot" ? " · by Linkbot" : ""}{v.interest ? ` · interest ${v.interest}/5` : ""}</span>
                  <span className="flex items-center gap-2">
                    <Badge tone={v.status === "BOOKED" ? "green" : v.status === "OPEN" ? "slate" : "blue"}>{v.status.toLowerCase().replace("_", " ")}</Badge>
                    {v.status === "OPEN" ? <form action={removeSlotAction}><input type="hidden" name="viewingId" value={v.id} /><button className="text-xs text-slate-400 hover:text-red-600">Remove</button></form> : null}
                  </span>
                </li>
              ))}
            </ul>
            <form action={addSlotsAction} className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-5">
              <input type="hidden" name="propertyId" value={p.id} />
              <div><label className={labelClass} htmlFor="date">Day</label><input id="date" name="date" type="date" defaultValue={tomorrow} required className={`mt-1 ${inputClass}`} /></div>
              <div><label className={labelClass} htmlFor="time">From</label><input id="time" name="time" type="time" defaultValue="10:00" required className={`mt-1 ${inputClass}`} /></div>
              <div><label className={labelClass} htmlFor="count">Slots</label><input id="count" name="count" type="number" min={1} max={12} defaultValue={4} className={`mt-1 ${inputClass}`} /></div>
              <div><label className={labelClass} htmlFor="length">Minutes</label><input id="length" name="length" type="number" min={10} max={120} defaultValue={20} className={`mt-1 ${inputClass}`} /></div>
              <div className="flex items-end"><button className={`${subtleButtonClass} w-full`}>Open slots</button></div>
            </form>
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Details</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{p.summary || "No summary yet."}</p>
            {p.features.length ? <ul className="mt-3 flex flex-wrap gap-1.5">{p.features.map((f) => <li key={f} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">{f}</li>)}</ul> : null}
            <form action={setPropertyStatusAction} className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <input type="hidden" name="propertyId" value={p.id} />
              {(p.market === "SALE" ? ["AVAILABLE", "UNDER_OFFER", "SOLD", "WITHDRAWN"] : ["AVAILABLE", "LET_AGREED", "LET", "WITHDRAWN"]).map((s) => (
                <button key={s} name="status" value={s} disabled={p.status === s} className={`${subtleButtonClass} disabled:opacity-40`}>{statusLabel(s)}</button>
              ))}
            </form>
          </Card>
        </div>
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900">Who Linkbot would ask</h2>
          <p className="text-xs text-slate-500">Active applicants who match, best first.</p>
          {pool.ranked.length === 0 ? <p className="mt-3 text-sm text-slate-500">Nobody right now.</p> : (
            <ul className="mt-3 space-y-1.5 text-sm">{pool.ranked.slice(0, 12).map((a) => <li key={a.id}><Link href={`/applicants/${a.id}`} className="text-slate-900 hover:text-brand-700">{a.firstName} {a.lastName}</Link> <span className="text-xs text-slate-500">up to {money(a.maxPrice, a.market)}</span></li>)}</ul>
          )}
          {pool.skipped.length ? <p className="mt-3 text-xs text-slate-500">Not asked: {Object.entries(pool.skipped.reduce<Record<string, number>>((m, s) => ((m[s.reason.startsWith("budget") ? "over budget" : s.reason] = (m[s.reason.startsWith("budget") ? "over budget" : s.reason] ?? 0) + 1), m), {})).map(([r, n]) => `${n} ${r}`).join("; ")}.</p> : null}
        </Card>
      </div>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";

import { PageTitle } from "@/components/PageTitle";
import { Badge, Card, subtleButtonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { displayPhone } from "@/lib/integrations/phone";
import { mismatch, money } from "@/lib/matching";

import { setApplicantStatusAction } from "../actions";

export const dynamic = "force-dynamic";
const when = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function ApplicantPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const a = await prisma.applicant.findFirst({ where: { id, agencyId: user.agencyId }, include: { viewings: { include: { property: true }, orderBy: { startAt: "desc" } } } });
  if (!a) notFound();
  const available = await prisma.property.findMany({ where: { agencyId: user.agencyId, status: "AVAILABLE", market: a.market } });
  const suits = available.filter((p) => mismatch(p, a) === null);
  const texts = await prisma.smsMessage.findMany({ where: { agencyId: user.agencyId, applicantId: a.id }, orderBy: { createdAt: "desc" }, take: 8 });
  return (
    <>
      <PageTitle
        title={`${a.firstName} ${a.lastName}`}
        description={`${a.market === "SALE" ? "Buying" : "Renting"} · ${a.minBedrooms}+ beds · up to ${money(a.maxPrice, a.market)} · ${a.areas.join(", ") || "anywhere"}`}
        actions={
          <form action={setApplicantStatusAction} className="flex gap-2">
            <input type="hidden" name="applicantId" value={a.id} />
            {a.status !== "ACTIVE" ? <button name="status" value="ACTIVE" className={subtleButtonClass}>Make active</button> : <button name="status" value="PAUSED" className={subtleButtonClass}>Pause</button>}
            <button name="status" value="ARCHIVED" className={subtleButtonClass}>Archive</button>
          </form>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900">Contact</h2>
          <p className="mt-2 text-sm text-slate-700">{a.phone ? displayPhone(a.phone) : "No mobile"}</p>
          <p className="text-sm text-slate-700">{a.email ?? "No email"}</p>
          {a.smsOptOutAt ? <Badge tone="slate" className="mt-2">Texted STOP</Badge> : null}
          {a.notes ? <p className="mt-3 text-sm text-slate-500">{a.notes}</p> : null}
        </Card>
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Available properties that suit them</h2>
          {suits.length === 0 ? <p className="mt-2 text-sm text-slate-500">None right now.</p> : (
            <ul className="mt-2 divide-y divide-slate-100">{suits.map((p) => <li key={p.id} className="flex justify-between py-2 text-sm"><Link href={`/properties/${p.id}`} className="text-slate-900 hover:text-brand-700">{p.address}</Link><span className="tabular text-slate-600">{money(p.price, p.market)} · {p.bedrooms} bed</span></li>)}</ul>
          )}
        </Card>
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Viewings</h2>
          {a.viewings.length === 0 ? <p className="mt-2 text-sm text-slate-500">None yet.</p> : (
            <ul className="mt-2 divide-y divide-slate-100">{a.viewings.map((v) => <li key={v.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span>{when.format(v.startAt)} · <Link href={`/properties/${v.propertyId}`} className="hover:text-brand-700">{v.property.address}</Link></span><span className="text-slate-500">{v.status.toLowerCase().replace("_", " ")}{v.interest ? ` · interest ${v.interest}/5` : ""}</span></li>)}</ul>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900">Latest texts</h2>
          {texts.length === 0 ? <p className="mt-2 text-sm text-slate-500">None yet.</p> : <ul className="mt-2 space-y-1.5 text-sm">{texts.map((t) => <li key={t.id} className={t.direction === "IN" ? "text-slate-900" : "text-slate-500"}>{t.direction === "IN" ? "→ " : "← "}{t.body.slice(0, 120)}</li>)}</ul>}
          <Link href={`/linkbot/texts/${a.id}`} className="mt-3 inline-block text-sm font-medium text-brand-700">Open conversation</Link>
        </Card>
      </div>
    </>
  );
}

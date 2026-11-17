import Link from "next/link";
import { CalendarClock } from "lucide-react";

import { PropertyMedia } from "@/components/media";
import { PageTitle } from "@/components/PageTitle";
import { ContactButtons } from "@/components/people";
import { street } from "@/components/PropertyCard";
import { Badge, EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { directionsUrl } from "@/lib/media";

import { markViewingAction } from "./actions";

export const metadata = { title: "Viewings" };
export const dynamic = "force-dynamic";

const TZ = "Europe/London";
const day = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const hm = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const pill = "rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50";

export default async function ViewingsPage() {
  const user = await requireUser();
  const since = new Date(Date.now() - 2 * 86_400_000);
  const viewings = await prisma.viewing.findMany({ where: { agencyId: user.agencyId, status: { not: "OPEN" }, startAt: { gte: since } }, include: { property: true, applicant: true }, orderBy: { startAt: "asc" }, take: 200 });
  const now = new Date();
  const days = new Map<string, typeof viewings>();
  for (const v of viewings) days.set(day.format(v.startAt), [...(days.get(day.format(v.startAt)) ?? []), v]);
  return (
    <>
      <PageTitle title="Viewings." subtitle="From two days ago onwards." description="Mark how each one went; Linkbot asks for feedback after." />
      {viewings.length === 0 ? <EmptyState icon={CalendarClock} title="No viewings booked" description="Open slots on a property and let Linkbot fill them." /> : (
        <div className="space-y-8">
          {[...days].map(([label, list]) => (
            <section key={label}>
              <h2 className="mb-3 text-sm font-semibold">{label} <span className="font-normal text-slate-500">{list.length}</span></h2>
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {list.map((v) => (
                  <li key={v.id} className="flex gap-3 rounded-card border border-line bg-white p-3">
                    <PropertyMedia property={v.property} video={false} label={false} className="aspect-square w-20 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline justify-between gap-2">
                        <span className="tabular text-lg font-medium tracking-[-0.02em]">{hm.format(v.startAt)}</span>
                        {v.status === "BOOKED" && v.endAt >= now ? <Badge tone="green">Booked</Badge> : v.status !== "BOOKED" ? <Badge tone={v.status === "DONE" ? "neutral" : "slate"}>{v.status === "DONE" ? "Happened" : v.status === "NO_SHOW" ? "No-show" : v.status.toLowerCase()}</Badge> : null}
                      </p>
                      <Link href={`/properties/${v.propertyId}`} className="block truncate text-sm font-medium hover:underline">{street(v.property.address)}</Link>
                      <p className="truncate text-sm text-slate-500">
                        {v.applicant ? <Link href={`/applicants/${v.applicant.id}`} className="hover:text-slate-900">{v.applicant.firstName} {v.applicant.lastName}</Link> : "—"}
                        {v.bookedVia === "linkbot" ? <span className="text-ai-600"> · by Linkbot</span> : null}
                      </p>
                      {v.interest || v.feedback ? <p className="mt-1 text-sm text-slate-600">{v.interest ? `${v.interest}/5` : ""}{v.feedback ? <span className="font-serif text-base"> “{v.feedback.slice(0, 80)}”</span> : null}</p> : null}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {v.status === "BOOKED" && v.endAt < now ? (
                          <form action={markViewingAction} className="flex gap-1.5"><input type="hidden" name="viewingId" value={v.id} /><button name="status" value="DONE" className={pill}>Happened</button><button name="status" value="NO_SHOW" className={pill}>No-show</button></form>
                        ) : v.status === "BOOKED" ? (
                          <>
                            <ContactButtons compact phone={v.applicant?.phone ?? null} name={v.applicant?.firstName ?? "applicant"} directions={directionsUrl(v.property.address, v.property.postcode)} />
                            <form action={markViewingAction} className="ml-auto"><input type="hidden" name="viewingId" value={v.id} /><button name="status" value="CANCELLED" className="text-xs text-slate-500 hover:text-red-600">Cancel</button></form>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

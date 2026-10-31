import Link from "next/link";
import { CalendarClock } from "lucide-react";

import { PageTitle } from "@/components/PageTitle";
import { Badge, Card, EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slotLabel } from "@/lib/linkbot/campaign";

import { markViewingAction } from "./actions";

export const metadata = { title: "Viewings" };
export const dynamic = "force-dynamic";

export default async function ViewingsPage() {
  const user = await requireUser();
  const since = new Date(Date.now() - 2 * 86_400_000);
  const viewings = await prisma.viewing.findMany({ where: { agencyId: user.agencyId, status: { not: "OPEN" }, startAt: { gte: since } }, include: { property: true, applicant: true }, orderBy: { startAt: "asc" }, take: 200 });
  const now = new Date();
  return (
    <>
      <PageTitle title="Viewings" description="Booked viewings from the last two days onwards. Mark how each went." />
      {viewings.length === 0 ? <EmptyState icon={CalendarClock} title="No viewings booked" description="Open slots on a property and let Linkbot fill them." /> : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead><tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500"><th className="px-4 py-3">When</th><th className="px-4 py-3">Property</th><th className="px-4 py-3">Applicant</th><th className="px-4 py-3">Feedback</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {viewings.map((v) => (
                <tr key={v.id} className="align-top">
                  <td className="tabular px-4 py-3">{slotLabel(v.startAt)}</td>
                  <td className="px-4 py-3"><Link href={`/properties/${v.propertyId}`} className="hover:text-brand-700">{v.property.address}</Link></td>
                  <td className="px-4 py-3">{v.applicant ? <Link href={`/applicants/${v.applicant.id}`} className="hover:text-brand-700">{v.applicant.firstName} {v.applicant.lastName}</Link> : "—"}{v.bookedVia === "linkbot" ? <span className="block text-xs text-slate-400">booked by Linkbot</span> : null}</td>
                  <td className="px-4 py-3 text-slate-600">{v.interest ? `${v.interest}/5` : "—"}{v.feedback ? <span className="block text-xs text-slate-500">{v.feedback.slice(0, 80)}</span> : null}</td>
                  <td className="px-4 py-3">
                    {v.status === "BOOKED" && v.endAt < now ? (
                      <form action={markViewingAction} className="flex gap-1.5"><input type="hidden" name="viewingId" value={v.id} /><button name="status" value="DONE" className="rounded-md border px-2 py-1 text-xs">Happened</button><button name="status" value="NO_SHOW" className="rounded-md border px-2 py-1 text-xs">No-show</button></form>
                    ) : v.status === "BOOKED" ? (
                      <form action={markViewingAction} className="flex items-center gap-2"><Badge tone="green">Booked</Badge><input type="hidden" name="viewingId" value={v.id} /><button name="status" value="CANCELLED" className="text-xs text-slate-400 hover:text-red-600">Cancel</button></form>
                    ) : <Badge tone={v.status === "DONE" ? "blue" : "slate"}>{v.status.toLowerCase().replace("_", " ")}</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}

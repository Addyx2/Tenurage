import Link from "next/link";
import { Plus, Users } from "lucide-react";

import { PageTitle } from "@/components/PageTitle";
import { Badge, Card, EmptyState, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { displayPhone } from "@/lib/integrations/phone";
import { money } from "@/lib/matching";

export const metadata = { title: "Applicants" };
export const dynamic = "force-dynamic";

export default async function ApplicantsPage() {
  const user = await requireUser();
  const applicants = await prisma.applicant.findMany({
    where: { agencyId: user.agencyId, status: { not: "ARCHIVED" } },
    include: { _count: { select: { viewings: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <PageTitle title="Applicants" description="People looking to buy or rent, and what they want." actions={<Link href="/applicants/new" className={buttonClass}><Plus className="h-4 w-4" /> Add an applicant</Link>} />
      {applicants.length === 0 ? (
        <EmptyState icon={Users} title="No applicants yet" description="Add one, or connect Reapit to bring yours in." action={<Link href="/applicants/new" className={buttonClass}>Add an applicant</Link>} />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500"><th className="px-4 py-3">Applicant</th><th className="px-4 py-3">Wants</th><th className="px-4 py-3">Areas</th><th className="px-4 py-3">Viewings</th><th className="px-4 py-3">Texts</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {applicants.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><Link href={`/applicants/${a.id}`} className="font-medium text-slate-900 hover:text-brand-700">{a.firstName} {a.lastName}</Link><p className="text-xs text-slate-500">{a.phone ? displayPhone(a.phone) : a.email}</p></td>
                  <td className="px-4 py-3">{a.market === "SALE" ? "Buy" : "Rent"}, {a.minBedrooms}+ beds, up to {money(a.maxPrice, a.market)}</td>
                  <td className="px-4 py-3 text-slate-600">{a.areas.join(", ") || "Anywhere"}</td>
                  <td className="px-4 py-3">{a._count.viewings}</td>
                  <td className="px-4 py-3">{a.status === "PAUSED" ? <Badge tone="slate">Paused</Badge> : a.smsOptOutAt ? <Badge tone="slate">Texted STOP</Badge> : a.phone ? <Badge tone="green">On</Badge> : <Badge tone="slate">No mobile</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}

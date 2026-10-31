import Link from "next/link";
import { Home, Plus } from "lucide-react";

import { PageTitle } from "@/components/PageTitle";
import { Badge, Card, EmptyState, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { money } from "@/lib/matching";
import { STATUS_TONE, statusLabel } from "@/lib/status";
import { cn } from "@/lib/utils";

export const metadata = { title: "Properties" };
export const dynamic = "force-dynamic";


export default async function PropertiesPage({ searchParams }: { searchParams: Promise<{ market?: string }> }) {
  const user = await requireUser();
  const { market } = await searchParams;
  const now = new Date();
  const properties = await prisma.property.findMany({
    where: { agencyId: user.agencyId, ...(market === "SALE" || market === "LET" ? { market } : {}) },
    include: { viewings: { where: { startAt: { gte: now } }, select: { status: true } } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
  return (
    <>
      <PageTitle
        title="Properties"
        description="What's on your books, for sale and to let."
        actions={<Link href="/properties/new" className={buttonClass}><Plus className="h-4 w-4" /> Add a property</Link>}
      />
      <div className="mb-4 flex gap-1.5">
        {[["", "All"], ["SALE", "For sale"], ["LET", "To let"]].map(([v, l]) => (
          <Link key={v} href={v ? `/properties?market=${v}` : "/properties"} className={cn("rounded-full border px-3 py-1 text-sm", (market ?? "") === v ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600")}>{l}</Link>
        ))}
      </div>
      {properties.length === 0 ? (
        <EmptyState icon={Home} title="No properties yet" description="Add one, or connect Reapit under Integrations to bring in your listings." action={<Link href="/properties/new" className={buttonClass}>Add a property</Link>} />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500"><th className="px-4 py-3">Property</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Beds</th><th className="px-4 py-3">Viewings ahead</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {properties.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><Link href={`/properties/${p.id}`} className="font-medium text-slate-900 hover:text-brand-700">{p.address}</Link><p className="text-xs text-slate-500">{p.postcode} · {p.market === "SALE" ? "For sale" : "To let"}{p.reapitId ? " · from Reapit" : ""}</p></td>
                  <td className="tabular px-4 py-3">{money(p.price, p.market)}</td>
                  <td className="px-4 py-3">{p.bedrooms}</td>
                  <td className="px-4 py-3 text-slate-600">{p.viewings.filter((v) => v.status === "BOOKED").length} booked · {p.viewings.filter((v) => v.status === "OPEN").length} open</td>
                  <td className="px-4 py-3"><Badge tone={STATUS_TONE[p.status] ?? "slate"}>{statusLabel(p.status)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}

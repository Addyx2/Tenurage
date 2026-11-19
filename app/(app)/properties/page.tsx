import Link from "next/link";
import { Home, Plus } from "lucide-react";

import { PageTitle } from "@/components/PageTitle";
import { PropertyCard } from "@/components/PropertyCard";
import { EmptyState, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";

import { fillViewingsAction } from "../linkbot/actions";

export const metadata = { title: "Properties" };
export const dynamic = "force-dynamic";

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<{ market?: string }> }) {
  const user = await requireUser();
  const { market } = await searchParams;
  const now = new Date();
  const properties = await prisma.property.findMany({
    where: { agencyId: user.agencyId, ...(market === "SALE" || market === "LET" ? { market } : {}) },
    include: { viewings: { where: { startAt: { gte: now } }, select: { status: true } }, campaigns: { where: { status: "RUNNING" }, select: { id: true } } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
  const available = properties.filter((p) => p.status === "AVAILABLE").length;
  return (
    <>
      <PageTitle
        title="Properties."
        subtitle={`${available} available${properties.length > available ? `, ${properties.length - available} more on the books` : ""}.`}
        actions={<Link href="/properties/new" className={buttonClass}><Plus className="h-4 w-4" /> Add a property</Link>}
      />
      <div className="mb-5 flex gap-1.5">
        {[["", "All"], ["SALE", "For sale"], ["LET", "To let"]].map(([v, l]) => (
          <Link key={v} href={v ? `/properties?market=${v}` : "/properties"} aria-current={(market ?? "") === v ? "page" : undefined} className={cn("rounded-full px-3.5 py-1.5 text-sm", (market ?? "") === v ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:text-slate-900")}>{l}</Link>
        ))}
      </div>
      {properties.length === 0 ? (
        <EmptyState icon={Home} title="No properties yet" description="Add one, or connect Reapit under Integrations to bring in your listings." action={<Link href="/properties/new" className={buttonClass}>Add a property</Link>} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {properties.map((p) => (
            <PropertyCard key={p.id} p={p} booked={p.viewings.filter((v) => v.status === "BOOKED").length} open={p.viewings.filter((v) => v.status === "OPEN").length} filling={p.campaigns.length > 0} fillAction={fillViewingsAction} />
          ))}
        </div>
      )}
    </>
  );
}

import Link from "next/link";
import { Plus, Users } from "lucide-react";

import { PageTitle } from "@/components/PageTitle";
import { Avatar, ContactButtons } from "@/components/people";
import { street } from "@/components/PropertyCard";
import { EmptyState, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { money } from "@/lib/matching";
import { STAGES, STAGE_TITLES, stageOf, type Stage } from "@/lib/pipeline";
import { cn } from "@/lib/utils";

export const metadata = { title: "Applicants" };
export const dynamic = "force-dynamic";

const slot = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", hour: "2-digit", minute: "2-digit" });

export default async function ApplicantsPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const user = await requireUser();
  const { stage: only } = await searchParams;
  const now = new Date();
  const applicants = await prisma.applicant.findMany({
    where: { agencyId: user.agencyId, status: { not: "ARCHIVED" } },
    include: { viewings: { where: { status: { in: ["BOOKED", "DONE", "NO_SHOW"] } }, include: { property: true }, orderBy: { startAt: "desc" } } },
    orderBy: { updatedAt: "desc" },
  });
  const columns = new Map<Stage, typeof applicants>(STAGES.map((s) => [s, []]));
  for (const a of applicants) columns.get(stageOf(a, now))!.push(a);
  const shown = STAGES.filter((s) => !only || only === s);

  return (
    <>
      <PageTitle
        title="Applicants."
        subtitle={`${applicants.length} looking, ${columns.get("BOOKED")!.length} with a viewing booked.`}
        actions={<Link href="/applicants/new" className={buttonClass}><Plus className="h-4 w-4" /> Add an applicant</Link>}
      />
      {applicants.length === 0 ? (
        <EmptyState icon={Users} title="No applicants yet" description="Add one, or connect Reapit to bring yours in." action={<Link href="/applicants/new" className={buttonClass}>Add an applicant</Link>} />
      ) : (
        <>
          {/* Phones: one stage at a time. */}
          <nav aria-label="Stages" className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:hidden">
            <Link href="/applicants" className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-sm", !only ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600")}>All</Link>
            {STAGES.map((s) => (
              <Link key={s} href={`/applicants?stage=${s}`} className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-sm", only === s ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600")}>
                {STAGE_TITLES[s]} <span className="opacity-60">{columns.get(s)!.length}</span>
              </Link>
            ))}
          </nav>
          <div className="grid gap-6 lg:grid-cols-5 lg:gap-4">
            {shown.map((s) => (
              <section key={s} aria-label={STAGE_TITLES[s]} className={cn("min-w-0", only && "lg:col-span-5")}>
                <h2 className="mb-3 flex items-baseline gap-2 text-sm font-semibold">{STAGE_TITLES[s]} <span className="font-normal text-slate-500">{columns.get(s)!.length}</span></h2>
                <ul className={cn("space-y-3", only && "lg:grid lg:grid-cols-3 lg:gap-3 lg:space-y-0")}>
                  {columns.get(s)!.length === 0 ? <li className="rounded-card border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">Nobody</li> : null}
                  {columns.get(s)!.map((a) => {
                    const upcoming = a.viewings.filter((v) => v.status === "BOOKED" && v.startAt > now).at(-1);
                    const rated = a.viewings.find((v) => v.interest || v.feedback);
                    return (
                      <li key={a.id} className="relative rounded-card border border-line bg-white p-4 transition hover:shadow-card-hover">
                        <div className="flex items-start gap-3">
                          <Avatar first={a.firstName} last={a.lastName} />
                          <div className="min-w-0 flex-1">
                            <Link href={`/applicants/${a.id}`} className="block truncate text-[15px] font-medium after:absolute after:inset-0">{a.firstName} {a.lastName}</Link>
                            <p className="text-xs text-slate-500">{a.market === "SALE" ? "Buy" : "Rent"} · {a.minBedrooms}+ bed · {money(a.maxPrice, a.market)}</p>
                          </div>
                        </div>
                        {upcoming ? <p className="mt-3 text-sm"><span className="tabular font-medium">{slot.format(upcoming.startAt)}</span> <span className="text-slate-500">· {street(upcoming.property.address)}</span></p> : null}
                        {rated ? (
                          <div className="mt-3">
                            {rated.interest ? <p className="flex items-center gap-1.5 text-xs text-slate-500"><span className="flex gap-0.5" aria-label={`Interest ${rated.interest} out of 5`}>{[1, 2, 3, 4, 5].map((n) => <span key={n} className={cn("h-1.5 w-3 rounded-full", n <= rated.interest! ? "bg-slate-900" : "bg-slate-200")} />)}</span> {street(rated.property.address)}</p> : null}
                            {rated.feedback ? <p className="mt-1.5 line-clamp-2 font-serif text-[17px] leading-snug">“{rated.feedback}”</p> : null}
                          </div>
                        ) : null}
                        <div className="relative z-10 mt-3 flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-slate-500">{a.status === "PAUSED" ? "Paused" : a.smsOptOutAt ? "Texted STOP" : !a.phone ? "No mobile" : a.areas.join(", ") || "Anywhere"}</span>
                          <ContactButtons compact phone={a.phone} name={`${a.firstName} ${a.lastName}`} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}

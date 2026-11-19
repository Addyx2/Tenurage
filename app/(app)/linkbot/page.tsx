import Link from "next/link";
import { MessageSquareText } from "lucide-react";

import { Badge, Card, EmptyState, buttonClass, subtleButtonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slotLabel } from "@/lib/linkbot/campaign";
import { smsSender } from "@/lib/linkbot/sms";

import { stopFillingAction } from "./actions";

export const metadata = { title: "Linkbot" };
export const dynamic = "force-dynamic";

const OUTCOME: Record<string, { label: string; tone: "green" | "amber" | "slate" | "red" }> = {
  filled: { label: "All slots booked", tone: "green" },
  exhausted: { label: "Nobody left to ask", tone: "amber" },
  expired: { label: "Slots passed", tone: "slate" },
  stopped: { label: "Stopped", tone: "slate" },
};

export default async function LinkbotPage() {
  const user = await requireUser();
  const [bot, sender, running, recent, jobs] = await Promise.all([
    prisma.linkbot.findUnique({ where: { agencyId: user.agencyId } }),
    smsSender(user.agencyId),
    prisma.viewingCampaign.findMany({ where: { agencyId: user.agencyId, status: "RUNNING" }, include: { property: { include: { viewings: { where: { startAt: { gt: new Date() } }, include: { applicant: true }, orderBy: { startAt: "asc" } } } }, invites: true }, orderBy: { createdAt: "desc" } }),
    prisma.viewingCampaign.findMany({ where: { agencyId: user.agencyId, status: { not: "RUNNING" } }, include: { property: true, invites: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.linkbotAction.findMany({ where: { agencyId: user.agencyId }, include: { user: { select: { firstName: true } } }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  return (
    <div className="space-y-6">
      {!bot ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-ai-200 bg-ai-50/60 p-4">
          <p className="text-sm text-ai-700"><span className="font-semibold">Create your agency&apos;s Linkbot</span> to text applicants from a number of its own. It takes a minute.</p>
          <Link href="/linkbot/settings" className={buttonClass}>Create it</Link>
        </Card>
      ) : !sender ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50/60 p-4">
          <p className="text-sm text-amber-900"><span className="font-semibold">{bot.enabled ? `${bot.name} can't text yet.` : `${bot.name}'s texting is off.`}</span></p>
          <Link href="/linkbot/settings" className={subtleButtonClass}>Settings</Link>
        </Card>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Filling viewings now</h2>
        {running.length === 0 ? (
          <EmptyState icon={MessageSquareText} title="Nothing being filled" description="Open viewing slots on a property, then press Fill with Linkbot." />
        ) : (
          <div className="space-y-3">
            {running.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/properties/${c.propertyId}`} className="font-semibold text-slate-900 hover:text-brand-700">{c.property.address}</Link>
                    <p className="text-xs text-slate-500">Wave {c.wave} · {c.invited} invited · {c.invites.filter((i) => i.status === "BOOKED").length} booked · {c.invites.filter((i) => i.status === "DECLINED").length} said no</p>
                  </div>
                  <form action={stopFillingAction}><input type="hidden" name="campaignId" value={c.id} /><button className={subtleButtonClass}>Stop</button></form>
                </div>
                <ul className="mt-3 flex flex-wrap gap-2 text-xs">
                  {c.property.viewings.map((v) => (
                    <li key={v.id} className={v.status === "BOOKED" ? "rounded-full bg-ai-50 px-2.5 py-1 text-ai-700" : "rounded-full bg-slate-100 px-2.5 py-1 text-slate-600"}>
                      {slotLabel(v.startAt)} · {v.applicant ? `${v.applicant.firstName} ${v.applicant.lastName}` : "free"}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </section>

      {jobs.length ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Jobs from the office by text</h2>
          <Card className="divide-y divide-slate-100">
            {jobs.map((j) => (
              <div key={j.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span>{j.user.firstName}: {j.summary}{j.result ? <span className="block text-xs text-slate-500">{j.result}</span> : null}</span>
                <Badge tone={j.status === "done" ? "green" : j.status === "pending" ? "amber" : "slate"}>{{ pending: "Waiting for YES", done: "Done", cancelled: "Said no", expired: "Expired", failed: "Failed" }[j.status] ?? j.status}</Badge>
              </div>
            ))}
          </Card>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Recently</h2>
        {recent.length === 0 ? <p className="text-sm text-slate-500">Nothing yet.</p> : (
          <Card className="divide-y divide-slate-100">
            {recent.map((c) => {
              const o = OUTCOME[c.outcome ?? ""] ?? { label: c.status, tone: "slate" as const };
              return (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                  <span><Link href={`/properties/${c.propertyId}`} className="font-medium text-slate-900 hover:text-brand-700">{c.property.address}</Link><span className="block text-xs text-slate-500">{c.invited} invited · {c.invites.filter((i) => i.status === "BOOKED").length} booked</span></span>
                  <Badge tone={o.tone}>{o.label}</Badge>
                </div>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}

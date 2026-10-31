import Link from "next/link";
import { MessageSquareText } from "lucide-react";

import { Badge, Card, EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata = { title: "Linkbot texts" };
export const dynamic = "force-dynamic";
const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function TextsPage() {
  const user = await requireUser();
  const latest = await prisma.smsMessage.findMany({ where: { agencyId: user.agencyId, applicantId: { not: null } }, distinct: ["applicantId"], orderBy: { createdAt: "desc" }, take: 60, include: { applicant: true } });
  const office = await prisma.smsMessage.findMany({ where: { agencyId: user.agencyId, userId: { not: null } }, distinct: ["userId"], orderBy: { createdAt: "desc" }, take: 20 });
  const users = await prisma.user.findMany({ where: { id: { in: office.map((m) => m.userId!) } }, select: { id: true, firstName: true, lastName: true } });
  if (latest.length === 0 && office.length === 0) return <EmptyState icon={MessageSquareText} title="No texts yet" description="Invitations, replies and Linkbot's answers appear here, one conversation per person." />;
  return (
    <div className="space-y-6">
      {office.length ? (
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-slate-900">From the office</h2>
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {office.map((m) => {
              const u = users.find((x) => x.id === m.userId);
              return <li key={m.id} className="flex justify-between gap-4 py-2"><span className="min-w-0"><span className="font-medium">{u?.firstName} {u?.lastName}</span><span className="block truncate text-slate-500">{m.direction === "IN" ? "" : "Linkbot: "}{m.body}</span></span><span className="shrink-0 text-xs text-slate-400">{fmt.format(m.createdAt)}</span></li>;
            })}
          </ul>
        </Card>
      ) : null}
      <Card className="divide-y divide-slate-100">
        {latest.map((m) => (
          <Link key={m.id} href={`/linkbot/texts/${m.applicantId}`} className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-slate-50">
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">{m.applicant?.firstName} {m.applicant?.lastName}{m.applicant?.smsOptOutAt ? <Badge tone="slate">Texted STOP</Badge> : null}</span>
              <span className="block truncate text-sm text-slate-500">{m.direction === "IN" ? "" : "Linkbot: "}{m.body}</span>
            </span>
            <span className="shrink-0 text-xs text-slate-400">{fmt.format(m.createdAt)}</span>
          </Link>
        ))}
      </Card>
    </div>
  );
}

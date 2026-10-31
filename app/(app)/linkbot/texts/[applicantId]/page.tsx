import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Card, buttonClass, inputClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";

import { textApplicantAction } from "../../actions";

export const dynamic = "force-dynamic";
const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function ConversationPage({ params, searchParams }: { params: Promise<{ applicantId: string }>; searchParams: Promise<{ error?: string; sent?: string }> }) {
  const user = await requireUser();
  const { applicantId } = await params;
  const { error, sent } = await searchParams;
  const a = await prisma.applicant.findFirst({ where: { id: applicantId, agencyId: user.agencyId } });
  if (!a) notFound();
  const texts = await prisma.smsMessage.findMany({ where: { agencyId: user.agencyId, applicantId }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div className="space-y-4">
      <Link href="/linkbot/texts" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" /> All texts</Link>
      <h2 className="font-display text-lg font-bold text-slate-900"><Link href={`/applicants/${a.id}`} className="hover:text-brand-700">{a.firstName} {a.lastName}</Link></h2>
      <Card className="space-y-2 p-4">
        {texts.length === 0 ? <p className="text-sm text-slate-500">No texts yet.</p> : null}
        {[...texts].reverse().map((t) => (
          <div key={t.id} className={cn("flex", t.direction === "IN" ? "justify-start" : "justify-end")}>
            <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm", t.direction === "IN" ? "bg-slate-100 text-slate-900" : "bg-brand-700 text-white", t.status === "FAILED" && "bg-red-100 text-red-800")}>
              <p className="whitespace-pre-wrap">{t.body}</p>
              <p className={cn("mt-1 text-[10px]", t.direction === "IN" ? "text-slate-400" : "text-white/70")}>{fmt.format(t.createdAt)}{t.status === "FAILED" ? " · not sent" : ""}</p>
            </div>
          </div>
        ))}
      </Card>
      <form action={textApplicantAction} className="space-y-2">
        <input type="hidden" name="applicantId" value={a.id} />
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        {sent ? <p role="status" className="text-sm text-emerald-700">Sent.</p> : null}
        <textarea name="body" rows={2} maxLength={600} placeholder={`Text ${a.firstName} from the office…`} className={inputClass} disabled={!!a.smsOptOutAt} />
        <button type="submit" className={buttonClass} disabled={!!a.smsOptOutAt}>Send text</button>
      </form>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Badge, Card } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

import { saveDocAction, saveFinalDocAction } from "../actions";

export const metadata = { title: "Document" };
export const dynamic = "force-dynamic";

export default async function DocPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { saved } = await searchParams;
  const doc = await prisma.document.findFirst({ where: { id, agencyId: user.agencyId }, include: { property: { select: { id: true, address: true } } } });
  if (!doc) notFound();
  const gaps = (doc.body.match(/\[add[^\]]*\]/g) ?? []).length;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/docs" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700"><ArrowLeft className="h-4 w-4" /> Docs</Link>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={doc.status === "FINAL" ? "green" : "amber"}>{doc.status === "FINAL" ? "Final" : "Draft"}</Badge>
        {doc.madeBy === "ai" ? <Badge tone="blue">Written with AI: check it</Badge> : null}
        {doc.property ? <Link href={`/properties/${doc.property.id}`} className="text-sm text-slate-500 hover:text-brand-700">{doc.property.address}</Link> : null}
        {saved ? <span className="text-sm text-emerald-700">Saved.</span> : null}
      </div>
      {gaps ? <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{gaps} place{gaps === 1 ? "" : "s"} marked [add …] still need filling in.</p> : null}
      <Card className="p-5">
        <form action={saveDocAction} className="space-y-3">
          <input type="hidden" name="id" value={doc.id} />
          <input name="title" defaultValue={doc.title} aria-label="Title" className="w-full border-b border-slate-100 pb-2 font-display text-xl font-bold text-slate-900 outline-none" />
          <textarea name="body" defaultValue={doc.body} rows={22} aria-label="Body" className="w-full resize-y rounded-lg border border-slate-200 p-3 font-mono text-sm leading-relaxed outline-none focus:border-brand-500" />
          <div className="flex flex-wrap justify-end gap-2">
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-brand-300">Save draft</button>
            <button formAction={saveFinalDocAction} className="rounded-full bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">Save as final</button>
          </div>
        </form>
      </Card>
    </div>
  );
}

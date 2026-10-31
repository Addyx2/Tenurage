import Link from "next/link";
import { FileText } from "lucide-react";

import { PageTitle } from "@/components/PageTitle";
import { Badge, Card, EmptyState } from "@/components/ui";
import { aiAvailable } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

import { draftAction } from "./actions";

export const metadata = { title: "Docs" };
export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = { particulars: "Particulars", viewing_confirmation: "Viewing confirmation", letter: "Letter" };
const when = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const field = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500";

export default async function DocsPage({ searchParams }: { searchParams: Promise<{ error?: string; property?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [docs, properties] = await Promise.all([
    prisma.document.findMany({ where: { agencyId: user.agencyId }, include: { property: { select: { address: true } } }, orderBy: { updatedAt: "desc" }, take: 100 }),
    prisma.property.findMany({ where: { agencyId: user.agencyId, status: { notIn: ["SOLD", "LET", "WITHDRAWN"] } }, select: { id: true, address: true }, orderBy: { address: "asc" } }),
  ]);
  const ai = aiAvailable();

  return (
    <>
      <PageTitle title="Docs" description="Draft particulars, viewing confirmations and letters from what Tenurage already knows. Check every draft before it's used." />
      {sp.error ? <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{sp.error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          {docs.length === 0 ? <EmptyState icon={FileText} title="No documents yet" description="Draft one on the right. Particulars come from the property's own record." /> : (
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500"><th className="px-4 py-3">Document</th><th className="px-4 py-3">Kind</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {docs.map((d) => (
                    <tr key={d.id}>
                      <td className="px-4 py-3"><Link href={`/docs/${d.id}`} className="font-medium text-slate-900 hover:text-brand-700">{d.title}</Link>{d.madeBy === "ai" ? <span className="block text-xs text-slate-400">written with AI</span> : null}</td>
                      <td className="px-4 py-3 text-slate-600">{KIND_LABEL[d.kind] ?? d.kind}</td>
                      <td className="tabular px-4 py-3 text-slate-500">{when.format(d.updatedAt)}</td>
                      <td className="px-4 py-3"><Badge tone={d.status === "FINAL" ? "green" : "amber"}>{d.status === "FINAL" ? "Final" : "Draft"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Particulars</h2>
            <p className="mt-1 text-xs text-slate-500">From the property&apos;s details. Council tax, EPC and tenure are left for you to add, never guessed.</p>
            <form action={draftAction} className="mt-3 space-y-2">
              <input type="hidden" name="kind" value="particulars" />
              <select name="propertyId" required defaultValue={sp.property ?? ""} className={field} aria-label="Property">
                <option value="" disabled>Choose a property</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
              </select>
              <button className="w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700">Draft particulars</button>
            </form>
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Viewing confirmation</h2>
            <p className="mt-1 text-xs text-slate-500">For the next booked viewing at a property.</p>
            <form action={draftAction} className="mt-3 space-y-2">
              <input type="hidden" name="kind" value="viewing_confirmation" />
              <select name="propertyId" required defaultValue="" className={field} aria-label="Property">
                <option value="" disabled>Choose a property</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
              </select>
              <button className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-brand-300">Draft confirmation</button>
            </form>
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Letter</h2>
            <p className="mt-1 text-xs text-slate-500">{ai ? "Say what it's about; AI writes it from the facts you give. Not for tenancy agreements or legal notices." : "Letters are written by AI, which isn't set up on this deployment yet."}</p>
            <form action={draftAction} className="mt-3 space-y-2">
              <input type="hidden" name="kind" value="letter" />
              <select name="propertyId" defaultValue="" className={field} aria-label="Property (optional)">
                <option value="">No property</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
              </select>
              <textarea name="brief" rows={3} required disabled={!ai} placeholder="e.g. Tell the landlord we had 6 viewings this week and two applicants are keen." className={field} />
              <button disabled={!ai} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-brand-300 disabled:opacity-50">Draft letter</button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}

import { PageTitle } from "@/components/PageTitle";
import { Badge, Card } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { displayPhone } from "@/lib/integrations/phone";

import { saveAgencyAction, updateMemberAction } from "./actions";
import { AddMemberForm } from "./AddMemberForm";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const field = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500";
const small = "rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:border-brand-300";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireAdmin();
  const sp = await searchParams;
  const team = await prisma.user.findMany({ where: { agencyId: user.agencyId }, orderBy: [{ deactivatedAt: { sort: "asc", nulls: "first" } }, { firstName: "asc" }] });

  return (
    <>
      <PageTitle title="Settings" description="Your agency's details and who can use Tenurage." />
      {sp.error ? <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{sp.error}</p> : null}
      {sp.saved ? <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Saved.</p> : null}

      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="text-base font-semibold text-slate-900">Agency</h2>
          <p className="text-sm text-slate-500">Linkbot signs its texts with this name. The phone and email go on viewing confirmations.</p>
          <form action={saveAgencyAction} className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-medium text-slate-600">Name<input name="name" required defaultValue={user.agency.name} className={field} /></label>
            <label className="text-xs font-medium text-slate-600">Office phone<input name="phone" defaultValue={user.agency.phone ?? ""} className={field} /></label>
            <label className="text-xs font-medium text-slate-600">Office email<input name="email" type="email" defaultValue={user.agency.email ?? ""} className={field} /></label>
            <div className="sm:col-span-3 sm:text-right"><button className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Save</button></div>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold text-slate-900">Team</h2>
          <p className="text-sm text-slate-500">Admins manage settings, team, Linkbot and integrations. Negotiators run properties, applicants and viewings. Office mobiles for texting Linkbot are set in Linkbot settings.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500"><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Email</th><th className="py-2 pr-4">Mobile</th><th className="py-2 pr-4">Role</th><th className="py-2" /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {team.map((m) => (
                  <tr key={m.id} className={m.deactivatedAt ? "text-slate-400" : ""}>
                    <td className="py-2.5 pr-4 font-medium">{m.firstName} {m.lastName}{m.id === user.id ? <span className="ml-1 text-xs text-slate-400">(you)</span> : null}</td>
                    <td className="py-2.5 pr-4">{m.email}</td>
                    <td className="tabular py-2.5 pr-4">{m.mobile ? displayPhone(m.mobile) : "—"}</td>
                    <td className="py-2.5 pr-4">{m.deactivatedAt ? <Badge tone="slate">Deactivated</Badge> : <Badge tone={m.role === "ADMIN" ? "brand" : "neutral"}>{m.role === "ADMIN" ? "Admin" : "Negotiator"}</Badge>}</td>
                    <td className="py-2.5 text-right">
                      {m.id === user.id ? null : (
                        <form action={updateMemberAction} className="flex justify-end gap-1.5">
                          <input type="hidden" name="id" value={m.id} />
                          {m.deactivatedAt ? <button name="op" value="reactivate" className={small}>Reactivate</button> : <>
                            <button name="op" value={m.role === "ADMIN" ? "NEGOTIATOR" : "ADMIN"} className={small}>Make {m.role === "ADMIN" ? "negotiator" : "admin"}</button>
                            <button name="op" value="deactivate" className={`${small} hover:border-red-300 hover:text-red-700`}>Deactivate</button>
                          </>}
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-900">Add someone</h3>
          <AddMemberForm />
        </Card>
      </div>
    </>
  );
}

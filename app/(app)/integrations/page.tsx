import { ExternalLink, RefreshCw } from "lucide-react";

import { PageTitle } from "@/components/PageTitle";
import { Badge, Card } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import type { ReapitConfig } from "@/lib/integrations/reapit";
import { configOf, getIntegration } from "@/lib/integrations/store";

import { connectReapitAction, disconnectAction, syncReapitAction } from "./actions";

export const metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

const when = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const field = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500";

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ error?: string; synced?: string; disconnected?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const admin = user.role === "ADMIN";
  const reapit = await getIntegration(user.agencyId, "reapit");
  const rc = configOf<ReapitConfig>(reapit);
  const [sp1, sp2, sp3] = (sp.synced ?? "").split(".").map(Number);

  return (
    <>
      <PageTitle title="Integrations" description="Connect Tenurage to the systems your agency already uses, and to the rest of Aultrum." />
      {sp.error ? <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{sp.error}</p> : null}
      {sp.synced ? <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Reapit synced: {sp1} properties and {sp2} applicants.{sp3 ? ` ${sp3} records were skipped because they were missing a price, address, status or name Tenurage needs.` : ""}</p> : null}
      {sp.disconnected ? <p className="mb-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">Disconnected. Records already imported stay in Tenurage.</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Reapit</h2>
              <p className="text-sm text-slate-500">Import properties and applicants from Reapit, so Linkbot can match and invite them.</p>
            </div>
            {reapit ? <Badge tone={reapit.status === "ERROR" ? "red" : "green"}>{reapit.status === "ERROR" ? "Sync failed" : "Connected"}</Badge> : <Badge tone="slate">Not connected</Badge>}
          </div>

          {reapit ? (
            <div className="mt-4 space-y-3 text-sm">
              <p className="text-slate-600">Customer <span className="font-mono">{rc.customerId}</span>{reapit.lastSyncAt ? <> · last synced {when.format(reapit.lastSyncAt)} · {rc.properties ?? 0} properties, {rc.applicants ?? 0} applicants</> : null}</p>
              {reapit.lastError ? <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{reapit.lastError}</p> : null}
              <p className="text-xs text-slate-500">Tenurage reads from Reapit; it doesn&apos;t write to it yet. Bookings Linkbot makes stay in Tenurage, and an applicant who texted STOP stays opted out after a sync.</p>
              {admin ? (
                <div className="flex flex-wrap gap-2">
                  <form action={syncReapitAction}><button className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"><RefreshCw className="h-4 w-4" /> Sync now</button></form>
                  <form action={disconnectAction}><input type="hidden" name="provider" value="reapit" /><button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-red-300 hover:text-red-700">Disconnect</button></form>
                </div>
              ) : null}
            </div>
          ) : admin ? (
            <form action={connectReapitAction} className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-medium text-slate-600">Client id<input name="clientId" required autoComplete="off" className={`${field} mt-1`} /></label>
              <label className="text-xs font-medium text-slate-600">Client secret<input name="clientSecret" type="password" required autoComplete="off" className={`${field} mt-1`} /></label>
              <label className="text-xs font-medium text-slate-600">Customer id<input name="customerId" required placeholder="SBOX for the sandbox" className={`${field} mt-1`} /></label>
              <p className="text-xs text-slate-500 sm:col-span-2">Register an app with client credentials in the Reapit Developer Portal and install it for your customer. The secret is encrypted before it&apos;s stored.</p>
              <div className="sm:text-right"><button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Connect and sync</button></div>
            </form>
          ) : <p className="mt-4 text-sm text-slate-500">An admin can connect Reapit.</p>}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-2"><h2 className="text-base font-semibold text-slate-900">Gateway</h2><Badge tone="slate">In Aultrum Elements</Badge></div>
          <p className="mt-1 text-sm text-slate-500">One conversation layer for web chat, calls and texts. Set Gateway up in Elements to answer enquiries on your website; Linkbot handles texting applicants here.</p>
          <a href="https://canvas.aultrum.co.uk" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">Open Elements <ExternalLink className="h-3.5 w-3.5" /></a>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-2"><h2 className="text-base font-semibold text-slate-900">Aultrum ID</h2><Badge tone="amber">Coming next</Badge></div>
          <p className="mt-1 text-sm text-slate-500">One sign-in across Tenurage and the other Aultrum apps. Until it&apos;s switched on here, your team signs in with email and password.</p>
        </Card>
      </div>
    </>
  );
}

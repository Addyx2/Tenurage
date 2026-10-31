"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ReapitError, syncReapit, testReapit } from "@/lib/integrations/reapit";
import { saveIntegration } from "@/lib/integrations/store";

const back = (q: string) => redirect(`/integrations?${q}`);

export async function connectReapitAction(form: FormData): Promise<void> {
  const user = await requireAdmin();
  const clientId = String(form.get("clientId") ?? "").trim();
  const clientSecret = String(form.get("clientSecret") ?? "").trim();
  const customerId = String(form.get("customerId") ?? "").trim().toUpperCase();
  if (!clientId || !clientSecret || !/^[A-Z0-9-]{2,40}$/.test(customerId)) back("error=" + encodeURIComponent("Fill in the client id, client secret and customer id."));
  let problem: string | null = null;
  try {
    await testReapit({ clientId, clientSecret }, customerId);
  } catch (error) {
    problem = error instanceof ReapitError ? error.message : "Couldn't reach Reapit. Try again shortly.";
  }
  if (problem) back("error=" + encodeURIComponent(problem));
  await saveIntegration({ agencyId: user.agencyId, provider: "reapit", config: { customerId }, secrets: { clientId, clientSecret } });
  await recordAudit(user, { action: "integration.connect", summary: `Connected Reapit (customer ${customerId})` });
  const r = await syncReapit(user.agencyId);
  revalidatePath("/integrations");
  back(r.ok ? `synced=${r.properties}.${r.applicants}.${r.skipped}` : "error=" + encodeURIComponent(r.error));
}

export async function syncReapitAction(): Promise<void> {
  const user = await requireAdmin();
  const r = await syncReapit(user.agencyId);
  await recordAudit(user, { action: "integration.sync", summary: r.ok ? `Synced Reapit: ${r.properties} properties, ${r.applicants} applicants` : `Reapit sync failed: ${r.error}` });
  revalidatePath("/integrations");
  back(r.ok ? `synced=${r.properties}.${r.applicants}.${r.skipped}` : "error=" + encodeURIComponent(r.error));
}

export async function disconnectAction(form: FormData): Promise<void> {
  const user = await requireAdmin();
  const provider = String(form.get("provider") ?? "");
  const gone = await prisma.integration.deleteMany({ where: { agencyId: user.agencyId, provider } });
  if (gone.count) await recordAudit(user, { action: "integration.disconnect", summary: `Disconnected ${provider}` });
  revalidatePath("/integrations");
  back("disconnected=1");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { recordAudit } from "@/lib/audit";
import { requireAdmin, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toE164 } from "@/lib/integrations/phone";
import { startCampaign, stopCampaign } from "@/lib/linkbot/campaign";
import { provisionNumber } from "@/lib/linkbot/number";
import { textApplicant } from "@/lib/linkbot/sms";
import { safeNextPath } from "@/lib/utils";

export async function saveLinkbotAction(form: FormData): Promise<void> {
  const user = await requireAdmin();
  const data = {
    name: String(form.get("name") ?? "").trim().slice(0, 40) || "Linkbot",
    tone: ["friendly", "brief", "formal"].includes(String(form.get("tone"))) ? String(form.get("tone")) : "friendly",
    enabled: form.get("enabled") === "on",
    officeTexts: form.get("officeTexts") === "on",
    waveSize: Math.min(20, Math.max(1, Math.round(Number(form.get("waveSize")) || 5))),
    waveGapMins: Math.min(480, Math.max(5, Math.round(Number(form.get("waveGapMins")) || 30))),
    reminderHours: Math.min(72, Math.max(1, Math.round(Number(form.get("reminderHours")) || 24))),
  };
  const existing = await prisma.linkbot.findUnique({ where: { agencyId: user.agencyId } });
  const bot = await prisma.linkbot.upsert({ where: { agencyId: user.agencyId }, create: { agencyId: user.agencyId, ...data }, update: data });
  await recordAudit(user, { action: existing ? "linkbot.update" : "linkbot.create", summary: `${existing ? "Changed" : "Created"} Linkbot "${bot.name}"` });
  if (bot.enabled && bot.numberStatus !== "active") after(() => provisionNumber(bot.id));
  revalidatePath("/linkbot");
  redirect(`/linkbot/settings?saved=${existing ? "1" : "new"}`);
}

export async function retryNumberAction(): Promise<void> {
  const user = await requireAdmin();
  const bot = await prisma.linkbot.findUnique({ where: { agencyId: user.agencyId } });
  if (bot) await provisionNumber(bot.id);
  redirect("/linkbot/settings");
}

export async function setOfficeMobileAction(form: FormData): Promise<void> {
  const user = await requireAdmin();
  const raw = String(form.get("mobile") ?? "").trim();
  const mobile = raw ? toE164(raw) : null;
  if (raw && !mobile) redirect(`/linkbot/settings?error=${encodeURIComponent(`"${raw}" isn't a mobile number Tenurage can text.`)}`);
  const member = await prisma.user.findFirst({ where: { id: String(form.get("userId") ?? ""), agencyId: user.agencyId } });
  if (!member) redirect("/linkbot/settings");
  if (mobile && (await prisma.user.findFirst({ where: { agencyId: user.agencyId, mobile, id: { not: member.id } } }))) redirect(`/linkbot/settings?error=${encodeURIComponent("That mobile belongs to someone else in your team.")}`);
  await prisma.user.update({ where: { id: member.id }, data: { mobile } });
  await recordAudit(user, { action: "linkbot.mobile", summary: `${mobile ? "Registered" : "Removed"} ${member.firstName} ${member.lastName}'s mobile for texting Linkbot` });
  redirect("/linkbot/settings?saved=1");
}

export async function fillViewingsAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const propertyId = String(form.get("propertyId") ?? "");
  const r = await startCampaign(user.agencyId, propertyId, user.id);
  if (r.ok) await recordAudit(user, { action: "linkbot.fill", summary: `Linkbot started filling viewings (${r.invited} invited)`, targetType: "property", targetId: propertyId });
  revalidatePath(`/properties/${propertyId}`);
  redirect(`/properties/${propertyId}?${r.ok ? `filling=${r.invited}` : `error=${encodeURIComponent(r.error)}`}`);
}

export async function stopFillingAction(form: FormData): Promise<void> {
  const user = await requireUser();
  await stopCampaign(user.agencyId, String(form.get("campaignId") ?? ""));
  revalidatePath("/linkbot");
  redirect(String(form.get("back") ?? "/linkbot"));
}

export async function textApplicantAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const applicantId = String(form.get("applicantId") ?? "");
  const body = String(form.get("body") ?? "").trim().slice(0, 600);
  let error = "";
  if (!body) error = "Write a message first.";
  else {
    const r = await textApplicant(user.agencyId, applicantId, body);
    if (!r.sent) error = r.reason ?? "Not sent.";
    else await recordAudit(user, { action: "linkbot.text", summary: "Texted an applicant from the office", targetType: "applicant", targetId: applicantId });
  }
  // Sent from the applicant's page: go back there.
  const back = safeNextPath(String(form.get("back") ?? "")) ?? `/linkbot/texts/${applicantId}`;
  redirect(`${back}${error ? `?error=${encodeURIComponent(error)}` : "?sent=1"}`);
}

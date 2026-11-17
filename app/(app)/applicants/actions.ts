"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toE164 } from "@/lib/integrations/phone";
import { applicantSchema } from "@/lib/validation";

export interface FormState {
  error?: string;
}

export async function createApplicantAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = applicantSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details" };
  const d = parsed.data;
  const phone = d.phone ? toE164(d.phone) : null;
  if (d.phone && !phone) return { error: "Enter a mobile number Tenurage can text, e.g. 07700 900123" };
  if (!phone && !d.email) return { error: "Add a mobile or an email, so you can reach them" };
  const applicant = await prisma.applicant.create({
    data: {
      agencyId: user.agencyId,
      firstName: d.firstName,
      lastName: d.lastName,
      phone,
      email: d.email || null,
      market: d.market,
      minBedrooms: d.minBedrooms,
      maxPrice: d.maxPrice,
      areas: d.areas.split(/[\n,]/).map((a) => a.trim()).filter(Boolean).slice(0, 12),
      notes: d.notes,
    },
  });
  await recordAudit(user, { action: "applicant.create", summary: `Added applicant ${applicant.firstName} ${applicant.lastName}`, targetType: "applicant", targetId: applicant.id });
  redirect(`/applicants/${applicant.id}`);
}

export async function setApplicantStatusAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(form.get("applicantId") ?? "");
  const status = String(form.get("status") ?? "");
  if (!["ACTIVE", "PAUSED", "ARCHIVED"].includes(status)) return;
  await prisma.applicant.updateMany({ where: { id, agencyId: user.agencyId }, data: { status } });
  revalidatePath(`/applicants/${id}`);
}

/** The office moves someone on to offer, or let/sold, or back to where their viewings put them. */
export async function setApplicantStageAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(form.get("applicantId") ?? "");
  const stage = String(form.get("stage") ?? "");
  if (!["OFFER", "AGREED", ""].includes(stage)) return;
  const r = await prisma.applicant.updateMany({ where: { id, agencyId: user.agencyId }, data: { offerStage: stage || null } });
  if (r.count) await recordAudit(user, { action: "applicant.stage", summary: stage ? `Moved an applicant to ${stage === "OFFER" ? "offer" : "let/sold"}` : "Moved an applicant back to their viewings stage", targetType: "applicant", targetId: id });
  revalidatePath(`/applicants/${id}`);
  revalidatePath("/applicants");
}

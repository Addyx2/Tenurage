"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { draftDocument, type DocKind } from "@/lib/docs";

export async function draftAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const kind = String(form.get("kind")) as DocKind;
  if (!["particulars", "viewing_confirmation", "letter"].includes(kind)) return;
  const r = await draftDocument(user.agencyId, user.id, { kind, propertyId: String(form.get("propertyId") ?? "") || undefined, brief: String(form.get("brief") ?? "") || undefined });
  if (!r.ok) redirect(`/docs?error=${encodeURIComponent(r.error)}`);
  await recordAudit(user, { action: "docs.draft", summary: `Drafted ${r.title}`, targetType: "document", targetId: r.id });
  redirect(`/docs/${r.id}`);
}

export const saveDocAction = async (form: FormData) => saveDoc(form, "DRAFT");
export const saveFinalDocAction = async (form: FormData) => saveDoc(form, "FINAL");

async function saveDoc(form: FormData, status: "DRAFT" | "FINAL"): Promise<void> {
  const user = await requireUser();
  const id = String(form.get("id") ?? "");
  await prisma.document.updateMany({ where: { id, agencyId: user.agencyId }, data: { title: String(form.get("title") ?? "").slice(0, 200), body: String(form.get("body") ?? "").slice(0, 20_000), status } });
  revalidatePath(`/docs/${id}`);
  redirect(`/docs/${id}?saved=1`);
}

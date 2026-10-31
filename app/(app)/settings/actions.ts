"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAudit } from "@/lib/audit";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { memberSchema } from "@/lib/validation";

export async function saveAgencyAction(form: FormData): Promise<void> {
  const user = await requireAdmin();
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  if (name.length < 2) redirect("/settings?error=" + encodeURIComponent("Enter the agency's name."));
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 120) || null;
  const phone = String(form.get("phone") ?? "").trim().slice(0, 30) || null;
  await prisma.agency.update({ where: { id: user.agencyId }, data: { name, email, phone } });
  await recordAudit(user, { action: "agency.update", summary: "Changed agency details" });
  revalidatePath("/", "layout");
  redirect("/settings?saved=1");
}

export interface AddMemberState {
  error?: string;
  added?: { email: string; password: string };
}

/** Adds someone with a one-off password, shown once to the admin to pass on. */
export async function addMemberAction(_prev: AddMemberState, form: FormData): Promise<AddMemberState> {
  const user = await requireAdmin();
  const parsed = memberSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details" };
  if (await prisma.user.findUnique({ where: { email: parsed.data.email } })) return { error: "Someone already has an account with that email." };
  const password = randomBytes(9).toString("base64url");
  const member = await prisma.user.create({ data: { ...parsed.data, agencyId: user.agencyId, passwordHash: await hashPassword(password) } });
  await recordAudit(user, { action: "team.add", summary: `Added ${member.email} as ${member.role.toLowerCase()}`, targetType: "user", targetId: member.id });
  revalidatePath("/settings");
  return { added: { email: member.email, password } };
}

export async function updateMemberAction(form: FormData): Promise<void> {
  const user = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const op = String(form.get("op") ?? "");
  const member = await prisma.user.findFirst({ where: { id, agencyId: user.agencyId } });
  if (!member) redirect("/settings");
  if (member.id === user.id) redirect("/settings?error=" + encodeURIComponent("You can't change your own access. Ask another admin."));
  if (op === "deactivate") await prisma.user.update({ where: { id }, data: { deactivatedAt: new Date(), sessionVersion: { increment: 1 } } });
  else if (op === "reactivate") await prisma.user.update({ where: { id }, data: { deactivatedAt: null } });
  else if (op === "ADMIN" || op === "NEGOTIATOR") await prisma.user.update({ where: { id }, data: { role: op, sessionVersion: { increment: 1 } } });
  else redirect("/settings");
  await recordAudit(user, { action: "team.update", summary: `${op === "deactivate" ? "Deactivated" : op === "reactivate" ? "Reactivated" : `Made ${op.toLowerCase()}`} ${member.email}`, targetType: "user", targetId: id });
  revalidatePath("/settings");
  redirect("/settings");
}

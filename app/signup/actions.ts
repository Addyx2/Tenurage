"use server";

import { redirect } from "next/navigation";

import { recordAudit } from "@/lib/audit";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { signupSchema } from "@/lib/validation";

export interface SignupState {
  error?: string;
  values?: Record<string, string>;
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "agency";

export async function signupAction(_prev: SignupState, form: FormData): Promise<SignupState> {
  const values = Object.fromEntries(["agencyName", "firstName", "lastName", "email"].map((k) => [k, String(form.get(k) ?? "")]));
  const parsed = signupSchema.safeParse({ ...values, password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details", values };
  const d = parsed.data;
  if (await prisma.user.findUnique({ where: { email: d.email } })) return { error: "There's already an account with that email. Sign in instead.", values };
  const base = slugify(d.agencyName);
  let slug = base;
  for (let i = 2; await prisma.agency.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
  const user = await prisma.$transaction(async (tx) => {
    const agency = await tx.agency.create({ data: { name: d.agencyName, slug, email: d.email } });
    return tx.user.create({ data: { agencyId: agency.id, email: d.email, firstName: d.firstName, lastName: d.lastName, role: "ADMIN", passwordHash: await hashPassword(d.password), lastLoginAt: new Date() } });
  });
  await recordAudit(user, { action: "agency.create", summary: `Created ${d.agencyName}` });
  await setSessionCookie(user);
  redirect("/launchpad");
}

"use server";

import { addMinutes } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { propertySchema } from "@/lib/validation";

export interface FormState {
  error?: string;
}

export async function createPropertyAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = propertySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details" };
  const d = parsed.data;
  const property = await prisma.property.create({
    data: {
      agencyId: user.agencyId,
      market: d.market,
      address: d.address,
      postcode: d.postcode.replace(/\s+/g, "").replace(/(.{3})$/, " $1"),
      kind: d.kind,
      bedrooms: d.bedrooms,
      price: d.price,
      summary: d.summary,
      features: d.features.split(/[\n,]/).map((f) => f.trim()).filter(Boolean).slice(0, 20),
    },
  });
  await recordAudit(user, { action: "property.create", summary: `Added ${property.address}`, targetType: "property", targetId: property.id });
  redirect(`/properties/${property.id}`);
}

export async function setPropertyStatusAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(form.get("propertyId") ?? "");
  const status = String(form.get("status") ?? "");
  if (!["AVAILABLE", "UNDER_OFFER", "LET_AGREED", "SOLD", "LET", "WITHDRAWN"].includes(status)) return;
  const p = await prisma.property.updateMany({ where: { id, agencyId: user.agencyId }, data: { status } });
  if (p.count) await recordAudit(user, { action: "property.status", summary: `Marked a property ${status.toLowerCase().replace("_", " ")}`, targetType: "property", targetId: id });
  revalidatePath(`/properties/${id}`);
}

/** Opens viewing slots: `count` back to back from a start time, `length` minutes each. */
export async function addSlotsAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const propertyId = String(form.get("propertyId") ?? "");
  const property = await prisma.property.findFirst({ where: { id: propertyId, agencyId: user.agencyId } });
  if (!property) return;
  const start = new Date(`${form.get("date")}T${form.get("time")}:00`);
  const count = Math.min(12, Math.max(1, Number(form.get("count")) || 1));
  const length = Math.min(120, Math.max(10, Number(form.get("length")) || 20));
  if (Number.isNaN(start.getTime()) || start < new Date()) redirect(`/properties/${propertyId}?error=${encodeURIComponent("Choose a time in the future.")}`);
  await prisma.viewing.createMany({
    data: Array.from({ length: count }, (_, i) => ({ agencyId: user.agencyId, propertyId, startAt: addMinutes(start, i * length), endAt: addMinutes(start, (i + 1) * length) })),
  });
  revalidatePath(`/properties/${propertyId}`);
  redirect(`/properties/${propertyId}?slots=${count}`);
}

export async function removeSlotAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(form.get("viewingId") ?? "");
  const v = await prisma.viewing.findFirst({ where: { id, agencyId: user.agencyId, status: "OPEN" } });
  if (v) await prisma.viewing.delete({ where: { id } });
  revalidatePath(`/properties/${v?.propertyId ?? ""}`);
}

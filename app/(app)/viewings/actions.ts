"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function markViewingAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const status = String(form.get("status"));
  if (!["DONE", "NO_SHOW", "CANCELLED"].includes(status)) return;
  await prisma.viewing.updateMany({ where: { id: String(form.get("viewingId") ?? ""), agencyId: user.agencyId, status: "BOOKED" }, data: { status } });
  revalidatePath("/viewings");
}

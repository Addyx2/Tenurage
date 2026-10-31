import type { Integration, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

import { seal, unseal } from "./crypto";

// Connections to other systems (Reapit, Elements' Gateway). Credentials are
// sealed with AUTH_SECRET before they reach the database.

export const getIntegration = (agencyId: string, provider: string) => prisma.integration.findUnique({ where: { agencyId_provider: { agencyId, provider } } });

export function secretsOf<T>(integration: Pick<Integration, "secrets"> | null): T | null {
  return integration?.secrets ? unseal<T>(integration.secrets) : null;
}

export function configOf<T extends object>(integration: Pick<Integration, "config"> | null): Partial<T> {
  return (integration?.config ?? {}) as Partial<T>;
}

export function saveIntegration(input: { agencyId: string; provider: string; config: Record<string, unknown>; secrets?: unknown }) {
  const data = { status: "CONNECTED", config: input.config as Prisma.InputJsonValue, secrets: input.secrets === undefined ? undefined : seal(input.secrets), lastError: null };
  return prisma.integration.upsert({
    where: { agencyId_provider: { agencyId: input.agencyId, provider: input.provider } },
    create: { agencyId: input.agencyId, provider: input.provider, ...data },
    update: data,
  });
}

export async function markIntegration(id: string, ok: boolean, error?: string) {
  await prisma.integration.update({ where: { id }, data: ok ? { status: "CONNECTED", lastError: null, lastSyncAt: new Date() } : { status: "ERROR", lastError: error?.slice(0, 500) ?? "Failed" } });
}

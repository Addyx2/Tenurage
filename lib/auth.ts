import { createHmac, timingSafeEqual } from "node:crypto";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { SESSION_COOKIE } from "./constants";
import { prisma } from "./db";

export { SESSION_COOKIE };
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set to a strong value in production");
    return "dev-insecure-secret-change-me-1234567890";
  }
  return secret;
}

const sign = (payload: string) => createHmac("sha256", getSecret()).update(payload).digest("base64url");

// `${userId}.${sessionVersion}.${expires}.${signature}`: bumping User.sessionVersion signs every device out.
export function createSessionToken(userId: string, sessionVersion = 0, ttlMs = SESSION_TTL_MS): string {
  const payload = `${userId}.${sessionVersion}.${Date.now() + ttlMs}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): { userId: string; version: number } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [userId, versionRaw, expiresRaw, signature] = parts;
  const a = Buffer.from(signature);
  const b = Buffer.from(sign(`${userId}.${versionRaw}.${expiresRaw}`));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (!(Number(expiresRaw) > Date.now())) return null;
  const version = Number(versionRaw);
  return Number.isInteger(version) ? { userId, version } : null;
}

export async function setSessionCookie(user: { id: string; sessionVersion: number }) {
  (await cookies()).set(SESSION_COOKIE, createSessionToken(user.id, user.sessionVersion), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export const hashPassword = (password: string) => bcrypt.hash(password, 10);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export const getSessionUser = cache(async () => {
  const session = verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId }, include: { agency: true } });
  if (!user || user.deactivatedAt || user.sessionVersion !== session.version) return null;
  return user;
});

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Settings, team and integrations: admins only. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/launchpad");
  return user;
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

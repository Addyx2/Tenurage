import { prisma } from "@/lib/db";

import { toE164 } from "./phone";
import { getIntegration, markIntegration, secretsOf } from "./store";

// Reapit Foundations: the agency registers a Tenurage app in the Reapit
// Developer Portal (client-credentials flow) and pastes its client id and
// secret here, with their Reapit customer id ("SBOX" for the sandbox).
// Tenurage reads properties and applicants; it doesn't write back yet.

export interface ReapitSecrets {
  clientId: string;
  clientSecret: string;
}
export interface ReapitConfig {
  customerId: string;
  properties?: number;
  applicants?: number;
}

const TOKEN_URL = () => process.env.REAPIT_TOKEN_URL ?? "https://connect.reapit.cloud/token";
const API_URL = () => process.env.REAPIT_API_URL ?? "https://platform.reapit.cloud";
const PAGE_SIZE = 100;
const MAX_PAGES = 20;

export class ReapitError extends Error {}

async function token(s: ReapitSecrets): Promise<string> {
  const res = await fetch(TOKEN_URL(), {
    method: "POST",
    headers: { authorization: `Basic ${Buffer.from(`${s.clientId}:${s.clientSecret}`).toString("base64")}`, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: s.clientId }),
  });
  if (res.status === 400 || res.status === 401) throw new ReapitError("Reapit didn't accept the client id and secret. Check them in the Reapit Developer Portal.");
  if (!res.ok) throw new ReapitError(`Reapit sign-in failed (${res.status}).`);
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new ReapitError("Reapit sign-in returned no token.");
  return body.access_token;
}

async function pages<T>(path: string, accessToken: string, customerId: string): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(`${API_URL()}${path}?pageSize=${PAGE_SIZE}&pageNumber=${page}`, {
      headers: { authorization: `Bearer ${accessToken}`, "api-version": "2020-01-31", "reapit-customer": customerId, accept: "application/json" },
    });
    if (res.status === 403) throw new ReapitError(`Reapit refused access to ${path.replace(/\//g, "")} for customer ${customerId}. Is the app installed for that customer?`);
    if (!res.ok) throw new ReapitError(`Reapit ${path} failed (${res.status}).`);
    const body = (await res.json()) as { _embedded?: T[]; pageCount?: number };
    out.push(...(body._embedded ?? []));
    if (!body.pageCount || page >= body.pageCount) break;
  }
  return out;
}

// --- Mapping. Reapit's shapes, as far as Tenurage reads them. ---

export interface ReapitProperty {
  id: string;
  marketingMode?: string;
  address?: { buildingName?: string; buildingNumber?: string; line1?: string; line2?: string; line3?: string; line4?: string; postcode?: string };
  bedrooms?: number;
  type?: string[];
  summary?: string;
  description?: string;
  selling?: { price?: number; status?: string };
  letting?: { rent?: number; rentFrequency?: string; status?: string };
}

export interface ReapitApplicant {
  id: string;
  marketingMode?: string;
  active?: boolean;
  bedroomsMin?: number;
  buying?: { priceTo?: number };
  renting?: { rentTo?: number; rentFrequency?: string };
  locationOptions?: string[];
  related?: { name?: string; mobilePhone?: string; homePhone?: string; email?: string }[];
}

const SALE_STATUS: Record<string, string> = { forSale: "AVAILABLE", underOffer: "UNDER_OFFER", exchanged: "SOLD", completed: "SOLD", soldExternally: "SOLD", withdrawn: "WITHDRAWN" };
const LET_STATUS: Record<string, string> = { toLet: "AVAILABLE", underOffer: "UNDER_OFFER", arrangingTenancy: "LET_AGREED", tenancyCurrent: "LET", let: "LET", withdrawn: "WITHDRAWN" };

function monthly(amount: number | undefined, frequency: string | undefined): number | null {
  if (!amount) return null;
  if (frequency === "weekly") return Math.round((amount * 52) / 12);
  if (frequency === "annually") return Math.round(amount / 12);
  return Math.round(amount);
}

const KINDS = ["house", "flat", "bungalow"];

export function mapProperty(p: ReapitProperty) {
  const letting = p.marketingMode === "letting" || (p.marketingMode === "sellingAndLetting" && !p.selling?.price);
  const market = letting ? "LET" : "SALE";
  const status = letting ? LET_STATUS[p.letting?.status ?? ""] : SALE_STATUS[p.selling?.status ?? ""];
  const price = letting ? monthly(p.letting?.rent, p.letting?.rentFrequency) : p.selling?.price ?? null;
  const a = p.address ?? {};
  const street = [a.buildingName, [a.buildingNumber, a.line1].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const address = [street, a.line2, a.line3].filter(Boolean).join(", ");
  if (!status || !price || !address || !a.postcode) return null;
  return {
    market,
    address: address.slice(0, 200),
    postcode: a.postcode.toUpperCase(),
    kind: KINDS.find((k) => p.type?.includes(k)) ?? (p.type?.includes("maisonette") || p.type?.includes("apartment") ? "flat" : "other"),
    bedrooms: Math.max(0, p.bedrooms ?? 0),
    price,
    status,
    summary: (p.summary || p.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000),
  };
}

export function mapApplicant(a: ReapitApplicant) {
  const market = a.marketingMode === "renting" ? "LET" : a.marketingMode === "buying" ? "SALE" : null;
  const maxPrice = market === "LET" ? monthly(a.renting?.rentTo, a.renting?.rentFrequency) : a.buying?.priceTo ?? null;
  const person = a.related?.[0];
  if (!market || !maxPrice || !person?.name) return null;
  const [firstName, ...rest] = person.name.replace(/^(mr|mrs|ms|miss|dr|mx)\.?\s+/i, "").trim().split(/\s+/);
  return {
    market,
    maxPrice,
    firstName: (firstName ?? "").slice(0, 60),
    lastName: rest.join(" ").slice(0, 60),
    phone: toE164(person.mobilePhone) ?? null,
    email: person.email?.toLowerCase() ?? null,
    minBedrooms: Math.max(0, a.bedroomsMin ?? 0),
    areas: (a.locationOptions ?? []).map((l) => l.trim()).filter(Boolean).slice(0, 10),
    status: a.active === false ? "ARCHIVED" : "ACTIVE",
  };
}

/** Checks the credentials work: signs in and reads one page of properties. */
export async function testReapit(secrets: ReapitSecrets, customerId: string) {
  const t = await token(secrets);
  const res = await fetch(`${API_URL()}/properties/?pageSize=1`, { headers: { authorization: `Bearer ${t}`, "api-version": "2020-01-31", "reapit-customer": customerId } });
  if (res.status === 403) throw new ReapitError(`Signed in, but Reapit refused access for customer ${customerId}. Is the app installed for that customer?`);
  if (!res.ok) throw new ReapitError(`Signed in, but reading properties failed (${res.status}).`);
}

export type SyncResult = { ok: true; properties: number; applicants: number; skipped: number } | { ok: false; error: string };

/** Imports properties and applicants, matched on their Reapit id. Tenurage's own viewings and texts are kept. */
export async function syncReapit(agencyId: string): Promise<SyncResult> {
  const integration = await getIntegration(agencyId, "reapit");
  const secrets = secretsOf<ReapitSecrets>(integration);
  const customerId = (integration?.config as Partial<ReapitConfig> | undefined)?.customerId;
  if (!integration || !secrets || !customerId) return { ok: false, error: "Reapit isn't connected." };
  try {
    const t = await token(secrets);
    const [props, apps] = await Promise.all([pages<ReapitProperty>("/properties/", t, customerId), pages<ReapitApplicant>("/applicants/", t, customerId)]);
    let properties = 0;
    let applicants = 0;
    let skipped = 0;
    for (const raw of props) {
      const p = mapProperty(raw);
      if (!p) { skipped++; continue; }
      await prisma.property.upsert({ where: { agencyId_reapitId: { agencyId, reapitId: raw.id } }, create: { agencyId, reapitId: raw.id, ...p }, update: p });
      properties++;
    }
    for (const raw of apps) {
      const a = mapApplicant(raw);
      if (!a) { skipped++; continue; }
      // Don't undo a STOP: smsOptOutAt is Tenurage's own and never overwritten.
      await prisma.applicant.upsert({ where: { agencyId_reapitId: { agencyId, reapitId: raw.id } }, create: { agencyId, reapitId: raw.id, ...a }, update: a });
      applicants++;
    }
    await prisma.integration.update({ where: { id: integration.id }, data: { config: { customerId, properties, applicants }, status: "CONNECTED", lastError: null, lastSyncAt: new Date() } });
    return { ok: true, properties, applicants, skipped };
  } catch (error) {
    const message = error instanceof ReapitError ? error.message : "Couldn't reach Reapit. Try again shortly.";
    if (!(error instanceof ReapitError)) console.error(JSON.stringify({ event: "reapit_sync_failed", agencyId, error: String(error) }));
    await markIntegration(integration.id, false, message);
    return { ok: false, error: message };
  }
}

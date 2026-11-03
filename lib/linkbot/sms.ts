import { prisma } from "@/lib/db";
import { toE164 } from "@/lib/integrations/phone";
import { sendSms, setIncomingWebhook, type TwilioSecrets } from "@/lib/integrations/twilio";
import { absoluteUrl } from "@/lib/url";

// How an agency's Linkbot texts. Each Linkbot texts from a UK number of its
// own, bought on Aultrum's Twilio account (lib/linkbot/number.ts). Until it
// has one, it texts from the shared Linkbot number (TWILIO_FROM) if one is set. An agency
// without a Linkbot, or with it switched off, texts nobody.

export interface Sender {
  secrets: TwilioSecrets;
  from: string;
  shared: boolean;
}

export interface SmsResult {
  sent: boolean;
  reason?: string;
}

/** Aultrum's Twilio account (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN): all texting needs. */
export function aultrumTwilio(): TwilioSecrets | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  return accountSid && authToken ? { accountSid, authToken } : null;
}

/** The optional shared number (TWILIO_FROM), used only until an agency's own number is bought. */
export function sharedSender(): Sender | null {
  const secrets = aultrumTwilio();
  const from = (process.env.TWILIO_FROM ?? process.env.TWILIO_PHONE_NUMBER)?.trim();
  return secrets && from ? { secrets, from, shared: true } : null;
}

export const SHARED_WEBHOOK_PATH = "/api/webhooks/twilio/shared";
const SHARED_WEBHOOK_KEY = "twilio-shared-webhook";

async function ensureSharedWebhook(sender: Sender) {
  if (!sender.from.startsWith("+")) return;
  const url = await absoluteUrl(SHARED_WEBHOOK_PATH);
  const done = await prisma.serviceKey.findUnique({ where: { name: SHARED_WEBHOOK_KEY } });
  if (done?.value === `${sender.from} ${url}`) return;
  if (await setIncomingWebhook(sender.secrets, sender.from, url).catch(() => false)) {
    await prisma.serviceKey.upsert({ where: { name: SHARED_WEBHOOK_KEY }, create: { name: SHARED_WEBHOOK_KEY, value: `${sender.from} ${url}` }, update: { value: `${sender.from} ${url}` } });
  }
}

export async function smsSender(agencyId: string): Promise<Sender | null> {
  const bot = await prisma.linkbot.findUnique({ where: { agencyId }, select: { enabled: true, number: true, numberStatus: true } });
  if (!bot?.enabled) return null;
  const secrets = aultrumTwilio();
  if (!secrets) return null;
  if (bot.numberStatus === "active" && bot.number) return { secrets, from: bot.number, shared: false };
  const account = sharedSender();
  if (!account) return null;
  await ensureSharedWebhook(account).catch((error) => console.error("shared Twilio webhook not set", error));
  return account;
}

/** Sends a text and keeps it, against an applicant or an office member. Never throws. */
export async function sendAndKeep(agencyId: string, who: { applicantId?: string; userId?: string }, phone: string, body: string, code?: string): Promise<SmsResult> {
  try {
    const sender = await smsSender(agencyId);
    if (!sender) return { sent: false, reason: "Texting is off or isn't set up" };
    try {
      const { sid } = await sendSms(sender.secrets, sender.from, phone, body);
      await prisma.smsMessage.create({ data: { agencyId, ...who, direction: "OUT", phone, body, code, providerId: sid, status: "SENT" } });
      return { sent: true };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Twilio didn't accept the message";
      await prisma.smsMessage.create({ data: { agencyId, ...who, direction: "OUT", phone, body, code, status: "FAILED" } });
      console.error(JSON.stringify({ event: "linkbot_sms_failed", agencyId, reason }));
      return { sent: false, reason };
    }
  } catch (error) {
    console.error("linkbot text failed", error);
    return { sent: false, reason: "Something went wrong sending the text" };
  }
}

/** Texts an applicant, unless they've texted STOP or have no mobile. */
export async function textApplicant(agencyId: string, applicantId: string, body: string, code?: string): Promise<SmsResult> {
  const a = await prisma.applicant.findFirst({ where: { id: applicantId, agencyId }, select: { firstName: true, phone: true, smsOptOutAt: true } });
  if (!a) return { sent: false, reason: "No such applicant" };
  if (a.smsOptOutAt) return { sent: false, reason: `${a.firstName} has opted out of texts` };
  const phone = toE164(a.phone);
  if (!phone) return { sent: false, reason: `${a.firstName} has no mobile number` };
  return sendAndKeep(agencyId, { applicantId }, phone, body, code);
}

export async function applicantByPhone(agencyId: string, phone: string) {
  const want = toE164(phone) ?? phone;
  const all = await prisma.applicant.findMany({ where: { agencyId, phone: { not: null }, status: { not: "ARCHIVED" } } });
  return all.find((a) => toE164(a.phone) === want) ?? null;
}

export async function officeUserByMobile(agencyId: string, phone: string) {
  const want = toE164(phone) ?? phone;
  const users = await prisma.user.findMany({ where: { agencyId, mobile: { not: null }, deactivatedAt: null }, include: { agency: true } });
  return users.find((u) => toE164(u.mobile) === want) ?? null;
}

// Not CANCEL or END: someone texting "cancel" about a viewing mustn't silently lose their texts.
const STOP_WORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "QUIT", "OPTOUT"]);
const START_WORDS = new Set(["START", "UNSTOP", "SUBSCRIBE", "OPTIN"]);

export function optOutWord(body: string): "stop" | "start" | null {
  const word = body.trim().toUpperCase().replace(/[^A-Z]/g, "");
  return STOP_WORDS.has(word) ? "stop" : START_WORDS.has(word) ? "start" : null;
}

export interface BookReply {
  yes: boolean;
  code: string;
  /** "10:20" if they named a time. */
  time: string | null;
}

/** "YES 4821", "yes 4821 10:20", "no 4821": a reply to a viewing invitation. */
export function parseBookReply(body: string): BookReply | null {
  const m = body.trim().match(/^(yes|y|no|n)\W+(\d{4})(?:\W+(\d{1,2})[:.](\d{2}))?\W*$/i);
  if (!m) return null;
  return { yes: m[1].toLowerCase().startsWith("y"), code: m[2], time: m[3] ? `${m[3].padStart(2, "0")}:${m[4]}` : null };
}

/** "4", "4/5", "5 loved it": interest after a viewing, 1 to 5. */
export function parseInterest(body: string): number | null {
  const m = body.trim().match(/^([1-5])(?:\s*\/\s*5)?(?:\b|$)/);
  return m ? Number(m[1]) : null;
}

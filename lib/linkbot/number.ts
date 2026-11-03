import { prisma } from "@/lib/db";
import { buyUkMobile, pointNumber, ukMobileBundle } from "@/lib/integrations/twilio";
import { absoluteUrl } from "@/lib/url";

import { aultrumTwilio } from "./sms";

// Each agency's Linkbot gets a UK mobile number of its own, bought on
// Aultrum's Twilio account the moment it's created, with replies pointed
// back here. Nobody buys numbers by hand: Tenurage finds Aultrum's approved
// UK mobile regulatory bundle through Twilio's API. Until a number is bought,
// it texts from the shared Linkbot number if TWILIO_FROM is set.

export const linkbotWebhookPath = (id: string) => `/api/webhooks/twilio/linkbot/${id}`;

export async function provisionNumber(linkbotId: string): Promise<{ ok: true; number: string } | { ok: false; error: string }> {
  const bot = await prisma.linkbot.findUnique({ where: { id: linkbotId }, include: { agency: { select: { name: true } } } });
  if (!bot) return { ok: false, error: "No such Linkbot" };
  const secrets = aultrumTwilio();
  const smsUrl = await absoluteUrl(linkbotWebhookPath(bot.id));
  if (bot.numberSid && bot.number && secrets) {
    await pointNumber(secrets, bot.numberSid, smsUrl).catch(() => undefined);
    return { ok: true, number: bot.number };
  }
  if (!secrets) {
    console.error(JSON.stringify({ event: "linkbot_number_failed", agencyId: bot.agencyId, error: "Twilio settings missing" }));
    const error = "Texting isn't set up on Tenurage yet. Linkbot can't text until it is.";
    await prisma.linkbot.update({ where: { id: bot.id }, data: { numberStatus: "failed", numberError: error } });
    return { ok: false, error };
  }
  try {
    const bundle = await ukMobileBundle(secrets);
    if (!bundle) throw new Error("No approved UK mobile regulatory bundle on the account");
    const bought = await buyUkMobile(secrets, { friendlyName: `Linkbot · ${bot.agency.name}`, smsUrl, ...bundle });
    await prisma.linkbot.update({ where: { id: bot.id }, data: { number: bought.number, numberSid: bought.sid, numberStatus: "active", numberError: null } });
    return { ok: true, number: bought.number };
  } catch (e) {
    const raw = e instanceof Error ? e.message : "Twilio didn't sell a number";
    const meanwhile = process.env.TWILIO_FROM?.trim() ? " It texts from the shared Linkbot number meanwhile." : " It starts texting once it has one.";
    const error = /bundle|regulat|address/i.test(raw)
      ? `Its number is waiting on UK number approval with the phone network.${meanwhile}`
      : `Its number couldn't be set up just now.${meanwhile} Try again later.`;
    await prisma.linkbot.update({ where: { id: bot.id }, data: { numberStatus: "failed", numberError: error } });
    console.error(JSON.stringify({ event: "linkbot_number_failed", agencyId: bot.agencyId, error: raw }));
    return { ok: false, error };
  }
}

/** Linkbots still waiting for a number try again by themselves, each at most once an hour. */
export async function retryWaitingNumbers(now = new Date()): Promise<number> {
  if (!aultrumTwilio()) return 0;
  const waiting = await prisma.linkbot.findMany({ where: { enabled: true, numberStatus: "failed", updatedAt: { lt: new Date(now.getTime() - 3_600_000) } }, select: { id: true }, take: 20 });
  let got = 0;
  for (const b of waiting) if ((await provisionNumber(b.id)).ok) got++;
  return got;
}

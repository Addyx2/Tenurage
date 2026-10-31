import { prisma } from "@/lib/db";
import { buyUkMobile, pointNumber } from "@/lib/integrations/twilio";
import { absoluteUrl } from "@/lib/url";

import { sharedSender } from "./sms";

// Each agency's Linkbot gets a UK mobile number of its own, bought on
// Aultrum's Twilio account the moment it's created, with replies pointed
// back here. UK numbers need Aultrum's approved regulatory bundle
// (TWILIO_BUNDLE_SID, and TWILIO_ADDRESS_SID if Twilio asks). Until then it
// texts from the shared Linkbot number.

export const linkbotWebhookPath = (id: string) => `/api/webhooks/twilio/linkbot/${id}`;

export async function provisionNumber(linkbotId: string): Promise<{ ok: true; number: string } | { ok: false; error: string }> {
  const bot = await prisma.linkbot.findUnique({ where: { id: linkbotId }, include: { agency: { select: { name: true } } } });
  if (!bot) return { ok: false, error: "No such Linkbot" };
  const account = sharedSender();
  const smsUrl = await absoluteUrl(linkbotWebhookPath(bot.id));
  if (bot.numberSid && bot.number && account) {
    await pointNumber(account.secrets, bot.numberSid, smsUrl).catch(() => undefined);
    return { ok: true, number: bot.number };
  }
  if (!account) {
    console.error(JSON.stringify({ event: "linkbot_number_failed", agencyId: bot.agencyId, error: "Twilio settings missing" }));
    const error = "Texting isn't set up on Tenurage yet. Linkbot can't text until it is.";
    await prisma.linkbot.update({ where: { id: bot.id }, data: { numberStatus: "failed", numberError: error } });
    return { ok: false, error };
  }
  try {
    const bought = await buyUkMobile(account.secrets, {
      friendlyName: `Linkbot · ${bot.agency.name}`,
      smsUrl,
      bundleSid: process.env.TWILIO_BUNDLE_SID?.trim() || undefined,
      addressSid: process.env.TWILIO_ADDRESS_SID?.trim() || undefined,
    });
    await prisma.linkbot.update({ where: { id: bot.id }, data: { number: bought.number, numberSid: bought.sid, numberStatus: "active", numberError: null } });
    return { ok: true, number: bought.number };
  } catch (e) {
    const raw = e instanceof Error ? e.message : "Twilio didn't sell a number";
    const error = /bundle|regulat|address/i.test(raw)
      ? "Its number is waiting on UK number approval with the phone network. It texts from the shared Linkbot number meanwhile."
      : "Its number couldn't be set up just now. It texts from the shared Linkbot number meanwhile; try again later.";
    await prisma.linkbot.update({ where: { id: bot.id }, data: { numberStatus: "failed", numberError: error } });
    console.error(JSON.stringify({ event: "linkbot_number_failed", agencyId: bot.agencyId, error: raw }));
    return { ok: false, error };
  }
}

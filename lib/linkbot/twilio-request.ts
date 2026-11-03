import { validTwilioSignature } from "@/lib/integrations/twilio";
import { defaultOrigin } from "@/lib/url";

import { aultrumTwilio } from "./sms";

/** A text Twilio posted to one of Tenurage's numbers, checked against Aultrum's auth token. */
export async function verifiedTwilioPost(request: Request): Promise<{ fields: Record<string, string> } | { response: Response }> {
  const secrets = aultrumTwilio();
  if (!secrets) return { response: new Response("Not found", { status: 404 }) };
  const form = await request.formData().catch(() => null);
  if (!form) return { response: new Response("Bad request", { status: 400 }) };
  const fields: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") fields[k] = v;
  const path = new URL(request.url).pathname;
  const urls = [request.url, `${(process.env.APP_URL ?? defaultOrigin()).replace(/\/+$/, "")}${path}`];
  if (!validTwilioSignature(secrets.authToken, request.headers.get("x-twilio-signature"), urls, fields)) return { response: new Response("Invalid signature", { status: 403 }) };
  if (fields.AccountSid !== secrets.accountSid || !fields.From) return { response: new Response(null, { status: 204 }) };
  return { fields };
}

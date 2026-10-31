import { after } from "next/server";

import { twiml } from "@/lib/integrations/twilio";
import { maybeTick } from "@/lib/linkbot/campaign";
import { inboundToShared } from "@/lib/linkbot/inbound";
import { verifiedTwilioPost } from "@/lib/linkbot/twilio-request";

export const dynamic = "force-dynamic";

// Texts to the shared Linkbot number, used until an agency's own number is set up.
export async function POST(request: Request) {
  const checked = await verifiedTwilioPost(request);
  if ("response" in checked) return checked.response;
  after(() => maybeTick());
  return twiml((await inboundToShared(checked.fields.From, checked.fields.Body ?? "", checked.fields.MessageSid ?? null)) ?? undefined);
}

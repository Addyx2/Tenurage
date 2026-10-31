import { after } from "next/server";

import { twiml } from "@/lib/integrations/twilio";
import { maybeTick } from "@/lib/linkbot/campaign";
import { inboundToLinkbot } from "@/lib/linkbot/inbound";
import { verifiedTwilioPost } from "@/lib/linkbot/twilio-request";

export const dynamic = "force-dynamic";

// Texts to an agency's own Linkbot number.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const checked = await verifiedTwilioPost(request);
  if ("response" in checked) return checked.response;
  after(() => maybeTick());
  return twiml((await inboundToLinkbot(id, checked.fields.From, checked.fields.Body ?? "", checked.fields.MessageSid ?? null)) ?? undefined);
}

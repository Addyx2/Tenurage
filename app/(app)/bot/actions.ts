"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { aiAvailable, aiTurn, asTurns, type Tool } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CHANGES, DRAFT_TOOL, READS, runChange, type OfficeCtx } from "@/lib/office";

export async function askBotAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const text = String(form.get("q") ?? "").trim().slice(0, 2000);
  if (!text) redirect("/bot");
  await prisma.botMessage.create({ data: { agencyId: user.agencyId, userId: user.id, role: "user", body: text } });
  if (!aiAvailable()) {
    await prisma.botMessage.create({ data: { agencyId: user.agencyId, userId: user.id, role: "bot", body: "I can't answer yet: AI isn't set up on this deployment (ANTHROPIC_API_KEY)." } });
    redirect("/bot");
  }
  const ctx: OfficeCtx = { agencyId: user.agencyId, user };
  const proposals: { tool: string; input: Record<string, unknown>; summary: string }[] = [];
  // Changes become proposals the person approves on screen.
  const propose: Record<string, Tool<OfficeCtx>> = Object.fromEntries(
    Object.entries(CHANGES).map(([name, c]) => [
      name,
      {
        description: `${c.description} This only proposes it: the person approves it on screen.`,
        input: c.input,
        run: async (input: Record<string, unknown>) => {
          const summary = await c.describe(input, ctx);
          if (!summary) return { error: "Not found: check the ids with find." };
          proposals.push({ tool: name, input, summary });
          return { proposed: summary };
        },
      },
    ]),
  );
  const history = await prisma.botMessage.findMany({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 12 * 3_600_000) } }, orderBy: { createdAt: "desc" }, take: 16 });
  const now = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date());
  const said = await aiTurn({
    system: `You are Bot, the office assistant in Tenurage for ${user.agency.name}, a UK estate and letting agency, working with ${user.firstName}. It is ${now} (UK). Answer from the agency's records using your tools; never guess or invent ids, prices or people. For changes, call the change tool: it shows ${user.firstName} an Approve button, so say what you've proposed. Drafting a document happens at once and lands in Docs. Never give legal advice. Plain UK English, short, no markdown tables.`,
    messages: asTurns(history.reverse().map((m) => ({ fromPerson: m.role === "user", body: m.body }))),
    tools: { ...READS, ...propose, draft_document: DRAFT_TOOL },
    ctx,
  }).catch((error) => {
    console.error(JSON.stringify({ event: "bot_turn_failed", userId: user.id, error: String(error) }));
    return "Sorry, something went wrong. Try again.";
  });
  await prisma.botMessage.create({ data: { agencyId: user.agencyId, userId: user.id, role: "bot", body: said || "Done." } });
  for (const p of proposals) {
    await prisma.botMessage.create({ data: { agencyId: user.agencyId, userId: user.id, role: "bot", body: p.summary, proposal: { tool: p.tool, input: p.input } as object, status: "pending" } });
  }
  revalidatePath("/bot");
  redirect("/bot");
}

export async function decideProposalAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(form.get("id") ?? "");
  const approve = form.get("decision") === "approve";
  const msg = await prisma.botMessage.findFirst({ where: { id, userId: user.id, status: "pending" } });
  if (!msg?.proposal) redirect("/bot");
  const claimed = await prisma.botMessage.updateMany({ where: { id, status: "pending" }, data: { status: approve ? "approved" : "declined" } });
  if (!claimed.count) redirect("/bot");
  const p = msg.proposal as { tool: string; input: Record<string, unknown> };
  const result = approve ? await runChange(p.tool, p.input, { agencyId: user.agencyId, user }).catch(() => "That didn't work.") : "OK, left as it is.";
  await prisma.botMessage.create({ data: { agencyId: user.agencyId, userId: user.id, role: "bot", body: result } });
  revalidatePath("/bot");
  redirect("/bot");
}

export async function clearBotAction(): Promise<void> {
  const user = await requireUser();
  await prisma.botMessage.deleteMany({ where: { userId: user.id } });
  redirect("/bot");
}

import { Bot, Check, X } from "lucide-react";

import { PageTitle } from "@/components/PageTitle";
import { Card, buttonClass, subtleButtonClass } from "@/components/ui";
import { aiAvailable } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";

import { askBotAction, clearBotAction, decideProposalAction } from "./actions";

export const metadata = { title: "Bot" };
export const dynamic = "force-dynamic";

const EXAMPLES = ["Who's viewing today?", "Which properties have no viewings booked?", "Fill the viewings at 14 Cotham Hill", "Draft particulars for the Redland flat"];

export default async function BotPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const { q } = await searchParams;
  const messages = await prisma.botMessage.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" }, take: 80 });
  return (
    <>
      <PageTitle
        title="Bot"
        description="Ask about anything in Tenurage, or tell it what to do. Changes wait for your Approve."
        actions={messages.length ? <form action={clearBotAction}><button className={subtleButtonClass}>New conversation</button></form> : null}
      />
      <Card className="flex min-h-[420px] flex-col p-4">
        <div className="flex-1 space-y-3">
          {messages.length === 0 ? (
            <div className="py-10 text-center">
              <Bot className="mx-auto h-8 w-8 text-brand-600" />
              <p className="mt-2 text-sm text-slate-600">{aiAvailable() ? "Try:" : "Bot needs AI to be set up on this deployment."}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((e) => (
                  <form key={e} action={askBotAction}><input type="hidden" name="q" value={e} /><button className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:border-brand-300">{e}</button></form>
                ))}
              </div>
            </div>
          ) : null}
          {messages.map((m) =>
            m.proposal ? (
              <div key={m.id} className="mr-12 rounded-xl border border-brand-200 bg-brand-50/60 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-800">Proposed</p>
                <p className="mt-1 text-slate-900">{m.body}</p>
                {m.status === "pending" ? (
                  <form action={decideProposalAction} className="mt-2 flex gap-2">
                    <input type="hidden" name="id" value={m.id} />
                    <button name="decision" value="approve" className={buttonClass}><Check className="h-4 w-4" /> Approve</button>
                    <button name="decision" value="decline" className={subtleButtonClass}><X className="h-4 w-4" /> Decline</button>
                  </form>
                ) : <p className="mt-1 text-xs text-slate-500">{m.status === "approved" ? "Approved" : "Declined"}</p>}
              </div>
            ) : (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <p className={cn("max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm", m.role === "user" ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-900")}>{m.body}</p>
              </div>
            ),
          )}
        </div>
        <form action={askBotAction} className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
          <input name="q" defaultValue={q ?? ""} autoFocus placeholder="Ask Bot…" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
          <button className={buttonClass}>Send</button>
        </form>
      </Card>
    </>
  );
}

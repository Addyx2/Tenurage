import { Check, Sparkles, X } from "lucide-react";

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
        title="Bot."
        subtitle="Ask, or tell it what to do."
        description="It reads everything in Tenurage. Anything it would change waits for you to approve it."
        actions={messages.length ? <form action={clearBotAction}><button className={subtleButtonClass}>New conversation</button></form> : null}
      />
      <Card className="flex min-h-[460px] flex-col p-4 md:p-6">
        <div className="flex-1 space-y-3">
          {messages.length === 0 ? (
            <div className="py-10 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-ai-500" />
              <p className="mt-2 text-sm text-slate-600">{aiAvailable() ? "Try:" : "Bot needs AI to be set up on this deployment."}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((e) => (
                  <form key={e} action={askBotAction}><input type="hidden" name="q" value={e} /><button className="rounded-full border border-slate-200 px-3.5 py-1.5 text-sm text-slate-700 hover:border-slate-900">{e}</button></form>
                ))}
              </div>
            </div>
          ) : null}
          {messages.map((m) =>
            m.proposal ? (
              <div key={m.id} className="mr-0 rounded-2xl border border-ai-200 bg-ai-50/60 p-4 text-sm md:mr-12">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-ai-600"><Sparkles className="h-3.5 w-3.5" /> Bot proposes</p>
                <p className="mt-1 text-slate-900">{m.body}</p>
                {m.status === "pending" ? (
                  <form action={decideProposalAction} className="mt-3 flex gap-2">
                    <input type="hidden" name="id" value={m.id} />
                    <button name="decision" value="approve" className={buttonClass}><Check className="h-4 w-4" /> Approve</button>
                    <button name="decision" value="decline" className={subtleButtonClass}><X className="h-4 w-4" /> Decline</button>
                  </form>
                ) : <p className="mt-1 text-xs text-slate-500">{m.status === "approved" ? "Approved" : "Declined"}</p>}
              </div>
            ) : (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <p className={cn("max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm", m.role === "user" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-900")}>{m.body}</p>
              </div>
            ),
          )}
        </div>
        <form action={askBotAction} className="mt-4 flex gap-2 border-t border-slate-200 pt-4">
          <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full border border-slate-200 px-4 py-2.5 focus-within:border-slate-900">
            <Sparkles className="h-4 w-4 shrink-0 text-ai-500" aria-hidden="true" />
            <input name="q" defaultValue={q ?? ""} autoFocus placeholder="Ask Bot…" aria-label="Ask Bot" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
          <button className={buttonClass}>Send</button>
        </form>
      </Card>
    </>
  );
}

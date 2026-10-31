import { Badge, Card, buttonClass, inputClass, labelClass, subtleButtonClass } from "@/components/ui";
import { aiAvailable } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { displayPhone } from "@/lib/integrations/phone";
import { sharedSender } from "@/lib/linkbot/sms";

import { retryNumberAction, saveLinkbotAction, setOfficeMobileAction } from "../actions";

export const metadata = { title: "Linkbot settings" };
export const dynamic = "force-dynamic";

export default async function LinkbotSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireUser();
  const { saved, error } = await searchParams;
  const isAdmin = user.role === "ADMIN";
  const [bot, team] = await Promise.all([
    prisma.linkbot.findUnique({ where: { agencyId: user.agencyId } }),
    prisma.user.findMany({ where: { agencyId: user.agencyId, deactivatedAt: null }, orderBy: [{ role: "asc" }, { lastName: "asc" }] }),
  ]);
  const b = bot ?? { name: "Linkbot", tone: "friendly", enabled: true, officeTexts: true, waveSize: 5, waveGapMins: 30, reminderHours: 24 };
  const shared = sharedSender();
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-6">
        {error ? <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {saved ? <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{saved === "new" ? "Linkbot is created. Its number is being set up; refresh in a moment." : "Saved."}</p> : null}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900">{bot ? "Your Linkbot" : "Create your Linkbot"}</h2>
          <form action={saveLinkbotAction} className="mt-4 space-y-4">
            <fieldset disabled={!isAdmin} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className={labelClass} htmlFor="name">Name</label><input id="name" name="name" defaultValue={b.name} maxLength={40} className={`mt-1 ${inputClass}`} /></div>
                <div><label className={labelClass} htmlFor="tone">Tone</label><select id="tone" name="tone" defaultValue={b.tone} className={`mt-1 ${inputClass}`}><option value="friendly">Friendly</option><option value="brief">Brief</option><option value="formal">Formal</option></select></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div><label className={labelClass} htmlFor="waveSize">Applicants asked at a time</label><input id="waveSize" name="waveSize" type="number" min={1} max={20} defaultValue={b.waveSize} className={`mt-1 ${inputClass}`} /></div>
                <div><label className={labelClass} htmlFor="waveGapMins">Minutes before asking more</label><input id="waveGapMins" name="waveGapMins" type="number" min={5} max={480} defaultValue={b.waveGapMins} className={`mt-1 ${inputClass}`} /></div>
                <div><label className={labelClass} htmlFor="reminderHours">Reminder, hours before</label><input id="reminderHours" name="reminderHours" type="number" min={1} max={72} defaultValue={b.reminderHours} className={`mt-1 ${inputClass}`} /></div>
              </div>
              <label className="flex items-start gap-3 text-sm text-slate-700"><input type="checkbox" name="enabled" defaultChecked={b.enabled} className="mt-0.5" /><span><span className="font-medium">Text applicants.</span> Off: nothing is texted.</span></label>
              <label className="flex items-start gap-3 text-sm text-slate-700"><input type="checkbox" name="officeTexts" defaultChecked={b.officeTexts} className="mt-0.5" /><span><span className="font-medium">Take jobs from the office by text,</span> only from the mobiles below. Changes wait for YES and a code.</span></label>
            </fieldset>
            {isAdmin ? <button type="submit" className={buttonClass}>{bot ? "Save" : "Create my Linkbot"}</button> : <p className="text-xs text-slate-500">Only an admin can change these.</p>}
          </form>
        </Card>
        {bot ? (
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Office mobiles</h2>
            <p className="mt-1 text-sm text-slate-500">Texts from these numbers reach {bot.name} as that person: &ldquo;what&apos;s on today?&rdquo;, or &ldquo;fill the viewings at 14 Cotham Hill&rdquo; and reply YES with the code.</p>
            <ul className="mt-3 divide-y divide-slate-100">
              {team.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div><p className="text-sm font-medium text-slate-900">{u.firstName} {u.lastName}</p><p className="text-xs text-slate-500">{u.role === "ADMIN" ? "Admin" : "Negotiator"}</p></div>
                  <form action={setOfficeMobileAction} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <input name="mobile" defaultValue={u.mobile ? displayPhone(u.mobile) : ""} placeholder="07700 900123" disabled={!isAdmin} aria-label={`${u.firstName}'s mobile`} className="w-40 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                    {isAdmin ? <button type="submit" className={subtleButtonClass}>Save</button> : null}
                  </form>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900">Its number</h2>
          {!bot ? (
            <p className="mt-2 text-sm text-slate-500">Create Linkbot and it gets a UK mobile number of its own. You don&apos;t need a Twilio account.</p>
          ) : bot.numberStatus === "active" && bot.number ? (
            <div className="mt-2"><p className="font-display text-2xl font-bold text-slate-900">{displayPhone(bot.number)}</p><Badge tone={bot.enabled ? "green" : "slate"} className="mt-2">{bot.enabled ? "Texting" : "Texting is off"}</Badge></div>
          ) : (
            <div className="mt-2 space-y-2 text-sm">
              <Badge tone={bot.numberStatus === "failed" ? "amber" : "slate"}>{bot.numberStatus === "failed" ? "Couldn't get a number yet" : "Setting up"}</Badge>
              {bot.numberError ? <p className="text-slate-600">{bot.numberError}</p> : null}
              {shared ? <p className="text-slate-500">Meanwhile it texts from the shared Linkbot number.</p> : null}
              {isAdmin ? <form action={retryNumberAction}><button className={subtleButtonClass}>Try again</button></form> : null}
            </div>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900">Answering texts</h2>
          <p className="mt-2 text-sm text-slate-500">{aiAvailable() ? "On. Applicants' and the office's texts are answered by AI, each as the person texting. Every text and job shows under Texts and Activity." : "Off: AI isn't set up on this deployment. Booking codes, reminders and 1–5 feedback still work."}</p>
        </Card>
      </div>
    </div>
  );
}

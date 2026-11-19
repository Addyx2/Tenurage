import Image from "next/image";
import { ArrowRight, Check, FileText, Link2, Plug, Sparkles, Users, X } from "lucide-react";

import { TenurageWordmark } from "@/components/Brand";
import { cn } from "@/lib/utils";

/** tenurage.com: what Tenurage does, in the Open Sky style. `app` is where the product lives ("" on the same host). */
export function Landing({ app }: { app: string }) {
  const signIn = `${app}/login`;
  const signUp = `${app}/signup`;
  const solid = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-slate-900 px-5 py-3 text-[15px] font-medium text-white transition hover:bg-black";
  const outline = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-white px-5 py-3 text-[15px] font-medium text-slate-900 transition hover:border-slate-300";

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 bg-white/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1360px] items-center gap-6 px-4 py-3.5 md:px-10 md:py-4">
          <a href="#top" aria-label="Tenurage"><TenurageWordmark /></a>
          <nav aria-label="Tenurage" className="hidden gap-1 md:flex">
            {[["#linkbot", "Linkbot"], ["#bot", "Bot"], ["#docs", "Docs"], ["#phone", "On your phone"]].map(([href, label]) => (
              <a key={href} href={href} className="rounded-full px-3.5 py-2 text-sm text-slate-500 transition hover:text-slate-900">{label}</a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <a href={signIn} className="hidden rounded-full px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 sm:inline-flex">Sign in</a>
            <a href={signUp} className="hidden rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black sm:inline-flex">Create your agency</a>
            <a href={signIn} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white sm:hidden">Sign in</a>
          </div>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-[1360px] px-4 md:px-10">
        {/* Hero */}
        <section className="pb-10 pt-10 md:pb-14 md:pt-20">
          <p className="mb-4 text-[13px] text-slate-500 md:mb-6">For UK estate and letting agencies</p>
          <h1 className="headline max-w-[1000px] text-[40px] md:text-[76px]">
            Your agency, running itself between viewings. <span className="text-slate-400">You decide.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-slate-600 md:text-lg">
            Tenurage keeps your properties, applicants and viewings in one place, and puts AI to work on them. Linkbot texts matched applicants and books viewings. Bot works through the office&apos;s jobs with you. Docs drafts the paperwork.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={signUp} className={solid}>Create your agency <ArrowRight className="h-4 w-4" /></a>
            <a href={signIn} className={outline}>Sign in</a>
          </div>
        </section>

        <section aria-label="Tenurage, the Today page" className="relative -mx-4 overflow-hidden px-4 pb-12 pt-10 md:mx-0 md:rounded-[28px] md:px-14 md:pb-0 md:pt-16">
          <div className="sky" aria-hidden="true"><i /><i /><i /></div>
          <div className="relative">
            <Image src="/landing/today-desktop.jpg" alt="Tenurage's Today page: tonight's viewing with call, text and directions, and Linkbot suggesting applicants to text for open slots" width={2880} height={1800} priority className="hidden w-full rounded-t-[18px] shadow-float md:block" sizes="(min-width: 1360px) 1250px, 90vw" />
            <PhoneFrame src="/landing/today-phone.jpg" alt="Tenurage's Today page on a phone" className="mx-auto w-[260px] md:absolute md:-bottom-6 md:right-[-8px] md:w-[230px] lg:right-6 lg:w-[260px]" priority />
          </div>
        </section>

        {/* Linkbot */}
        <section id="linkbot" className="grid scroll-mt-24 items-center gap-10 py-16 md:py-28 lg:grid-cols-2 lg:gap-16">
          <div>
            <Eyebrow ai>Linkbot</Eyebrow>
            <h2 className="headline text-[34px] md:text-[52px]">Open the slots. Linkbot fills them. <span className="text-slate-400">By text, a few applicants at a time.</span></h2>
            <ol className="mt-8 space-y-6">
              {[
                ["Finds who fits", "Active applicants who match the property's area, bedrooms and budget, best match first."],
                ["Texts them in waves", "From your agency's own UK mobile number, a few at a time, with a gap between each wave."],
                ["Books the first YES", "Applicants reply YES with their code, and Linkbot books them into a free slot."],
                ["Reminds, then asks", "A reminder before the viewing, and a text afterwards asking how it went. Their answer lands on the applicant's card."],
              ].map(([title, text], i) => (
                <li key={title} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold">{i + 1}</span>
                  <div><h3 className="text-[17px] font-semibold tracking-[-0.01em]">{title}</h3><p className="mt-0.5 text-[15px] leading-relaxed text-slate-600">{text}</p></div>
                </li>
              ))}
            </ol>
            <p className="mt-8 border-t border-slate-200 pt-6 text-[15px] leading-relaxed text-slate-600">Your team can text Linkbot too. Ask for a job from your own mobile, and it waits for you to reply YES with a code before it does it.</p>
          </div>
          <Panel className="flex justify-center px-4 py-10 md:py-14">
            <div className="relative w-full max-w-[360px] rounded-[32px] bg-white p-3 shadow-float">
              <div className="flex items-center gap-2.5 border-b border-slate-100 px-3 pb-3 pt-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ai-50 text-ai-500"><Sparkles className="h-4 w-4" /></span>
                <div><p className="text-sm font-semibold">Demo Lettings</p><p className="text-xs text-slate-500">Linkbot · example texts</p></div>
              </div>
              <div className="space-y-2.5 px-2 py-4 text-[14px] leading-snug">
                <Bubble out delay={0.2}>Demo Lettings: hi Jordan, a 2-bed flat at 14 Cotham Grove, Bristol (£1,450 pcm) matches what you&apos;re after. Viewings: Thu 17:30, Thu 17:50, Fri 12:00. Reply YES 4821 for the first free slot, or YES 4821 and a time. Reply NO 4821 if not.</Bubble>
                <Bubble delay={1.4}>YES 4821 friday</Bubble>
                <Bubble out delay={2.4}>Booked: Fri 12:00 at 14 Cotham Grove, Bristol. We&apos;ll text a reminder. Reply if you can&apos;t make it.</Bubble>
              </div>
            </div>
          </Panel>
        </section>

        {/* Bot */}
        <section id="bot" className="grid scroll-mt-24 items-center gap-10 border-t border-slate-200 py-16 md:py-28 lg:grid-cols-2 lg:gap-16">
          <Panel className="order-last p-5 md:p-10 lg:order-first">
            <div className="rounded-[22px] bg-white p-5 shadow-float">
              <div className="flex justify-end"><p className="max-w-[80%] rounded-2xl bg-slate-900 px-3.5 py-2 text-sm text-white">Fill the viewings at 14 Cotham Grove</p></div>
              <div className="mt-3 rounded-2xl border border-ai-200 bg-ai-50/60 p-4 text-sm">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-ai-600"><Sparkles className="h-3.5 w-3.5" /> Bot proposes</p>
                <p className="mt-1.5 text-slate-900">Have Linkbot text matched applicants about the 3 open viewing slots at 14 Cotham Grove.</p>
                <div className="mt-3 flex gap-2" aria-hidden="true">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-2 text-sm font-medium text-white"><Check className="h-4 w-4" /> Approve</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium"><X className="h-4 w-4" /> Decline</span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2.5 rounded-full border border-slate-200 px-4 py-2.5 text-sm text-slate-500"><Sparkles className="h-4 w-4 text-ai-500" /> Ask Bot…</div>
            </div>
          </Panel>
          <div>
            <Eyebrow ai>Bot</Eyebrow>
            <h2 className="headline text-[34px] md:text-[52px]">Ask in plain English. <span className="text-slate-400">Nothing changes until you approve it.</span></h2>
            <p className="mt-6 text-[17px] leading-relaxed text-slate-600">Bot reads everything in Tenurage: properties, applicants, viewings and texts. Ask who&apos;s viewing today, or which properties have no viewings booked. Tell it to open slots, fill a property, text an applicant or change a status, and it proposes the change for you to approve.</p>
            <p className="mt-4 text-[17px] leading-relaxed text-slate-600">The Ask Bot bar is on every page, so the question is never more than a keystroke away.</p>
          </div>
        </section>

        {/* Docs */}
        <section id="docs" className="grid scroll-mt-24 items-center gap-10 border-t border-slate-200 py-16 md:py-28 lg:grid-cols-2 lg:gap-16">
          <div>
            <Eyebrow ai>Docs</Eyebrow>
            <h2 className="headline text-[34px] md:text-[52px]">The paperwork, drafted. <span className="text-slate-400">From the details you already have.</span></h2>
            <p className="mt-6 text-[17px] leading-relaxed text-slate-600">Property particulars, viewing confirmations and short letters, drafted from what&apos;s on file. The AI writes only from the facts it&apos;s given and never invents rooms, sizes or views. Every draft waits for someone to check it before it&apos;s final.</p>
          </div>
          <Panel className="p-5 md:p-10">
            <article className="rounded-[22px] bg-white p-6 shadow-float md:p-8">
              <p className="flex items-center gap-2 text-xs text-slate-500"><FileText className="h-4 w-4" /> Particulars · <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">Draft</span></p>
              <h3 className="mt-4 text-xl font-semibold tracking-[-0.02em]">14 Cotham Grove, Bristol BS6 6AL</h3>
              <p className="text-sm text-slate-500">2 bedroom flat · £1,450 pcm</p>
              <div className="mt-5 space-y-2.5" aria-hidden="true">
                {["w-full", "w-[94%]", "w-[97%]", "w-[78%]"].map((w) => <div key={w} className={cn("h-2.5 rounded-full bg-slate-100", w)} />)}
              </div>
              <ul className="mt-5 flex flex-wrap gap-1.5 text-xs text-slate-700">
                {["Gas central heating", "Bike store", "Unfurnished"].map((f) => <li key={f} className="rounded-full bg-slate-100 px-3 py-1">{f}</li>)}
              </ul>
              <p className="mt-5 border-t border-slate-200 pt-4 text-xs text-slate-500">These particulars are a draft: check every detail before publishing.</p>
            </article>
          </Panel>
        </section>

        {/* Phone */}
        <section id="phone" className="scroll-mt-24 border-t border-slate-200 py-16 md:py-28">
          <div className="max-w-3xl">
            <Eyebrow>On your phone</Eyebrow>
            <h2 className="headline text-[34px] md:text-[52px]">Built for the car park between viewings. <span className="text-slate-400">Everything works on a phone.</span></h2>
            <p className="mt-6 text-[17px] leading-relaxed text-slate-600">Today puts the next viewing first, with call, text and directions. Properties and the applicant pipeline are a tap away along the bottom.</p>
          </div>
          <div className="relative mt-10 overflow-hidden rounded-[28px] px-4 py-10 md:mt-14 md:py-16">
            <div className="sky" aria-hidden="true"><i /><i /><i /></div>
            <div className="relative flex snap-x gap-5 overflow-x-auto pb-2 md:justify-center md:gap-8 md:overflow-visible">
              <PhoneFrame src="/landing/today-phone.jpg" alt="Today on a phone: the next viewing first" className="w-[230px] shrink-0 snap-center md:w-[260px]" />
              <PhoneFrame src="/landing/properties-phone.jpg" alt="Properties as photo cards on a phone" className="w-[230px] shrink-0 snap-center md:mt-12 md:w-[260px]" />
              <PhoneFrame src="/landing/applicants-phone.jpg" alt="The applicant pipeline on a phone" className="w-[230px] shrink-0 snap-center md:w-[260px]" />
            </div>
          </div>
        </section>

        {/* Fits */}
        <section className="border-t border-slate-200 py-16 md:py-24">
          <h2 className="headline max-w-3xl text-[34px] md:text-[52px]">Fits how you already work.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-5">
            {[
              { icon: Plug, title: "Reapit", text: "Bring in your properties and applicants from Reapit. Tenurage keeps its own viewings and texts alongside them." },
              { icon: Link2, title: "Your photos and video tours", text: "Link the photos and video tours you already host. They lead every property and play on Today." },
              { icon: Users, title: "Your whole team", text: "Admins and negotiators each have their own sign-in, and every change is recorded." },
            ].map((c) => (
              <div key={c.title} className="rounded-card border border-line p-6 md:p-7">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100"><c.icon className="h-5 w-5" /></span>
                <h3 className="mt-5 text-lg font-semibold tracking-[-0.015em]">{c.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{c.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Call to action */}
        <section className="relative mb-16 overflow-hidden rounded-[28px] px-6 py-16 md:mb-24 md:px-14 md:py-24">
          <div className="sky" aria-hidden="true"><i /><i /><i /></div>
          <div className="relative max-w-3xl">
            <h2 className="headline text-[36px] md:text-[60px]">Set up your agency. <span className="text-slate-900/45">Let Linkbot take the first viewings.</span></h2>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={signUp} className={solid}>Create your agency <ArrowRight className="h-4 w-4" /></a>
              <a href={signIn} className={outline}>Sign in</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500 md:px-10">
          <TenurageWordmark />
          <div className="flex gap-5"><a href={signIn} className="hover:text-slate-900">Sign in</a><a href={signUp} className="hover:text-slate-900">Create your agency</a></div>
          <p className="w-full md:w-auto">&copy; 2026 Aultrum Technologies Ltd.</p>
        </div>
      </footer>
    </div>
  );
}

function Eyebrow({ children, ai = false }: { children: React.ReactNode; ai?: boolean }) {
  return <p className={cn("mb-4 flex items-center gap-1.5 text-sm font-semibold", ai ? "text-ai-500" : "text-slate-500")}>{ai ? <Sparkles className="h-4 w-4" /> : null}{children}</p>;
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-[28px]", className)}>
      <div className="sky" aria-hidden="true"><i /><i /><i /></div>
      <div className="relative w-full">{children}</div>
    </div>
  );
}

function PhoneFrame({ src, alt, className, priority = false }: { src: string; alt: string; className?: string; priority?: boolean }) {
  return (
    <div className={cn("rounded-[34px] bg-white p-2 shadow-float", className)}>
      <Image src={src} alt={alt} width={780} height={1328} priority={priority} sizes="260px" className="h-auto w-full rounded-[27px]" />
    </div>
  );
}

function Bubble({ children, out = false, delay }: { children: React.ReactNode; out?: boolean; delay: number }) {
  return (
    <div className={cn("text-in flex", out ? "justify-start" : "justify-end")} style={{ animationDelay: `${delay}s` }}>
      <p className={cn("max-w-[85%] rounded-2xl px-3.5 py-2", out ? "bg-slate-100 text-slate-900" : "bg-slate-900 text-white")}>{children}</p>
    </div>
  );
}

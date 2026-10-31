import Link from "next/link";

import { TenurageWordmark } from "@/components/Brand";
import { DEMO_MODE } from "@/lib/constants";

import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-brand-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-brand-600/30 blur-3xl" />
        <span className="relative font-display text-lg font-bold">Tenurage</span>
        <div className="relative max-w-md">
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight">Your agency, running itself between viewings.</h1>
          <p className="mt-4 text-base leading-relaxed text-white/70">Linkbot texts applicants and books viewings. Bot works with your office. Docs drafts the paperwork. You decide.</p>
        </div>
        <p className="relative text-xs text-white/40">&copy; 2026 Aultrum Technologies Ltd.</p>
      </section>
      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-10"><TenurageWordmark /></div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">Sign in</h2>
          <p className="mb-6 mt-1 text-sm text-slate-500">to your agency</p>
          <LoginForm next={next} demo={DEMO_MODE} />
          <p className="mt-6 text-center text-sm text-slate-500">New agency? <Link href="/signup" className="font-medium text-brand-700">Create one</Link></p>
        </div>
      </section>
    </main>
  );
}

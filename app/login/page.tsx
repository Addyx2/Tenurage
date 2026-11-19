import Link from "next/link";

import { TenurageWordmark } from "@/components/Brand";
import { DEMO_MODE } from "@/lib/constants";

import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative m-3 hidden overflow-hidden rounded-[28px] p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="sky" aria-hidden="true"><i /><i /><i /></div>
        <span className="relative"><TenurageWordmark /></span>
        <div className="relative max-w-lg">
          <h1 className="headline text-5xl">Your agency, running itself between viewings. <span className="text-slate-900/45">You decide.</span></h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-slate-800">Linkbot texts applicants and books viewings. Bot works with your office. Docs drafts the paperwork.</p>
        </div>
        <p className="relative text-xs text-slate-700">&copy; 2026 Aultrum Technologies Ltd.</p>
      </section>
      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden"><TenurageWordmark /></div>
          <h2 className="headline text-3xl">Sign in</h2>
          <p className="mb-6 mt-1 text-sm text-slate-500">to your agency</p>
          <LoginForm next={next} demo={DEMO_MODE} />
          <p className="mt-6 text-center text-sm text-slate-500">New agency? <Link href="/signup" className="font-medium text-slate-900 underline">Create one</Link></p>
        </div>
      </section>
    </main>
  );
}

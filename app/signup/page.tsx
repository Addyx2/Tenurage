import Link from "next/link";

import { TenurageWordmark } from "@/components/Brand";

import { SignupForm } from "./SignupForm";

export const metadata = { title: "Create your agency" };

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-10"><TenurageWordmark /></div>
        <h1 className="headline text-3xl">Create your agency</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">You&apos;ll be its admin. Add your team in Settings.</p>
        <SignupForm />
        <p className="mt-6 text-center text-sm text-slate-500">Already on Tenurage? <Link href="/login" className="font-medium text-slate-900 underline">Sign in</Link></p>
      </div>
    </main>
  );
}

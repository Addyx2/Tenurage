import Link from "next/link";
import { after } from "next/server";
import { LogOut } from "lucide-react";

import { TenurageWordmark } from "@/components/Brand";
import { Sidebar } from "@/components/Sidebar";
import { requireUser } from "@/lib/auth";
import { maybeTick } from "@/lib/linkbot/campaign";

import { logoutAction } from "../login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // Linkbot moves on (next waves, reminders, feedback) whenever the office is using Tenurage.
  after(() => maybeTick());
  return (
    <div className="min-h-screen bg-slate-50/60 lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="border-b border-slate-200 bg-white px-3 py-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r">
        <Link href="/launchpad" className="px-2"><TenurageWordmark /></Link>
        <div className="mt-6 hidden lg:block lg:flex-1 lg:overflow-y-auto"><Sidebar /></div>
        <details className="mt-3 lg:hidden">
          <summary className="cursor-pointer px-2 text-sm font-medium text-slate-600">Menu</summary>
          <div className="mt-3"><Sidebar /></div>
        </details>
        <div className="mt-4 hidden border-t border-slate-100 pt-3 lg:block">
          <p className="truncate px-2 text-sm font-medium text-slate-900">{user.firstName} {user.lastName}</p>
          <p className="truncate px-2 text-xs text-slate-500">{user.agency.name}</p>
          <form action={logoutAction}>
            <button type="submit" className="mt-2 flex items-center gap-1.5 px-2 text-xs font-medium text-slate-500 hover:text-slate-800"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}

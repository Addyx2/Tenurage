import Link from "next/link";
import { after } from "next/server";
import { LogOut } from "lucide-react";

import { AccountMenu, TabBar, TopNav } from "@/components/AppNav";
import { AskBot } from "@/components/AskBot";
import { TenurageWordmark } from "@/components/Brand";
import { requireUser } from "@/lib/auth";
import { maybeTick } from "@/lib/linkbot/campaign";

import { logoutAction } from "../login/actions";
import { askBotAction } from "./bot/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // Linkbot moves on (next waves, reminders, feedback) whenever the office is using Tenurage.
  after(() => maybeTick());
  const signOut = (
    <form action={logoutAction}>
      <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"><LogOut className="h-4 w-4" /> Sign out</button>
    </form>
  );
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-transparent bg-white/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-4 py-3.5 md:px-10 md:py-4 lg:gap-7">
          <Link href="/today" aria-label="Tenurage, today"><TenurageWordmark /></Link>
          <TopNav />
          <div className="ml-auto flex items-center gap-3">
            <AskBot action={askBotAction} variant="top" />
            <AccountMenu initials={`${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()} name={`${user.firstName} ${user.lastName}`} agency={user.agency.name} signOut={signOut} />
          </div>
        </div>
      </header>
      <main className="pb-tabbar mx-auto min-w-0 max-w-[1440px] px-4 md:px-10 md:pb-20">
        <AskBot action={askBotAction} variant="inline" className="mt-2 md:mt-4" />
        {children}
      </main>
      <TabBar />
    </div>
  );
}

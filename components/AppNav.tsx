"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Sparkles, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`) || (href === "/today" && pathname.startsWith("/launchpad"));

const TOP = [
  { href: "/today", label: "Today" },
  { href: "/properties", label: "Properties" },
  { href: "/applicants", label: "Applicants" },
  { href: "/viewings", label: "Viewings" },
  { href: "/bot", label: "Bot" },
  { href: "/linkbot", label: "Linkbot" },
  { href: "/docs", label: "Docs" },
];

/** Desktop and tablet: pills across the top. */
export function TopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Tenurage" className="hidden items-center gap-0.5 md:flex">
      {TOP.map((l) => {
        const on = isActive(pathname, l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={on ? "page" : undefined}
            className={cn("rounded-full px-3 py-2 text-sm transition lg:px-3.5", on ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900")}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

const TABS = [
  { href: "/today", label: "Today", icon: CalendarDays },
  { href: "/properties", label: "Properties", icon: Home },
  { href: "/applicants", label: "Applicants", icon: Users },
  { href: "/bot", label: "Bot", icon: Sparkles, ai: true },
];

/** Phones (under 760px): four tabs along the bottom. */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Tenurage" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white/85 px-2 pt-2 backdrop-blur-xl md:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      {TABS.map((t) => {
        const on = isActive(pathname, t.href);
        return (
          <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} className={cn("flex flex-1 flex-col items-center gap-1 py-1 text-[11px]", on ? "font-medium text-slate-900" : "text-slate-500")}>
            <t.icon className={cn("h-[22px] w-[22px]", t.ai && "text-ai-500")} strokeWidth={on ? 2 : 1.7} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

const MORE = [
  { href: "/viewings", label: "Viewings", phoneOnly: true },
  { href: "/linkbot", label: "Linkbot", phoneOnly: true },
  { href: "/docs", label: "Docs", phoneOnly: true },
  { href: "/integrations", label: "Integrations" },
  { href: "/settings", label: "Settings" },
];

/** The person's menu: the rest of Tenurage, and sign out. */
export function AccountMenu({ initials, name, agency, signOut }: { initials: string; name: string; agency: string; signOut: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <details className="group relative" key={pathname}>
      <summary aria-label="Menu" className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white [&::-webkit-details-marker]:hidden">
        {initials}
      </summary>
      <div className="absolute right-0 top-11 z-40 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-pop">
        <div className="px-3 py-2">
          <p className="truncate text-sm font-medium text-slate-900">{name}</p>
          <p className="truncate text-xs text-slate-500">{agency}</p>
        </div>
        <ul className="border-t border-slate-100 pt-1">
          {MORE.map((m) => (
            <li key={m.href} className={m.phoneOnly ? "md:hidden" : undefined}>
              <Link href={m.href} className={cn("block rounded-lg px-3 py-2 text-sm hover:bg-slate-50", isActive(pathname, m.href) ? "text-slate-900" : "text-slate-600")}>{m.label}</Link>
            </li>
          ))}
        </ul>
        <div className="mt-1 border-t border-slate-100 pt-1">{signOut}</div>
      </div>
    </details>
  );
}

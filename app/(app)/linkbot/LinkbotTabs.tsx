"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/linkbot", label: "Activity", match: (p: string) => p === "/linkbot" },
  { href: "/linkbot/texts", label: "Texts", match: (p: string) => p.startsWith("/linkbot/texts") },
  { href: "/linkbot/settings", label: "Settings", match: (p: string) => p.startsWith("/linkbot/settings") },
];

export function LinkbotTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Linkbot" className="flex gap-1 rounded-lg bg-slate-100 p-1">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.match(pathname) ? "page" : undefined} className={cn("rounded-md px-3 py-1.5 text-sm font-medium", t.match(pathname) ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

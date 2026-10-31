"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, CalendarClock, FileText, Gauge, Home, MessageSquareText, Plug, Settings, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const GROUPS = [
  {
    label: "Agency",
    links: [
      { href: "/launchpad", label: "Launchpad", icon: Gauge },
      { href: "/properties", label: "Properties", icon: Home },
      { href: "/applicants", label: "Applicants", icon: Users },
      { href: "/viewings", label: "Viewings", icon: CalendarClock },
    ],
  },
  {
    label: "AI",
    links: [
      { href: "/bot", label: "Bot", icon: Bot },
      { href: "/linkbot", label: "Linkbot", icon: MessageSquareText },
      { href: "/docs", label: "Docs", icon: FileText },
    ],
  },
  {
    label: "Connect",
    links: [
      { href: "/integrations", label: "Integrations", icon: Plug },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Tenurage" className="space-y-6">
      {GROUPS.map((g) => (
        <div key={g.label}>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{g.label}</p>
          <ul className="mt-1.5 space-y-0.5">
            {g.links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                      active ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <l.icon className={cn("h-4 w-4", active ? "text-brand-700" : "text-slate-400")} />
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

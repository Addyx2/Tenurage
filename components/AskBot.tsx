"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * "Ask Bot" on every page. Sends the question straight to Bot; "/" jumps to it.
 * `variant="top"` sits in the header on wide screens, `"inline"` above the page elsewhere.
 */
export function AskBot({ action, variant, placeholder = "Ask Bot anything…", inHero = false, className }: { action: (form: FormData) => Promise<void>; variant: "top" | "inline"; placeholder?: string; inHero?: boolean; className?: string }) {
  const pathname = usePathname();
  useEffect(() => {
    if (variant !== "top") return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || t?.closest("input, textarea, select, [contenteditable]")) return;
      const visible = [...document.querySelectorAll<HTMLInputElement>("[data-ask-bot] input")].find((i) => i.offsetParent !== null);
      if (visible) {
        e.preventDefault();
        visible.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant]);
  if (pathname === "/bot" || (variant === "inline" && pathname === "/today" && !inHero)) return null;
  return (
    <form
      action={action}
      data-ask-bot
      className={cn(
        "flex items-center gap-2.5 rounded-full border border-slate-200 bg-white text-sm transition focus-within:border-slate-900",
        variant === "top" ? "hidden w-[300px] px-3.5 py-2 xl:flex" : "px-4 py-3 xl:hidden",
        className,
      )}
    >
      <Sparkles className="h-4 w-4 shrink-0 text-ai-500" aria-hidden="true" />
      <input name="q" required maxLength={2000} placeholder={placeholder} aria-label="Ask Bot" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-500" />
      {variant === "top" ? <kbd className="rounded-md border border-slate-200 px-1.5 text-xs text-slate-500">/</kbd> : null}
    </form>
  );
}

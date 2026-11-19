import Link from "next/link";
import { Sparkles } from "lucide-react";

import { money } from "@/lib/matching";
import { statusLabel } from "@/lib/status";
import { cn } from "@/lib/utils";

import { PropertyMedia } from "./media";

export interface CardProperty {
  id: string;
  address: string;
  postcode: string;
  kind: string;
  bedrooms: number;
  price: number;
  market: string;
  status: string;
  photos: string[];
  videoUrl: string | null;
}

/** The first line of the address, for cards: "3 Ashley Hill, Bristol" → "3 Ashley Hill". */
export const street = (address: string) => address.split(",")[0]!.trim();

/** A property as a photo card: status, price, viewings, and "Fill with Linkbot" when it has free slots. */
export function PropertyCard({ p, booked, open, filling, fillAction }: { p: CardProperty; booked: number; open: number; filling?: boolean; fillAction?: (form: FormData) => Promise<void> }) {
  const closed = !["AVAILABLE", "UNDER_OFFER"].includes(p.status);
  const viewings = closed ? "Closed" : booked || open ? `${booked} booked · ${open} open slot${open === 1 ? "" : "s"}` : "No viewings yet";
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card border border-line bg-white transition duration-200 hover:shadow-card-hover">
      <Link href={`/properties/${p.id}`} className="absolute inset-0 z-10" aria-label={p.address} />
      <PropertyMedia property={p} />
      <span className={cn("absolute right-3 top-2.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-[0_1px_4px_rgba(0,0,0,0.08)]", p.status === "AVAILABLE" ? "bg-white text-slate-900" : "bg-slate-900 text-white")}>
        {p.status === "AVAILABLE" ? (p.market === "SALE" ? "For sale" : "To let") : statusLabel(p.status)}
      </span>
      <div className="flex flex-1 flex-col p-3 sm:px-[18px] sm:pb-[18px] sm:pt-4">
        <h3 className="text-[15px] font-semibold tracking-[-0.015em] sm:text-lg">{street(p.address)}</h3>
        <p className="text-xs text-slate-500 sm:text-sm">{p.postcode} · {p.bedrooms} bed {p.kind}</p>
        <p className="tabular mb-0.5 mt-2 text-base font-semibold tracking-[-0.02em] sm:text-xl">{money(p.price, p.market)}</p>
        <p className="text-xs text-slate-500 sm:text-[13px]">{viewings}</p>
        {filling ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-ai-600"><Sparkles className="h-3.5 w-3.5" /> Linkbot is filling slots</p>
        ) : fillAction && p.status === "AVAILABLE" && open > 0 ? (
          <form action={fillAction} className="relative z-20 mt-auto pt-3.5">
            <input type="hidden" name="propertyId" value={p.id} />
            <button className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-slate-900 px-3 py-2 text-[13px] font-medium text-white hover:bg-black">
              <Sparkles className="h-3.5 w-3.5 text-ai-500" /> Fill with Linkbot
            </button>
          </form>
        ) : null}
      </div>
    </article>
  );
}

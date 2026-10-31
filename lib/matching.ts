// Which applicants a property suits, and why. An applicant matches when the
// property is the market they want (sale or let), has at least the bedrooms
// they need, is within budget, and is in one of their areas (a postcode
// district like "BS6", or a town in the address). No areas means anywhere.
// Best matches first: the ones whose budget the price uses most fully, then
// the closest on bedrooms.

export interface PropertyFacts {
  market: string;
  bedrooms: number;
  price: number;
  postcode: string;
  address: string;
}

export interface ApplicantFacts {
  id: string;
  market: string;
  minBedrooms: number;
  maxPrice: number;
  areas: string[];
}

/** "BS6 5QX" → "BS6". */
export function outwardCode(postcode: string): string {
  const compact = postcode.toUpperCase().replace(/\s+/g, "");
  return compact.length > 3 ? compact.slice(0, -3) : compact;
}

export function inArea(p: Pick<PropertyFacts, "postcode" | "address">, areas: string[]): boolean {
  const wanted = areas.map((a) => a.trim()).filter(Boolean);
  if (wanted.length === 0) return true;
  const district = outwardCode(p.postcode);
  const address = p.address.toLowerCase();
  return wanted.some((a) => {
    const up = a.toUpperCase().replace(/\s+/g, "");
    // "BS6" matches BS6 only (not BS61); "BS" alone matches the whole BS area.
    if (/^[A-Z]{1,2}\d[A-Z\d]?$/.test(up)) return district === up;
    if (/^[A-Z]{1,2}$/.test(up)) return district.replace(/\d.*$/, "") === up;
    return address.includes(a.toLowerCase());
  });
}

/** Why an applicant isn't a match, or null when they are. */
export function mismatch(p: PropertyFacts, a: ApplicantFacts): string | null {
  if (a.market !== p.market) return a.market === "SALE" ? "wants to buy" : "wants to rent";
  if (p.bedrooms < a.minBedrooms) return `needs ${a.minBedrooms}+ bedrooms`;
  if (p.price > a.maxPrice) return `budget £${a.maxPrice.toLocaleString("en-GB")}`;
  if (!inArea(p, a.areas)) return `looking in ${a.areas.join(", ")}`;
  return null;
}

export function matches<A extends ApplicantFacts>(p: PropertyFacts, applicants: A[]): A[] {
  return applicants
    .filter((a) => mismatch(p, a) === null)
    .sort((x, y) => p.price / y.maxPrice - p.price / x.maxPrice || Math.abs(p.bedrooms - x.minBedrooms) - Math.abs(p.bedrooms - y.minBedrooms));
}

export const money = (n: number, market: string) => `£${n.toLocaleString("en-GB")}${market === "LET" ? " pcm" : ""}`;

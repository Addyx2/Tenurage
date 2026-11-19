// Where each applicant is: new → viewing booked → viewed → offer → let/sold.
// The first three come from their viewings; the office moves them on to
// offer and agreed (offerStage) because Tenurage can't see offers itself.

export const STAGES = ["NEW", "BOOKED", "VIEWED", "OFFER", "AGREED"] as const;
export type Stage = (typeof STAGES)[number];

export interface StageViewing {
  status: string;
  startAt: Date;
}

export function stageOf(a: { offerStage: string | null; viewings: StageViewing[] }, now = new Date()): Stage {
  if (a.offerStage === "AGREED" || a.offerStage === "OFFER") return a.offerStage;
  if (a.viewings.some((v) => v.status === "BOOKED" && v.startAt > now)) return "BOOKED";
  if (a.viewings.some((v) => v.status === "DONE" || (v.status === "BOOKED" && v.startAt <= now))) return "VIEWED";
  return "NEW";
}

export function stageLabel(stage: Stage, market: string): string {
  switch (stage) {
    case "NEW":
      return "New";
    case "BOOKED":
      return "Viewing booked";
    case "VIEWED":
      return "Viewed";
    case "OFFER":
      return market === "SALE" ? "Offer" : "Applied";
    case "AGREED":
      return market === "SALE" ? "Sold" : "Let";
  }
}

export const STAGE_TITLES: Record<Stage, string> = { NEW: "New", BOOKED: "Viewing booked", VIEWED: "Viewed", OFFER: "Offer", AGREED: "Let / sold" };

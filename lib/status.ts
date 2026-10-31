export const STATUS_TONE: Record<string, "green" | "amber" | "blue" | "slate"> = { AVAILABLE: "green", UNDER_OFFER: "amber", LET_AGREED: "amber", SOLD: "blue", LET: "blue", WITHDRAWN: "slate" };
export const statusLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace("_", " ");

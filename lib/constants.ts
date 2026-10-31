export const SESSION_COOKIE = "tenurage_session";
export const APP_NAME = "Tenurage";

// Demo affordances (pre-filled credentials on the sign-in page): local development only,
// or a deployment that sets NEXT_PUBLIC_DEMO_MODE=true.
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.NODE_ENV !== "production";

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MINUTES = 15;

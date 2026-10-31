import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";

import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm", display: "swap", weight: ["400", "500", "600", "700"] });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "Tenurage: the AI-run estate and letting agency", template: "%s · Tenurage" },
  description: "Tenurage runs your viewings, applicants and paperwork with AI: Linkbot texts applicants and books viewings, Bot works with your office, Docs drafts the paperwork.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${dmSans.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

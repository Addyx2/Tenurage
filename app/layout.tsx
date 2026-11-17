import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter_Tight } from "next/font/google";

import "./globals.css";

const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", display: "swap", weight: ["400", "500", "600", "700"] });
const instrument = Instrument_Serif({ subsets: ["latin"], variable: "--font-instrument", display: "swap", weight: "400", style: ["normal", "italic"] });

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1, viewportFit: "cover" };

export const metadata: Metadata = {
  title: { default: "Tenurage: the AI-run estate and letting agency", template: "%s · Tenurage" },
  description: "Tenurage runs your viewings, applicants and paperwork with AI: Linkbot texts applicants and books viewings, Bot works with your office, Docs drafts the paperwork.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${interTight.variable} ${instrument.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

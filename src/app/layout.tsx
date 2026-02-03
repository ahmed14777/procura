import type { Metadata } from "next";
import { DM_Sans, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

// Primary sans-serif font
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

// Elegant serif font for legal/professional contexts
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Procura Francesca | Easy2Do × Avv. Francesca Guicciardini",
  description:
    "Strumento professionale per la generazione di procure e comunicazioni PEC per pratiche di protezione internazionale e accesso agli atti.",
  keywords: [
    "procura",
    "avvocato",
    "immigrazione",
    "protezione internazionale",
    "PEC",
    "commissione territoriale",
  ],
  authors: [{ name: "Ayado" }],
  robots: "noindex, nofollow", // Internal tool, not for public indexing
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className={`${dmSans.variable} ${cormorant.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import {
  Playfair_Display_SC,
  Playfair_Display,
  Syne,
  Source_Sans_3,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";

const playfairSC = Playfair_Display_SC({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-playfair-sc",
});
const playfair = Playfair_Display({
  weight: ["400", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-playfair",
});
const syne = Syne({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-syne",
});
const sourceSans = Source_Sans_3({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-source-sans",
});
const jetbrains = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "DEQODE EARTH — Asia-Pacific Climate Displacement Intelligence",
  description:
    "Sovereign satellite intelligence for climate relocation and retreat planning across the Asia-Pacific.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${playfairSC.variable} ${playfair.variable} ${syne.variable} ${sourceSans.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-ocean text-[var(--text)] font-sans">{children}</body>
    </html>
  );
}

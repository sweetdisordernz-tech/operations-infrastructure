import type { Metadata } from "next";
import { Francois_One, DM_Sans, Red_Hat_Text } from "next/font/google";
import "./globals.css";

// Design system typography (Section 15.1 of the brief): Francois One for
// headings, DM Sans for body, Red Hat Text for UI chrome (buttons/labels).
// Loaded once, globally, via next/font so Google Fonts are self-hosted
// (no runtime request, no layout shift) and exposed as CSS variables that
// globals.css's type-scale classes reference.
const francoisOne = Francois_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-heading",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});

const redHatText = Red_Hat_Text({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ui",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sweet Disorder Ops",
  description: "Internal operations platform for Sweet Disorder",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${francoisOne.variable} ${dmSans.variable} ${redHatText.variable}`}>
      <body>{children}</body>
    </html>
  );
}

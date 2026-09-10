import type { Metadata } from "next";
import { Francois_One, DM_Sans, Red_Hat_Text, Caveat } from "next/font/google";
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

// The one deliberate departure from the three-font system above: a script
// face used ONLY for small, specific personality moments on the Wholesale
// Portal (a hero accent, a handwritten-style note) - see .sd-script-accent
// in globals.css. Echoes the cursive "sweet" script on the actual product
// labels (Bah Humbug/Merry Crisis/Bullshit Blockers - see
// public/product-images/) sitting above the bold stamped wordmark, the
// same two-register mix the real brand uses. Not wired into the shared
// --font-* variable set on purpose - it's not a fourth system-wide font,
// just an accent reached for by name where it earns its place.
const caveat = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-script",
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
    <html
      lang="en"
      className={`${francoisOne.variable} ${dmSans.variable} ${redHatText.variable} ${caveat.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}

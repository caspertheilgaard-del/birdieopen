import type { Metadata, Viewport } from "next";
import { Barlow, Source_Serif_4 } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCurrentSeason } from "@/lib/data";
import "./globals.css";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

// Masters sets its headlines in Tiempos; Source Serif is the closest thing
// with an open licence, and holds up at both 60px and 13px.
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Birdie Open",
    template: "%s · Birdie Open",
  },
  description: "Invitation-only golfturnering siden 2012.",
  appleWebApp: { capable: true, title: "Birdie Open", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon-192.png", apple: "/icon-180.png" },
};

export const viewport: Viewport = {
  themeColor: "#006747",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const season = await getCurrentSeason();

  return (
    <html lang="da" className={`${barlow.variable} ${sourceSerif.variable}`}>
      <body>
        <div className="shell">
          <SiteHeader season={season.year} />
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
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

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-barlow-condensed",
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
  themeColor: "#0a281c",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const season = await getCurrentSeason();

  return (
    <html lang="da" className={`${barlow.variable} ${barlowCondensed.variable}`}>
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

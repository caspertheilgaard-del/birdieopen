"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// No "home" item: the mark takes you there, the way it does on any tour site.
const NAV = [
  { href: "/stilling", label: "Stilling" },
  { href: "/turneringsplan", label: "Turneringsplan" },
  { href: "/birdielisten", label: "Birdielisten" },
  { href: "/deltagere", label: "Deltagere" },
  { href: "/regler", label: "Regler" },
  { href: "/live", label: "Live" },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ season }: { season?: number }) {
  const pathname = usePathname() ?? "/";

  return (
    <header className="header">
      <div className="header__bar">
        <Link href="/" className="header__brand">
          {/* The mark sits straight on the green, no card behind it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark-white.png" alt="" width={44} height={51} className="header__mark" />
          <span>
            <span className="header__title">Birdie Open</span>
            <span className="header__tagline">Invitational golf siden 2012</span>
          </span>
        </Link>
        <nav className="nav" aria-label="Hovedmenu">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav__link"
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
          {season ? <span className="season-badge">Sæson {season}</span> : null}
        </nav>
      </div>
    </header>
  );
}

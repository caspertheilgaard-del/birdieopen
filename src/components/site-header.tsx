"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Forside" },
  { href: "/stilling", label: "Stilling" },
  { href: "/turneringsplan", label: "Turneringsplan" },
  { href: "/birdielisten", label: "Birdielisten" },
  { href: "/deltagere", label: "Deltagere" },
  { href: "/regler", label: "Regler" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ season }: { season?: number }) {
  const pathname = usePathname() ?? "/";

  return (
    <header className="header">
      <div className="header__bar">
        <Link href="/" className="header__brand">
          <span className="logo-chip">
            <Image src="/logo.png" alt="" width={42} height={42} style={{ objectFit: "contain" }} priority />
          </span>
          <span>
            <span className="header__title">BIRDIE OPEN</span>
            <span className="header__tagline" style={{ display: "block" }}>
              Invitational golf siden 2012
            </span>
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
          {season ? <span className="season-badge">SÆSON {season}</span> : null}
        </nav>
      </div>
    </header>
  );
}

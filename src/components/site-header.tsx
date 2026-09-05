"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

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
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const headerRef = useRef<HTMLElement>(null);

  // Landing on a new page should never leave the menu hanging open.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointerDown(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <header className={`header${open ? " is-open" : ""}`} ref={headerRef}>
      <div className="header__bar">
        <Link href="/" className="header__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark-white.png" alt="" width={44} height={51} className="header__mark" />
          <span>
            <span className="header__title">Birdie Open</span>
            <span className="header__tagline">Invitational golf siden 2012</span>
          </span>
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? "Luk menu" : "Åbn menu"}
          onClick={() => setOpen((wasOpen) => !wasOpen)}
        >
          <svg width="22" height="16" viewBox="0 0 22 16" aria-hidden="true" focusable="false">
            {open ? (
              <path d="M2 2l18 12M20 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M1 2h20M1 8h20M1 14h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>

        <nav className="nav" id={menuId} aria-label="Hovedmenu">
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

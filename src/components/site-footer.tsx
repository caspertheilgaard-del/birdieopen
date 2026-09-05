import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer__bar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark-white.png" alt="" width={28} height={33} className="footer__mark" />
        <span className="footer__text">Birdie Open · Invitation-only golfturnering siden 2012</span>
        <span className="footer__links">
          <Link href="/turneringsplan/kalender.ics">ics-kalender</Link>
          <Link href="/sponsorer">Sponsorer</Link>
        </span>
      </div>
    </footer>
  );
}

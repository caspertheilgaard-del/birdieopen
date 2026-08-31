import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer__bar">
        <span className="footer__logo">
          <Image src="/logo.png" alt="" width={30} height={30} style={{ objectFit: "contain" }} />
        </span>
        <span className="footer__text">Birdie Open · Invitation-only golfturnering siden 2012</span>
        <span className="footer__links">
          <Link href="/turneringsplan/kalender.ics">ics-kalender</Link>
          <Link href="/sponsorer">Sponsorer</Link>
        </span>
      </div>
    </footer>
  );
}

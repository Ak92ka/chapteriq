import Link from "next/link";

export default function Footer() {
  return (
    <div className="footer-container">
            <Link href="/">
      <img
        className="logo-footer"
        src="/ChapterWise_logo.svg"
        alt="ChapterWise logo"
        width={130}
        height={60}
      />
      </Link>
      <p className="tagline-footer">Built for university students</p>
      {/* social media icons */}
      {/* language selector */}
      <a className="p-footer-14">Cookie settings</a>
      <p className="p-footer-14 copyright">@ 2026 ChapterIQ</p>
      <ul>
  <li className="list-headline">Company</li>
  <li><Link href="about-us">About us</Link></li>
  <li><Link href="pricing">Pricing</Link></li>
  <li><Link href="blog">Blog</Link></li>
  <li><Link href="contact">Contact</Link></li>
  <li><Link href="terms-privacy">Terms & privacy</Link></li>
</ul>

    </div>
  );
}

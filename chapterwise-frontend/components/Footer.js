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
      <p className="p-footer-14 copyright">@ 2026 ChapterWise</p>
      <ul>
        <li className="list-headline">Company</li>
         <a href="about-us"><li>About us</li></a>
        <a href="pricing"><li>Pricing</li></a>
        <a href="blog"><li>Blog</li></a>
        <a href="contact"><li>Contact</li></a>
        <a href="terms-privacy"><li>Terms & privacy</li></a>    
      </ul>
    </div>
  );
}

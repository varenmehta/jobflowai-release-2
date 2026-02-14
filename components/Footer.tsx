import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <span>JobFlow AI © 2026</span>
      <div className="footer-links">
        <Link href="#">Privacy</Link>
        <Link href="#">Terms</Link>
      </div>
    </footer>
  );
}

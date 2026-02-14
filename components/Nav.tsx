"use client";

import Link from "next/link";

export default function Nav() {
  return (
    <header className="nav">
      <div className="logo">JobFlow AI</div>
      <nav className="nav-links">
        <Link href="/#features">Features</Link>
        <Link href="/#flow">Flow</Link>
        <Link href="/#analytics">Analytics</Link>
        <Link href="/login?mode=signin" className="btn btn--ghost">Sign in</Link>
        <Link href="/login?mode=signup" className="btn btn--primary">Create account</Link>
      </nav>
    </header>
  );
}

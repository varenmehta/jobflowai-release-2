import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JobFlow AI",
  description: "Job search hub with automated tracking and flow analytics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dodávatelia textilu",
  description: "Katalóg overených dodávateľov a výrobcov látok v SK, CZ, PL.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sk">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-semibold">Dodávatelia textilu</Link>
            <nav className="text-sm text-neutral-600">
              <Link href="/admin" className="hover:text-neutral-900">Admin</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

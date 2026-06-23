import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dodávatelia látok",
  description: "Interná databáza dodávateľov látok",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sk">
      <body className="font-sans antialiased">
        <header className="border-b border-border bg-white">
          <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Dodávatelia látok
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/" className="hover:underline">
                Prehľad
              </Link>
              <Link href="/suppliers" className="hover:underline">
                Dodávatelia
              </Link>
              <Link href="/suppliers/new" className="btn btn-primary">
                + Pridať dodávateľa
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}

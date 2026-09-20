import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { LogoMark } from "@/components/icons";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Prospecting Copilot",
  description:
    "Narzedzie do prospectingu: znajdz wlasciwa osobe, sledz zmiany u klienta, wyslij trafna propozycje.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" className={inter.variable}>
      <body className="font-sans">
        <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-white/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
                <LogoMark className="h-5 w-5" strokeWidth={2} />
              </span>
              <span className="text-[15px] font-bold tracking-tight text-ink-900">
                Prospecting Copilot
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm font-medium text-ink-500">
              <Link
                href="/"
                className="rounded-lg px-3 py-1.5 transition hover:bg-ink-100 hover:text-ink-900"
              >
                Konta
              </Link>
              <Link
                href="/icp"
                className="rounded-lg px-3 py-1.5 transition hover:bg-ink-100 hover:text-ink-900"
              >
                Profil ICP
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">{children}</main>
      </body>
    </html>
  );
}

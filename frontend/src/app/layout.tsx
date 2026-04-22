import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { RegionProvider } from "@/lib/region";
import RegionSelector from "@/components/RegionSelector";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "auckland.garden — Seasonal Planner for Auckland Growers",
  description:
    "Plan, sow, and track cut flowers and vegetables in Auckland, NZ. Auckland-specific seasonal guidance for your garden.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <RegionProvider>
        {/* Nav */}
        <nav className="bg-white/80 dark:bg-[var(--card)]/90 backdrop-blur-md border-b border-[var(--border-soft)] dark:border-[var(--border)] sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-1.5 group">
                <span className="text-xl">🌱</span>
                <span className="font-extrabold text-lg tracking-tight text-[var(--forest)] dark:text-[#4CAF50]">
                  auckland
                </span>
                <span className="text-[var(--terracotta)] font-extrabold text-lg">.</span>
                <span className="font-extrabold text-lg tracking-tight text-[var(--forest)] dark:text-[#4CAF50]">
                  garden
                </span>
              </Link>
              <RegionSelector />
            </div>
            <div className="flex items-center gap-1 text-sm font-medium">
              <NavLink href="/">Flowers Dashboard</NavLink>
              <NavLink href="/flowers">Flowers</NavLink>
              <NavLink href="/vegetables/dashboard">Vege Dashboard</NavLink>
              <NavLink href="/vegetables">Veges</NavLink>
              <NavLink href="/calendar">Calendar</NavLink>
              <ThemeToggle />
            </div>
          </div>
        </nav>

        {/* Main */}
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>

        {/* Footer */}
        <footer className="border-t border-[var(--border-soft)] dark:border-[var(--border)] mt-12 py-8">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
            <div className="flex items-center gap-1.5">
              <span>🌱</span>
              <span className="font-semibold text-[var(--forest)]">
                auckland<span className="text-[var(--terracotta)]">.</span>garden
              </span>
            </div>
            <p>A seasonal planner for Auckland, New Zealand</p>
            <a
              href="https://github.com/Tauriqbarron/flower-garden-project"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--forest)] dark:hover:text-[#4CAF50] transition"
            >
              Open Source ↗
            </a>
          </div>
        </footer>
        </RegionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--forest-50)] dark:hover:bg-[#1B4332]/50 hover:text-[var(--forest)] dark:hover:text-[#4CAF50] text-[var(--text-muted)] dark:text-[#A7C4A0] transition"
    >
      {children}
    </Link>
  );
}

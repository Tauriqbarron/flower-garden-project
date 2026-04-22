import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RegionProvider } from "@/lib/region";
import Nav from "@/components/Nav";

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
    <html lang="en">
      <body className={`${inter.className} min-h-screen`}>
        <RegionProvider>
        <Nav />

        {/* Main */}
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>

        {/* Footer */}
        <footer className="border-t border-[var(--border-soft)] mt-12 py-8">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[var(--text-muted)]">
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
              className="hover:text-[var(--forest)] transition"
            >
              Open Source ↗
            </a>
          </div>
        </footer>
        </RegionProvider>
      </body>
    </html>
  );
}

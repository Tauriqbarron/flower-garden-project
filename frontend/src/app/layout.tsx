import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RegionProvider } from "@/lib/region";
import Nav from "@/components/Nav";
import { ThemeProvider } from "@/components/ThemeProvider";

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
            <Nav />

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

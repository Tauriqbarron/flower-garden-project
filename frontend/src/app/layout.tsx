import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Garden Planner - Auckland Flowers & Vegetables",
  description: "Plan, sow, and track cut flowers and vegetables in Auckland, NZ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">&#x1F337;</span>
              <span className="font-bold text-xl tracking-tight">FlowerGarden</span>
              <span className="text-xs text-gray-400 ml-1 hidden sm:inline">Auckland, NZ</span>
            </Link>
            <div className="flex gap-4 text-sm font-medium">
              <Link href="/" className="hover:text-green-700 transition">Flowers</Link>
              <Link href="/flowers" className="hover:text-green-700 transition">Flower List</Link>
              <Link href="/vegetables/dashboard" className="hover:text-green-700 transition">Vegetables</Link>
              <Link href="/vegetables" className="hover:text-green-700 transition">Veg List</Link>
              <Link href="/calendar" className="hover:text-green-700 transition">Calendar</Link>
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 py-6">
          {children}
        </main>
        <footer className="text-center py-6 text-sm text-gray-400 border-t mt-12">
          Garden Planner - Built for Auckland, New Zealand
        </footer>
      </body>
    </html>
  );
}

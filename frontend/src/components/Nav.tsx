"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import RegionSelector from "@/components/RegionSelector";
import { ThemeToggle } from "@/components/ThemeToggle";

const LINKS = [
  { href: "/", label: "Flowers Dashboard" },
  { href: "/flowers", label: "Flowers" },
  { href: "/vegetables/dashboard", label: "Vege Dashboard" },
  { href: "/vegetables", label: "Veges" },
  { href: "/calendar", label: "Calendar" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const activeHref = getActiveHref(pathname);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <nav className="bg-white/80 dark:bg-[var(--card)]/90 backdrop-blur-md border-b border-[var(--border-soft)] dark:border-[var(--border)] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/" className="flex items-center gap-1.5 group shrink-0">
            <span className="text-xl">🌱</span>
            <span className="font-extrabold text-lg tracking-tight text-[var(--forest)] dark:text-[#4CAF50]">
              auckland
            </span>
            <span className="text-[var(--terracotta)] font-extrabold text-lg">.</span>
            <span className="font-extrabold text-lg tracking-tight text-[var(--forest)] dark:text-[#4CAF50]">
              garden
            </span>
          </Link>
          <div className="hidden min-[1100px]:block">
            <RegionSelector />
          </div>
        </div>

        {/* Desktop links */}
        <div className="hidden min-[1100px]:flex items-center gap-1 text-sm font-medium">
          {LINKS.map((l) => (
            <NavLink key={l.href} href={l.href} active={l.href === activeHref}>
              {l.label}
            </NavLink>
          ))}
          <ThemeToggle />
        </div>

        {/* Mobile toggle */}
        <div className="flex items-center gap-1 min-[1100px]:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center justify-center w-10 h-10 rounded-[var(--radius-sm)] text-[var(--forest)] dark:text-[#4CAF50] hover:bg-[var(--forest-50)] dark:hover:bg-[#1B4332]/50 transition"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        id="mobile-menu"
        className={`min-[1100px]:hidden overflow-hidden border-t border-[var(--border-soft)] dark:border-[var(--border)] bg-white dark:bg-[var(--card)] transition-[max-height] duration-300 ease-out ${
          open ? "max-h-[80vh]" : "max-h-0"
        }`}
      >
        <div className="px-4 py-4 flex flex-col gap-4">
          <RegionSelector />
          <div className="flex flex-col">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-3 rounded-[var(--radius-sm)] text-base font-medium transition ${
                  l.href === activeHref
                    ? "bg-[var(--forest-50)] dark:bg-[#1B4332]/50 text-[var(--forest)] dark:text-[#4CAF50]"
                    : "text-[var(--text-muted)] dark:text-[#A7C4A0] hover:bg-[var(--forest-50)] dark:hover:bg-[#1B4332]/50 hover:text-[var(--forest)] dark:hover:text-[#4CAF50]"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-[var(--radius-sm)] whitespace-nowrap transition ${
        active
          ? "bg-[var(--forest-50)] dark:bg-[#1B4332]/50 text-[var(--forest)] dark:text-[#4CAF50]"
          : "text-[var(--text-muted)] dark:text-[#A7C4A0] hover:bg-[var(--forest-50)] dark:hover:bg-[#1B4332]/50 hover:text-[var(--forest)] dark:hover:text-[#4CAF50]"
      }`}
    >
      {children}
    </Link>
  );
}

function getActiveHref(pathname: string | null): string | null {
  if (!pathname) return null;
  const matches = LINKS.filter((l) =>
    l.href === "/" ? pathname === "/" : pathname === l.href || pathname.startsWith(l.href + "/"),
  );
  if (matches.length === 0) return null;
  return matches.reduce((a, b) => (b.href.length > a.href.length ? b : a)).href;
}

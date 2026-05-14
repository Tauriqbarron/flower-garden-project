"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, User } from "lucide-react";
import RegionSelector from "@/components/RegionSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth";
import { useAuthModal } from "@/lib/auth-modal";

const PLANTS_LINKS = [
  { href: "/flowers/dashboard", label: "Flowers" },
  { href: "/vegetables/dashboard", label: "Vegetables" },
  { href: "/flowers", label: "All Flowers" },
  { href: "/vegetables", label: "All Veges" },
  { href: "/natives", label: "Natives" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { isLoggedIn, logout, isLoading } = useAuth();
  const { openAuthModal } = useAuthModal();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname?.startsWith(href + "/");
  }

  // Close on route change
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
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/" className="flex items-center gap-1.5 group shrink-0">
            <span className="text-xl">🌱</span>
            <span className="font-bold text-base tracking-tight text-[var(--forest)] dark:text-[#4CAF50]">
              auckland
            </span>
            <span className="text-[var(--terracotta)] font-bold text-base">.</span>
            <span className="font-bold text-base tracking-tight text-[var(--forest)] dark:text-[#4CAF50]">
              garden
            </span>
          </Link>
          <div className="hidden min-[1200px]:block">
            <RegionSelector />
          </div>
        </div>

        {/* Desktop links */}
        <div className="hidden min-[1200px]:flex items-center gap-1 text-sm font-medium">
          {PLANTS_LINKS.map((l) => (
            <NavLink key={l.href} href={l.href} active={isActive(l.href)}>
              {l.label}
            </NavLink>
          ))}

          <NavLink href="/calendar" active={isActive("/calendar")}>
            Calendar
          </NavLink>

          {/* Auth */}
          {isLoggedIn ? (
            <div className="flex items-center gap-1">
              <Link
                href="/"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-sm transition text-[var(--text-muted)] dark:text-[#A7C4A0] hover:bg-[var(--forest-50)] dark:hover:bg-[#1B4332]/50 hover:text-[var(--forest)] dark:hover:text-[#4CAF50]"
              >
                <User size={14} />
                My Garden
              </Link>
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-[var(--radius-sm)] text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
              >
                Sign out
              </button>
            </div>
          ) : null}
          <ThemeToggle />
        </div>

        {/* Mobile toggle */}
        <div className="flex items-center gap-1 min-[1200px]:hidden">
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
        className={`min-[1200px]:hidden overflow-hidden border-t border-[var(--border-soft)] dark:border-[var(--border)] bg-white dark:bg-[var(--card)] transition-[max-height] duration-300 ease-out ${
          open ? "max-h-[80vh]" : "max-h-0"
        }`}
      >
        <div className="px-4 py-4 flex flex-col gap-4">
          <RegionSelector />
          <div className="flex flex-col">
            {PLANTS_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-3 rounded-[var(--radius-sm)] text-base font-medium transition ${
                  isActive(l.href)
                    ? "bg-[var(--forest-50)] dark:bg-[#1B4332]/50 text-[var(--forest)] dark:text-[#4CAF50]"
                    : "text-[var(--text-muted)] dark:text-[#A7C4A0] hover:bg-[var(--forest-50)] dark:hover:bg-[#1B4332]/50 hover:text-[var(--forest)] dark:hover:text-[#4CAF50]"
                }`}
              >
                {l.label}
              </Link>
            ))}

            <Link
              href="/calendar"
              className={`px-3 py-3 rounded-[var(--radius-sm)] text-base font-medium transition ${
                isActive("/calendar")
                  ? "bg-[var(--forest-50)] dark:bg-[#1B4332]/50 text-[var(--forest)] dark:text-[#4CAF50]"
                  : "text-[var(--text-muted)] dark:text-[#A7C4A0] hover:bg-[var(--forest-50)] dark:hover:bg-[#1B4332]/50 hover:text-[var(--forest)] dark:hover:text-[#4CAF50]"
              }`}
            >
              Calendar
            </Link>

            {/* Auth-aware mobile links */}
            {isLoggedIn ? (
              <>
                <div className="h-px bg-[var(--border-soft)] dark:border-[var(--border)] my-1" />
                <Link
                  href="/"
                  className="px-3 py-3 rounded-[var(--radius-sm)] text-base font-medium text-[var(--text-muted)] dark:text-[#A7C4A0] hover:bg-[var(--forest-50)] dark:hover:bg-[#1B4332]/50 hover:text-[var(--forest)] dark:hover:text-[#4CAF50]"
                >
                  My Garden
                </Link>
                <button
                  onClick={logout}
                  className="px-3 py-3 rounded-[var(--radius-sm)] text-base font-medium text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  Sign out
                </button>
              </>
            ) : null}
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

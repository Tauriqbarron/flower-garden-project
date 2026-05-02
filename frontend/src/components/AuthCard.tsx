"use client";

import { useState, ReactNode } from "react";
import Link from "next/link";

/* ─── Password visibility toggle ─── */
function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  minLength,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minLength?: number;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <label
        htmlFor={id}
        className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </label>
      <input
        id={id}
        type={show ? "text" : "password"}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border transition-all duration-150 text-base"
        style={{
          background: "var(--card)",
          borderColor: "var(--border)",
          color: "var(--text)",
          boxShadow: "var(--shadow-sm)",
        }}
        onFocus={(e) =>
          (e.target.style.boxShadow = "var(--shadow-md), 0 0 0 2px var(--forest-300)")
        }
        onBlur={(e) => (e.target.style.boxShadow = "var(--shadow-sm)")}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-[34px] text-sm font-medium cursor-pointer"
        style={{ color: "var(--text-muted)" }}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

/* ─── Brand SVG leaf ─── */
function BrandPanel({ mode }: { mode: "sign-in" | "register" }) {
  return (
    <div
      className="hidden lg:flex flex-col justify-between p-10 rounded-2xl"
      style={{
        background: `linear-gradient(160deg, var(--forest) 0%, var(--forest-600) 60%, var(--sage-300) 100%)`,
        minWidth: "320px",
        maxWidth: "380px",
        flex: "0 0 auto",
      }}
    >
      {/* Top: logo + wordmark */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 22C12 22 4 18 4 11C4 6.58 7.58 3 12 3C16.42 3 20 6.58 20 11C20 18 12 22 12 22Z"
              fill="rgba(255,255,255,0.9)"
            />
            <path
              d="M12 3C12 3 8 7 8 11C8 13.21 9.79 15 12 15C14.21 15 16 13.21 16 11C16 7 12 3 12 3Z"
              fill="rgba(255,248,240,0.85)"
            />
          </svg>
        </div>
        <span className="text-xl font-bold" style={{ color: "var(--cream)" }}>
          Flower Garden
        </span>
      </div>

      {/* Centre: illustrated tagline */}
      <div className="space-y-4">
        <div className="relative w-full h-48 flex items-center justify-center">
          {/* Decorative stems */}
          <svg
            viewBox="0 0 200 160"
            fill="none"
            className="absolute inset-0 w-full h-full opacity-20"
            aria-hidden="true"
          >
            <path d="M30 140 Q60 80 100 60 Q140 40 170 20" stroke="rgba(255,255,255,0.4)" strokeWidth="2" fill="none" strokeLinecap="round"/>
            <path d="M50 140 Q80 100 100 80 Q120 60 160 30" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          </svg>
          {/* Flower SVG */}
          <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
            {/* Petals */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <ellipse
                key={i}
                cx="60"
                cy={angle === 0 || angle === 180 ? 28 : 40}
                rx="14"
                ry="22"
                fill="rgba(255,255,255,0.85)"
                transform={`rotate(${angle + (angle === 180 ? 30 : 0)} 60 60)`}
              />
            ))}
            {/* Centre */}
            <circle cx="60" cy="60" r="16" fill="#D4A843" />
            <circle cx="60" cy="60" r="9" fill="rgba(255,255,255,0.7)" />
          </svg>
        </div>
        <div>
          {mode === "sign-in" ? (
            <>
              <p className="text-lg font-semibold leading-snug" style={{ color: "var(--cream)" }}>
                Welcome back to your garden
              </p>
              <p className="text-sm mt-1.5 opacity-80" style={{ color: "var(--cream)" }}>
                Your planting calendar awaits
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold leading-snug" style={{ color: "var(--cream)" }}>
                Start your growing journey
              </p>
              <p className="text-sm mt-1.5 opacity-80" style={{ color: "var(--cream)" }}>
                Track sowings, blooms &amp; harvests
              </p>
            </>
          )}
        </div>
      </div>

      {/* Bottom: ambient dots */}
      <div className="flex gap-2">
        {["🌿", "🌸", "🌿", "🌱", "🌿"].map((e, i) => (
          <span key={i} className="text-base opacity-60">
            {e}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Page-level wrapper ─── */
function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-start justify-center px-4 py-12"
      style={{ background: "var(--bg)" }}
    >
      {/* Subtle background texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231B4332' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-4xl flex items-stretch gap-0"
        style={{ paddingTop: "clamp(2rem, 8vh, 6rem)" }}
      >
        {children}
      </div>
    </div>
  );
}

/* ─── Error banner ─── */
function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm"
      style={{
        background: "var(--pohutukawa-50)",
        border: "1px solid var(--pohutukawa-100)",
        color: "var(--pohutukawa)",
      }}
      role="alert"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
      </svg>
      {message}
    </div>
  );
}

/* ─── Main AuthCard export ─── */
interface AuthCardProps {
  mode: "sign-in" | "register";
  /** e.g. "Sign in to your account" */
  headline: string;
  error?: string;
  isLoading?: boolean;
  children: ReactNode;
  /** Override the form's bottom text + link */
  footer?: ReactNode;
}

export default function AuthCard({
  mode,
  headline,
  error,
  isLoading,
  children,
  footer,
}: AuthCardProps) {
  return (
    <AuthLayout>
      <BrandPanel mode={mode} />

      {/* Form card */}
      <div
        className="flex-1 flex flex-col justify-center p-8 sm:p-10 rounded-2xl"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border-soft)",
          boxShadow: "var(--shadow-lg)",
          borderTopLeftRadius: mode === "register" ? "0" : undefined,
          borderBottomLeftRadius: mode === "register" ? "0" : undefined,
          borderTopRightRadius: mode === "sign-in" ? "0" : undefined,
          borderBottomRightRadius: mode === "sign-in" ? "0" : undefined,
        }}
      >
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2.5 mb-8">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "var(--forest)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 22C12 22 4 18 4 11C4 6.58 7.58 3 12 3C16.42 3 20 6.58 20 11C20 18 12 22 12 22Z"
                fill="rgba(255,248,240,0.9)"
              />
              <path
                d="M12 3C12 3 8 7 8 11C8 13.21 9.79 15 12 15C14.21 15 16 13.21 16 11C16 7 12 3 12 3Z"
                fill="rgba(255,248,240,0.6)"
              />
            </svg>
          </div>
          <span className="text-lg font-bold" style={{ color: "var(--forest)" }}>
            Flower Garden
          </span>
        </div>

        <h1
          className="text-2xl font-bold mb-1"
          style={{ color: "var(--text)" }}
        >
          {headline}
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          {mode === "sign-in"
            ? "Enter your details to access your garden"
            : "Create an account to start planning"}
        </p>

        {error && <ErrorBanner message={error} />}

        <form onSubmit={(e) => e.preventDefault()} noValidate className="space-y-5">
          {children}
        </form>

        {footer ?? (
          <p className="text-center text-sm mt-6" style={{ color: "var(--text-muted)" }}>
            {mode === "sign-in" ? (
              <>
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="font-semibold hover:underline"
                  style={{ color: "var(--forest)" }}
                >
                  Create one
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold hover:underline"
                  style={{ color: "var(--forest)" }}
                >
                  Sign in
                </Link>
              </>
            )}
          </p>
        )}
      </div>
    </AuthLayout>
  );
}

/* Re-export for convenience */
export { PasswordInput };

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Eye, EyeOff, Loader2, CheckCircle2, Sprout } from "lucide-react";
import { useAuth } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";

type Mode = "signin" | "signup";

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  general?: string;
}

function validateEmail(email: string): string | undefined {
  if (!email) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address";
}

function validatePassword(password: string, mode: Mode): string | undefined {
  if (!password) return "Password is required";
  if (mode === "signup") {
    if (password.length < 8) return "At least 8 characters required";
    if (!/[A-Z]/.test(password)) return "Include at least one uppercase letter";
    if (!/[0-9]/.test(password)) return "Include at least one number";
  }
}

function getPasswordStrength(password: string): { label: string; color: string; score: number } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { label: "Weak", color: "bg-red-400", score: 1 };
  if (score <= 2) return { label: "Fair", color: "bg-amber-400", score: 2 };
  if (score <= 3) return { label: "Good", color: "bg-emerald-400", score: 3 };
  return { label: "Strong", color: "bg-[var(--forest)]", score: 4 };
}

export default function AuthModal({
  defaultMode = "signin",
  onClose,
}: {
  defaultMode?: Mode;
  onClose: () => void;
}) {
  const router = useRouter();
  const { login } = useAuth();
  const overlayRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<Mode>(defaultMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Pre-fill remembered email
  useEffect(() => {
    const saved = localStorage.getItem("flower_garden_remembered_email");
    if (saved) {
      setEmail(saved);
      setRememberEmail(true);
    }
  }, []);

  // Focus trap + scroll lock
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
      prev?.focus();
    };
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setErrors({});
    setSuccessMessage("");
  };

  const clearError = (field: keyof FormErrors) => {
    setErrors((prev) => ({ ...prev, [field]: undefined, general: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: FormErrors = {};
    if (mode === "signup" && !name.trim()) errs.name = "Name is required";
    errs.email = validateEmail(email);
    errs.password = validatePassword(password, mode);
    if (errs.email || errs.password || errs.name) { setErrors(errs); return; }

    setIsLoading(true);
    setErrors({});

    try {
      const endpoint = mode === "signup" ? "/api/auth/register" : "/api/auth/login";
      const body = mode === "signup"
        ? { name: name.trim(), email: email.trim().toLowerCase(), password }
        : { email: email.trim().toLowerCase(), password };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrors({ general: data.detail ?? `${mode === "signup" ? "Registration" : "Sign in"} failed — check your details` });
        return;
      }

      if (rememberEmail) {
        localStorage.setItem("flower_garden_remembered_email", email.trim().toLowerCase());
      } else {
        localStorage.removeItem("flower_garden_remembered_email");
      }

      if (mode === "signup") {
        setSuccessMessage("Account created! Signing you in…");
        setTimeout(() => { login(data.user, data.token); onClose(); router.push("/"); }, 1200);
      } else {
        login(data.user, data.token);
        onClose();
        router.push("/");
      }
    } catch {
      setErrors({ general: "Network error — is the backend running?" });
    } finally {
      setIsLoading(false);
    }
  };

  const strength = mode === "signup" ? getPasswordStrength(password) : null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(27, 67, 50, 0.45)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      role="dialog"
      aria-modal="true"
      aria-label={mode === "signup" ? "Create account" : "Sign in"}
    >
      {/* Card — constrained width, vertically centered, always fully visible */}
      <div className="relative w-full max-w-sm bg-white dark:bg-[var(--card)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] overflow-hidden">

        {/* ── Header ── */}
        <div className="relative px-8 pt-8 pb-6">
          {/* Brand mark + close */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center" style={{ background: "var(--forest)" }}>
                <span className="text-white text-sm">🌱</span>
              </div>
              <span className="font-bold text-sm text-[var(--text-muted)]">auckland.garden</span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-[var(--card-alt)] dark:bg-[var(--border)] flex items-center justify-center text-[var(--text-soft)] hover:text-[var(--text)] dark:hover:text-white transition"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          {/* Heading */}
          <h1 className="text-xl font-bold text-[var(--text)] dark:text-white leading-tight">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {mode === "signup"
              ? "Start planning your garden today"
              : "Sign in to your garden planner"}
          </p>
        </div>

        {/* ── Form body ── */}
        <div className="px-8 pb-8">

          {successMessage ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 size={32} className="text-[var(--forest)] dark:text-[#4CAF50]" strokeWidth={1.5} />
              <p className="text-sm font-medium text-[var(--text)]">{successMessage}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* General error */}
              {errors.general && (
                <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                  <span className="mt-0.5 shrink-0 text-red-400">⚠</span>
                  <span className="flex-1">{errors.general}</span>
                  <button type="button" onClick={() => clearError("general")} className="shrink-0 text-red-400 hover:text-red-600 transition">
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Name */}
              {mode === "signup" && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]" htmlFor="auth-name">
                    Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); clearError("name"); }}
                    onBlur={() => { if (!name.trim()) setErrors((p) => ({ ...p, name: "Name is required" })); }}
                    className={inputCls(!!errors.name)}
                  />
                  {errors.name && <FieldErr msg={errors.name} />}
                </div>
              )}

              {/* Email */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]" htmlFor="auth-email">
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
                  onBlur={() => setErrors((p) => ({ ...p, email: validateEmail(email) }))}
                  className={inputCls(!!errors.email)}
                />
                {errors.email && <FieldErr msg={errors.email} />}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]" htmlFor="auth-password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    placeholder={mode === "signup" ? "Choose a strong password" : "Your password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError("password"); }}
                    onBlur={() => setErrors((p) => ({ ...p, password: validatePassword(password, mode) }))}
                    className={`${inputCls(!!errors.password)} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)] hover:text-[var(--text-muted)] transition"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password ? (
                  <FieldErr msg={errors.password} />
                ) : mode === "signup" && password.length > 0 && strength ? (
                  <div className="space-y-1 mt-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((lvl) => (
                        <div key={lvl} className={`h-1 flex-1 rounded-full transition-all ${lvl <= strength.score ? strength.color : "bg-[var(--border)]"}`} />
                      ))}
                    </div>
                    <p className={`text-xs ${
                      strength.score <= 1 ? "text-red-500" :
                      strength.score === 2 ? "text-amber-600 dark:text-amber-400" :
                      "text-emerald-600 dark:text-emerald-400"
                    }`}>
                      {strength.label}
                      {password.length < 8 ? " · 8+ characters needed" :
                        password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password)
                          ? " · Looking good!"
                          : ""}
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Remember + forgot (sign in only) */}
              {mode === "signin" && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberEmail}
                      onChange={(e) => setRememberEmail(e.target.checked)}
                      className="w-4 h-4 rounded border-[var(--border)] text-[var(--forest)] dark:text-[#4CAF50] focus:ring-2 focus:ring-[var(--forest)] dark:focus:ring-[#4CAF50] cursor-pointer"
                    />
                    <span className="text-xs text-[var(--text-muted)]">Remember email</span>
                  </label>
                  <button type="button" className="text-xs text-[var(--forest)] dark:text-[#4CAF50] hover:underline">
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-[var(--radius-md)] font-semibold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
                style={{ background: "var(--forest)" }}
              >
                {isLoading ? (
                  <><Loader2 size={15} className="animate-spin" />{mode === "signup" ? "Creating account…" : "Signing in…"}</>
                ) : (
                  mode === "signup" ? "Create account" : "Sign in"
                )}
              </button>
            </form>
          )}

          {/* Footer toggle */}
          <p className="text-center text-xs text-[var(--text-soft)] mt-5">
            {mode === "signin" ? (
              <>Don&apos;t have an account? <button onClick={() => switchMode("signup")} className="text-[var(--forest)] dark:text-[#4CAF50] font-medium hover:underline">Create one — free</button></>
            ) : (
              <>Already have an account? <button onClick={() => switchMode("signin")} className="text-[var(--forest)] dark:text-[#4CAF50] font-medium hover:underline">Sign in</button></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function inputCls(hasErr: boolean) {
  return `w-full px-3 py-2.5 rounded-[var(--radius-md)] border text-sm bg-white dark:bg-[var(--bg)] transition-all focus:outline-none ${
    hasErr
      ? "border-red-400 dark:border-red-600 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900"
      : "border-[var(--border)] focus:border-[var(--forest)] dark:focus:border-[#4CAF50] focus:ring-2 focus:ring-[var(--forest)]/10 dark:focus:ring-[#4CAF50]/20"
  }`;
}

function FieldErr({ msg }: { msg: string }) {
  return <p className="text-xs text-red-500 dark:text-red-400 mt-1">• {msg}</p>;
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthCard, { PasswordInput } from "@/components/AuthCard";
import { useAuth } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";

/* Password strength indicator */
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  const colors = [
    "var(--pohutukawa-100)",
    "var(--pohutukawa-100)",
    "var(--gold-200)",
    "var(--sage-300)",
    "var(--forest-300)",
  ];

  if (!password) return null;

  return (
    <div className="space-y-1.5 mt-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-200"
            style={{
              background: i < score ? colors[score] : "var(--border)",
            }}
          />
        ))}
      </div>
      <p className="text-xs" style={{ color: colors[score] }}>
        {labels[score]}
      </p>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail ?? "Registration failed. Please try again.");
        return;
      }

      login(data.user, data.token);
      router.push("/");
    } catch {
      setError("Network error — is the backend running?");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      mode="register"
      headline="Create your account"
      error={error}
      isLoading={isLoading}
    >
      {/* Name */}
      <div>
        <label
          htmlFor="name"
          className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          Full name
        </label>
        <input
          id="name"
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Mia Patel"
          className="w-full px-4 py-3 rounded-xl border transition-all duration-150 text-base"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
            color: "var(--text)",
            boxShadow: "var(--shadow-sm)",
          }}
          onFocus={(e) =>
            (e.target.style.boxShadow =
              "var(--shadow-md), 0 0 0 2px var(--forest-300)")
          }
          onBlur={(e) => (e.target.style.boxShadow = "var(--shadow-sm)")}
        />
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="email"
          className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-4 py-3 rounded-xl border transition-all duration-150 text-base"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
            color: "var(--text)",
            boxShadow: "var(--shadow-sm)",
          }}
          onFocus={(e) =>
            (e.target.style.boxShadow =
              "var(--shadow-md), 0 0 0 2px var(--forest-300)")
          }
          onBlur={(e) => (e.target.style.boxShadow = "var(--shadow-sm)")}
        />
      </div>

      {/* Password */}
      <div>
        <PasswordInput
          id="password"
          label="Password"
          value={password}
          onChange={setPassword}
          placeholder="Min. 6 characters"
          minLength={6}
          autoComplete="new-password"
        />
        <PasswordStrength password={password} />
      </div>

      {/* Submit */}
      <button
        type="submit"
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full py-3.5 px-4 rounded-xl font-semibold text-base transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: "var(--forest)",
          color: "var(--cream)",
          boxShadow: "var(--shadow-sm)",
        }}
        onMouseEnter={(e) => {
          if (!isLoading) {
            e.currentTarget.style.background = "var(--forest-600)";
            e.currentTarget.style.boxShadow = "var(--shadow-md)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--forest)";
          e.currentTarget.style.boxShadow = "var(--shadow-sm)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
        onMouseDown={(e) => {
          if (!isLoading) {
            e.currentTarget.style.transform = "translateY(0)";
          }
        }}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray="32"
                strokeDashoffset="12"
                strokeLinecap="round"
              />
            </svg>
            Creating account…
          </span>
        ) : (
          "Create account"
        )}
      </button>

      {/* Terms notice */}
      <p className="text-center text-xs" style={{ color: "var(--text-soft)" }}>
        By creating an account you agree to our{" "}
        <Link href="/terms" className="underline hover:opacity-80">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:opacity-80">
          Privacy Policy
        </Link>
      </p>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        <span className="text-xs" style={{ color: "var(--text-soft)" }}>
          or
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>

      {/* Sign-in link */}
      <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold hover:underline"
          style={{ color: "var(--terracotta)" }}
        >
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}

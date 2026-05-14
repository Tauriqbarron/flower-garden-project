"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthCard, { PasswordInput } from "@/components/AuthCard";
import { useAuth } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail ?? "Sign in failed. Please try again.");
        return;
      }

      // If "remember me" is not checked, clear at browser-session end
      // (localStorage persists across tabs — we store session-only via sessionStorage)
      if (!rememberMe) {
        sessionStorage.setItem("flower_garden_token", data.token);
        sessionStorage.setItem("flower_garden_user", JSON.stringify(data.user));
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
      mode="sign-in"
      headline="Sign in to your account"
      error={error}
      isLoading={isLoading}
      footer={
        <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold hover:underline"
            style={{ color: "var(--terracotta)" }}
          >
            Create one — it&apos;s free
          </Link>
        </p>
      }
    >
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
      <PasswordInput
        id="password"
        label="Password"
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
        autoComplete="current-password"
      />

      {/* Remember + forgot */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded"
            style={{ accentColor: "var(--forest)" }}
          />
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            Remember me
          </span>
        </label>
        {/* Future: password reset link */}
        {/*
        <Link
          href="/forgot-password"
          className="text-sm font-medium hover:underline"
          style={{ color: "var(--forest)" }}
        >
          Forgot password?
        </Link>
        */}
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
            Signing in…
          </span>
        ) : (
          "Sign in"
        )}
      </button>

    </AuthCard>
  );
}

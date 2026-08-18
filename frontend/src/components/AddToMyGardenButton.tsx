"use client";

import { useState } from "react";
import { useAuth, authHeaders } from "@/lib/auth";
import { Heart, CheckCircle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";
const NOW = new Date();

export type PlantType = "flower" | "vegetable" | "native";

interface AddToMyGardenButtonProps {
  plantType: PlantType;
  plantSlug: string;
  plantName: string;
  sowMonth?: number; // 1-12; defaults to current month if not provided
  onSaved?: () => void;
}

export default function AddToMyGardenButton({
  plantType,
  plantSlug,
  plantName,
  sowMonth,
  onSaved,
}: AddToMyGardenButtonProps) {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async () => {
    setError("");
    setIsAdding(true);
    try {
      const headers = authHeaders();
      if (!headers.Authorization) {
        setError("Sign in required");
        return;
      }
      const res = await fetch(`${API_BASE}/api/calendar/entries/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          plant_type: plantType,
          plant_slug: plantSlug,
          plant_name: plantName,
          action: "sow",
          month: sowMonth ?? NOW.getMonth() + 1,
          year: NOW.getFullYear(),
          notes: null,
        }),
      });
      if (res.status === 401) {
        setError("Session expired. Please sign in again.");
        return;
      }
      if (!res.ok) {
        setError("Failed to save. Try again.");
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSaved?.();
      }, 1500);
    } catch {
      setError("Network error — backend running?");
    } finally {
      setIsAdding(false);
    }
  };

  if (authLoading) return null;

  // Guest
  if (!isLoggedIn) {
    return (
      <button
        onClick={() => (window.location.href = "/login")}
        className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-[var(--forest-50)] transition"
      >
        <Heart size={16} />
        Sign in to save to my garden
      </button>
    );
  }

  // Success
  if (success) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-green-50 border border-green-200 text-green-700 transition"
      >
        <CheckCircle size={16} />
        Added!
      </button>
    );
  }

  // Error
  if (error) {
    return (
      <button
        onClick={handleAdd}
        className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition"
      >
        <Heart size={16} />
        {error} — tap to retry
      </button>
    );
  }

  // Default
  return (
    <button
      onClick={handleAdd}
      disabled={isAdding}
      className="flex items-center gap-2 px-4 py-2 text-sm border border-[var(--forest)] text-[var(--forest)] dark:border-[#4CAF50] dark:text-[#4CAF50] rounded-lg hover:bg-[var(--forest-50)] dark:hover:bg-[#153628]/50 disabled:opacity-50 transition"
    >
      <Heart size={16} />
      {isAdding ? "Adding…" : "Add to my garden"}
    </button>
  );
}

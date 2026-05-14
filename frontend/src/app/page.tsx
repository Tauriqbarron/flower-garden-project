"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import VegDashboardClient from "@/components/VegDashboardClient";

export default function HomePage() {
  const { isLoggedIn, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isLoggedIn) {
      router.replace("/my-dashboard");
    }
  }, [isLoading, isLoggedIn, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-6 h-6 border-2 border-[var(--forest)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isLoggedIn) return null;

  return <VegDashboardClient />;
}

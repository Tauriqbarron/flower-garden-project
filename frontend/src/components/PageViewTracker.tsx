"use client";

/**
 * PageViewTracker — tracks page views in the SPA.
 * Mount once in the root layout. Uses Next.js navigation hooks.
 */

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView } from "@/lib/analytics";

export default function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTracked = useRef("");

  useEffect(() => {
    const fullPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
    if (fullPath !== lastTracked.current) {
      lastTracked.current = fullPath;
      // Defer tracking to avoid blocking initial render
      requestAnimationFrame(() => {
        trackPageView(fullPath, document.title);
      });
    }
  }, [pathname, searchParams]);

  return null; // invisible component
}

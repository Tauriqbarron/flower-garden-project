"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

interface HighlightItem {
  name: string;
  slug: string;
  timing_label?: string;
  timing_color?: string;
  growth_stages?: {
    harvest: string | null;
    seedling: string | null;
    young_plant: string | null;
  } | null;
}

interface HighlightReelProps {
  sowNow: HighlightItem[];
  harvestNow: { name: string; slug: string; growth_stages?: HighlightItem["growth_stages"] }[];
  type?: "flowers" | "vegetables";
}

interface Slide {
  name: string;
  slug: string;
  imageUrl: string | null;
  action: string;
  actionEmoji: string;
  badge?: string;
  badgeColor?: string;
  href: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const INTERVAL_MS = 4000;

export default function HighlightReel({
  sowNow,
  harvestNow,
  type = "flowers",
}: HighlightReelProps) {
  const basePath = type === "vegetables" ? "/vegetables" : "/flowers";

  // Build and shuffle slides on mount
  const [slides] = useState<Slide[]>(() => {
    const items: Slide[] = [];

    for (const s of sowNow) {
      items.push({
        name: s.name,
        slug: s.slug,
        imageUrl: s.growth_stages?.harvest ?? s.growth_stages?.seedling ?? null,
        action: "Planting Now",
        actionEmoji: "🌱",
        badge: s.timing_label,
        badgeColor: s.timing_color,
        href: `${basePath}/${s.slug || encodeURIComponent(s.name)}`,
      });
    }

    for (const h of harvestNow) {
      items.push({
        name: h.name,
        slug: h.slug,
        imageUrl: h.growth_stages?.harvest ?? null,
        action: "Harvest Now",
        actionEmoji: "✂️",
        href: `${basePath}/${h.slug || encodeURIComponent(h.name)}`,
      });
    }

    return shuffle(items);
  });

  const [current, setCurrent] = useState(0);
  const total = slides.length;

  const next = useCallback(() => setCurrent((i) => (i + 1) % total), [total]);
  const prev = useCallback(() => setCurrent((i) => (i - 1 + total) % total), [total]);

  // Auto-advance
  useEffect(() => {
    if (total <= 1) return;
    const timer = setInterval(next, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [total, next]);

  if (total === 0) return null;

  const slide = slides[current];

  const badgeClasses =
    slide.badgeColor === "green"
      ? "bg-green-100 text-green-800"
      : slide.badgeColor === "amber"
      ? "bg-amber-100 text-amber-800"
      : slide.badgeColor === "red"
      ? "bg-red-100 text-red-800"
      : "bg-gray-100 text-gray-600";

  return (
    <div className="mb-8">
      <Link href={slide.href}>
        <div className="relative w-full h-64 md:h-80 rounded-xl overflow-hidden bg-gray-100 group cursor-pointer hover:shadow-lg transition-shadow">
          {slide.imageUrl ? (
            <Image
              src={slide.imageUrl}
              alt={slide.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 800px"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-amber-50">
              <span className="text-7xl">🌿</span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Action badge — top left */}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow">
            <span>{slide.actionEmoji}</span>
            <span className="text-sm font-medium">{slide.action}</span>
          </div>

          {/* Timing badge — top right (if sow item) */}
          {slide.badge && (
            <div className={`absolute top-4 right-4 rounded-full px-3 py-1.5 text-sm font-medium shadow ${badgeClasses}`}>
              {slide.badge}
            </div>
          )}

          {/* Name — bottom */}
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-2xl font-bold text-white drop-shadow-md">
              {slide.name}
            </h3>
            <p className="text-sm text-white/80 mt-0.5">
              {current + 1} / {total}
            </p>
          </div>
        </div>
      </Link>

      {/* Controls */}
      {total > 1 && (
        <div className="flex items-center justify-center gap-4 mt-3">
          <button
            onClick={prev}
            className="bg-white/80 hover:bg-white rounded-full w-9 h-9 flex items-center justify-center shadow transition"
            aria-label="Previous"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Dots */}
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition ${
                  i === current ? "bg-green-600 w-4" : "bg-gray-300"
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={next}
            className="bg-white/80 hover:bg-white rounded-full w-9 h-9 flex items-center justify-center shadow transition"
            aria-label="Next"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

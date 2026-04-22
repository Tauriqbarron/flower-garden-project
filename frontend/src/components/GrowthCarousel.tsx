"use client";

import { useState } from "react";
import Image from "next/image";

export interface GrowthStages {
  harvest: string | null;
  seedling: string | null;
  young_plant: string | null;
}

interface GrowthCarouselProps {
  stages?: GrowthStages | null;
  plantName: string;
  isVegetable?: boolean;
}

const STAGE_ORDER = [
  { key: "harvest" as const, label: "Harvest", emoji: "🌻", description: "Ready to pick" },
  { key: "seedling" as const, label: "Seedling", emoji: "🌱", description: "Just sprouted" },
  { key: "young_plant" as const, label: "Young Plant", emoji: "🪴", description: "Growing, before maturity" },
] as const;

export default function GrowthCarousel({ stages, plantName, isVegetable = false }: GrowthCarouselProps) {
  // Filter to only stages that have images
  const availableStages = stages
    ? STAGE_ORDER.filter((s) => stages[s.key])
    : [];

  const [currentIndex, setCurrentIndex] = useState(0);

  // Fallback: no images at all
  if (availableStages.length === 0) {
    return (
      <div className="w-full h-64 md:h-80 bg-gradient-to-br from-[var(--forest-50)] to-[var(--gold-50)] flex flex-col items-center justify-center gap-2">
        <span className="text-7xl">{isVegetable ? "🥕" : "🌻"}</span>
        <span className="text-sm text-[var(--text-soft)]">No photos yet</span>
      </div>
    );
  }

  const current = availableStages[currentIndex];

  function goTo(index: number) {
    setCurrentIndex(index);
  }

  function prev() {
    setCurrentIndex((i) => (i - 1 + availableStages.length) % availableStages.length);
  }

  function next() {
    setCurrentIndex((i) => (i + 1) % availableStages.length);
  }

  return (
    <div className="relative">
      {/* Image area */}
      <div className="relative w-full h-64 md:h-80 lg:h-[480px] bg-[var(--card-alt)] overflow-hidden">
        <Image
          src={stages![current.key]!}
          alt={`${plantName} — ${current.label}`}
          fill
          className="object-cover transition-opacity duration-300"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Stage label badge */}
        <div className="absolute top-3 left-3 bg-white/90 dark:bg-[var(--card)]/90 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-md">
          <span className="text-lg">{current.emoji}</span>
          <span className="text-sm font-semibold text-[var(--text)] dark:text-[var(--text)]">{current.label}</span>
        </div>

        {/* Stage description */}
        <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5">
          <span className="text-xs text-white/90">{current.description}</span>
        </div>

        {/* Navigation arrows (only if multiple slides) */}
        {availableStages.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-[var(--card)]/80 hover:bg-white dark:hover:bg-[var(--card)] rounded-full w-9 h-9 flex items-center justify-center shadow-md transition-colors"
              aria-label="Previous stage"
            >
              <svg className="w-5 h-5 text-[var(--text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-[var(--card)]/80 hover:bg-white dark:hover:bg-[var(--card)] rounded-full w-9 h-9 flex items-center justify-center shadow-md transition-colors"
              aria-label="Next stage"
            >
              <svg className="w-5 h-5 text-[var(--text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Stage indicator bar */}
      {availableStages.length > 1 && (
        <div className="flex items-center justify-center gap-2 py-3 bg-white/80 dark:bg-[var(--card)]/80">
          {availableStages.map((stage, idx) => (
            <button
              key={stage.key}
              onClick={() => goTo(idx)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                idx === currentIndex
                  ? "bg-[var(--gold-100)] text-[var(--text)] ring-1 ring-[var(--gold-200)]"
                  : "bg-[var(--card-alt)] text-[var(--text-soft)] hover:bg-[var(--cream-200)]"
              }`}
            >
              <span>{stage.emoji}</span>
              <span>{stage.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

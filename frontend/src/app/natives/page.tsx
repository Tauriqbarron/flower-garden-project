"use client";
import { useEffect, useState } from "react";
import { useRegion } from "@/lib/region";
import { fetchNatives, Native } from "@/lib/api";
import NativeCard from "@/components/NativeCard";

export default function NativesPage() {
  const { region } = useRegion();
  const [natives, setNatives] = useState<Native[]>([]);

  useEffect(() => {
    fetchNatives(region).then(setNatives);
  }, [region]);

  if (natives.length === 0) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-100 rounded w-1/3"></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const lifeCycles = Array.from(new Set(natives.map((n) => n.life_cycle)));
  const regionLabel = region === "christchurch" ? "Christchurch" : "Auckland";

  const LIFE_CYCLE_LABELS: Record<string, string> = {
    tree: "🌳 Trees",
    shrub: "🌿 Shrubs",
    groundcover: "🌱 Groundcovers",
    climber: "🌾 Climbers",
    fern: "🌿 Ferns",
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">NZ Native Plants</h1>
        <p className="text-gray-500">{natives.length} native species for {regionLabel} gardens</p>
      </div>

      {lifeCycles.map((lc) => {
        const filtered = natives.filter((n) => n.life_cycle === lc);
        return (
          <div key={lc} className="mb-8">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              {LIFE_CYCLE_LABELS[lc] || lc} ({filtered.length})
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((native) => (
                <NativeCard key={native.slug} native={native} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

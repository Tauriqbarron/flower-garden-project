"use client";
import { useRegion } from "@/lib/region";

const REGIONS = [
  { id: "auckland", label: "Auckland", emoji: "🌅" },
  { id: "christchurch", label: "Christchurch", emoji: "🏔️" },
];

export default function RegionSelector() {
  const { region, setRegion } = useRegion();

  return (
    <div className="flex items-center gap-1 bg-[var(--cream-100)] rounded-lg p-1">
      {REGIONS.map((r) => (
        <button
          key={r.id}
          onClick={() => setRegion(r.id)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition cursor-pointer ${
            region === r.id
              ? "bg-white dark:bg-[#0f291e] shadow-sm text-[var(--forest)]"
              : "text-[var(--text-muted)] hover:text-[var(--forest)]"
          }`}
        >
          {r.emoji} {r.label}
        </button>
      ))}
    </div>
  );
}

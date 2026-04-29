import Link from "next/link";
import Image from "next/image";
import { Native, getNativeLifeCycleColor } from "@/lib/api";

const STAGE_EMOJIS: Record<string, string> = {
  harvest: "🌻",
  seedling: "🌱",
  young_plant: "🪴",
};

const STAGE_LABELS: Record<string, string> = {
  harvest: "Harvest",
  seedling: "Seedling",
  young_plant: "Young Plant",
};

function getNativeEmoji(life_cycle: string): string {
  const emojis: Record<string, string> = {
    tree: "🌳",
    shrub: "🌿",
    groundcover: "🌱",
    climber: "🌾",
    fern: "🌿",
  };
  return emojis[life_cycle] || "🌿";
}

export default function NativeCard({ native }: { native: Native }) {
  const harvestImg = native.growth_stages?.harvest;
  const stages = native.growth_stages;

  return (
    <Link href={`/natives/${native.slug}`}>
      <div className="glass-card hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col overflow-hidden">
        {harvestImg ? (
          <div className="relative w-full h-48 md:h-56 bg-gray-100">
            <Image
              src={harvestImg}
              alt={native.common_name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <div className="absolute top-2 left-2 bg-white/90 dark:bg-[#0f291e]/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-medium flex items-center gap-1">
              <span>🌻</span> Harvest
            </div>
          </div>
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-green-50 to-amber-50 flex items-center justify-center text-5xl">
            {getNativeEmoji(native.life_cycle)}
          </div>
        )}
        {/* Growth stage indicators */}
        {stages && (
          <div className="flex gap-2 justify-center py-2 bg-white/60 dark:bg-[#0f291e]/60 border-b border-gray-100 dark:border-[#1B4332]">
            {(["harvest", "seedling", "young_plant"] as const).map((stage) => {
              const hasImage = stages[stage];
              return (
                <span
                  key={stage}
                  className={`text-xs ${hasImage ? "opacity-100" : "opacity-25"}`}
                  title={hasImage ? STAGE_LABELS[stage] : `${STAGE_LABELS[stage]} (no photo yet)`}
                >
                  {STAGE_EMOJIS[stage]}
                </span>
              );
            })}
          </div>
        )}
        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold text-lg leading-tight">{native.common_name}</h3>
            <span className={`badge capitalize ${getNativeLifeCycleColor(native.life_cycle)} ml-2`}>
              {native.life_cycle}
            </span>
          </div>
          <p className="text-sm text-gray-500 italic mb-1">{native.botanical_name}</p>
          {native.māori_name && (
            <p className="text-sm text-[var(--forest)] font-medium mb-1">{native.māori_name}</p>
          )}
          <div className="flex gap-2 mt-auto pt-3 border-t border-[var(--border-soft)] flex-wrap">
            {native.birds_attracted && native.birds_attracted.length > 0 && (
              <span className="text-xs bg-[var(--forest-50)] text-[var(--forest)] px-2 py-1 rounded-full">
                🐦 {native.birds_attracted.length} bird{native.birds_attracted.length !== 1 ? "s" : ""}
              </span>
            )}
            <span className="text-xs bg-[var(--sage-50)] text-[var(--sage-400)] px-2 py-1 rounded-full">{native.sun}</span>
            <span className="text-xs bg-[var(--gold-50)] text-amber-900 px-2 py-1 rounded-full">
              H: {native.max_height_m}m
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

import Link from "next/link";
import Image from "next/image";
import { Vegetable, getVegTypeColor, getCategoryColor } from "@/lib/api";

function toSlug(name: string): string {
  let result = name.toLowerCase();
  for (const ch of "()'/!,") {
    result = result.replace(ch, "-");
  }
  result = result.replace(/ /g, "-");
  while (result.includes("--")) {
    result = result.replace("--", "-");
  }
  return result.replace(/^-|-$/g, "");
}

function getVegEmoji(type: string): string {
  const emojis: Record<string, string> = {
    root: "🥕",
    leafy: "🥬",
    fruit: "🍅",
    allium: "🧅",
    legume: "🫘",
    brassica: "🥦",
  };
  return emojis[type] || "🌱";
}

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

export default function VegetableCard({ vegetable }: { vegetable: Vegetable }) {
  const slug = (vegetable as any).slug || toSlug(vegetable.common_name);
  const harvestImg = vegetable.growth_stages?.harvest;
  const stages = vegetable.growth_stages;

  return (
    <Link href={`/vegetables/${slug}`}>
      <div className="glass-card hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col overflow-hidden">
        {harvestImg ? (
          <div className="relative w-full h-48 bg-gray-100">
            <Image
              src={harvestImg}
              alt={vegetable.common_name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-medium flex items-center gap-1">
              <span>🌻</span> Harvest
            </div>
          </div>
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-green-50 to-amber-50 flex items-center justify-center text-5xl">
            {getVegEmoji(vegetable.type)}
          </div>
        )}
        {/* Growth stage indicators */}
        {stages && (
          <div className="flex gap-2 justify-center py-2 bg-white/60 border-b border-gray-100">
            {["harvest", "seedling", "young_plant"].map((stage) => {
              const hasImage = stages[stage as keyof typeof stages];
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
            <h3 className="font-bold text-lg leading-tight">{vegetable.common_name}</h3>
            <div className="flex gap-1 ml-2 flex-shrink-0">
              <span className={`badge capitalize ${getVegTypeColor(vegetable.type)}`}>
                {vegetable.type}
              </span>
              <span className={`badge capitalize ${getCategoryColor(vegetable.category)}`}>
                {vegetable.category}
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-500 italic mb-2">{vegetable.botanical_name}</p>
          <div className="flex gap-2 mt-auto pt-3 border-t border-[var(--border-soft)] flex-wrap">
            {vegetable.storage_life_weeks && (
              <span className="text-xs bg-[var(--gold-50)] text-amber-900 px-2 py-1 rounded-full">
                Stores: {vegetable.storage_life_weeks}w
              </span>
            )}
            {vegetable.pest_resistance && (
              <span className="text-xs bg-[var(--forest-50)] text-[var(--forest)] px-2 py-1 rounded-full">
                Pest: {vegetable.pest_resistance}
              </span>
            )}
            <span className="text-xs bg-[var(--sage-50)] text-[var(--sage-400)] px-2 py-1 rounded-full">{vegetable.sun}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

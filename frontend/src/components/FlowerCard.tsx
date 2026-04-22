import Link from "next/link";
import Image from "next/image";
import { Flower } from "@/lib/api";
import flowerImages from "@/lib/flower-images.json";

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

export default function FlowerCard({ flower }: { flower: Flower }) {
  const harvestImg = flower.growth_stages?.harvest || (flowerImages as Record<string, string>)[flower.common_name];
  const slug = (flower as any).slug || toSlug(flower.common_name);
  const stages = flower.growth_stages;

  return (
    <Link href={`/flowers/${slug}`}>
      <div className="glass-card hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col overflow-hidden">
        {harvestImg ? (
          <div className="relative w-full h-48 md:h-56 bg-[var(--card-alt)]">
            <Image
              src={harvestImg}
              alt={flower.common_name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            {/* Stage label on hover */}
            <div className="absolute top-2 left-2 bg-white/90 dark:bg-[var(--card)]/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-medium flex items-center gap-1">
              <span>🌻</span> Harvest
            </div>
          </div>
        ) : (
          <div className="w-full h-48 bg-[var(--card-alt)] flex items-center justify-center text-5xl">
            &#x1F33C;
          </div>
        )}
        {/* Growth stage indicators */}
        {stages && (
          <div className="flex gap-2 justify-center py-2 bg-white/60 dark:bg-[var(--card)]/60 border-b border-[var(--border-soft)] dark:border-[var(--border)]">
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
            <h3 className="font-bold text-lg leading-tight">{flower.common_name}</h3>
            <span className={`badge capitalize ${getTypeColorInline(flower.type)} ml-2`}>
              {flower.type}
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)] italic mb-2">{flower.botanical_name}</p>
          <div className="flex gap-3 mt-auto pt-3 border-t border-[var(--border-soft)]">
            <span className="text-xs bg-[var(--forest-50)] text-[var(--forest)] px-2 py-1 rounded-full">Vase: {flower.vase_life_days}d</span>
            <span className="text-xs bg-[var(--sage-50)] text-[var(--sage-400)] px-2 py-1 rounded-full">{flower.sun}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function getTypeColorInline(type: string): string {
  switch (type) {
    case "annual": return "bg-[var(--forest-100)] text-[var(--forest)]";
    case "perennial": return "bg-[var(--sage-100)] text-[var(--sage-400)]";
    case "biennial": return "bg-[var(--gold-100)] text-amber-900";
    case "corm": return "bg-[var(--terracotta-100)] text-[var(--terracotta-500)]";
    case "bulb": return "bg-[var(--terracotta-100)] text-[var(--terracotta-500)]";
    default: return "bg-[var(--cream-200)] text-[var(--text-muted)]";
  }
}

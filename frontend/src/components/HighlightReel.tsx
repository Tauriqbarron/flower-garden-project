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

export default function HighlightReel({
  sowNow,
  harvestNow,
  type = "flowers",
}: HighlightReelProps) {
  const basePath = type === "vegetables" ? "/vegetables" : "/flowers";

  const hasSow = sowNow.length > 0;
  const hasHarvest = harvestNow.length > 0;

  if (!hasSow && !hasHarvest) {
    return null;
  }

  return (
    <div className="space-y-6 mb-8">
      {hasSow && (
        <HighlightSection
          title="Planting Now"
          emoji="🌱"
          subtitle={`${sowNow.length} varieties to sow`}
        >
          {sowNow.map((item) => (
            <HighlightCard
              key={item.name}
              name={item.name}
              slug={item.slug}
              href={`${basePath}/${item.slug || encodeURIComponent(item.name)}`}
              imageUrl={item.growth_stages?.harvest || item.growth_stages?.seedling}
              badge={item.timing_label}
              badgeColor={item.timing_color}
            />
          ))}
        </HighlightSection>
      )}

      {hasHarvest && (
        <HighlightSection
          title="Harvest Now"
          emoji="✂️"
          subtitle={`${harvestNow.length} varieties ready`}
        >
          {harvestNow.map((item) => (
            <HighlightCard
              key={item.name}
              name={item.name}
              slug={item.slug}
              href={`${basePath}/${item.slug || encodeURIComponent(item.name)}`}
              imageUrl={item.growth_stages?.harvest}
            />
          ))}
        </HighlightSection>
      )}
    </div>
  );
}

function HighlightSection({
  title,
  emoji,
  subtitle,
  children,
}: {
  title: string;
  emoji: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card p-6 border border-green-200 bg-green-50/30">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{emoji}</span>
        <h2 className="font-bold text-xl">{title}</h2>
        <span className="text-sm text-gray-500 ml-auto">{subtitle}</span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {children}
      </div>
    </div>
  );
}

function HighlightCard({
  name,
  slug,
  href,
  imageUrl,
  badge,
  badgeColor,
}: {
  name: string;
  slug: string;
  href: string;
  imageUrl?: string | null;
  badge?: string;
  badgeColor?: string;
}) {
  const badgeClasses =
    badgeColor === "green"
      ? "bg-green-100 text-green-800"
      : badgeColor === "amber"
      ? "bg-amber-100 text-amber-800"
      : badgeColor === "red"
      ? "bg-red-100 text-red-800"
      : "bg-gray-100 text-gray-600";

  return (
    <Link href={href} className="flex-shrink-0 w-40 group">
      <div className="rounded-lg overflow-hidden border border-gray-200 hover:shadow-md transition bg-white">
        <div className="relative w-full h-32 bg-gray-100">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-cover"
              sizes="160px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">
              🌿
            </div>
          )}
        </div>
        <div className="p-2.5">
          <p className="text-sm font-semibold truncate">{name}</p>
          {badge && (
            <span
              className={`inline-block text-xs px-1.5 py-0.5 rounded-full mt-1 ${badgeClasses}`}
            >
              {badge}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

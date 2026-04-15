import Link from "next/link";
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

export default function VegetableCard({ vegetable }: { vegetable: Vegetable }) {
  const slug = (vegetable as any).slug || toSlug(vegetable.common_name);

  return (
    <Link href={`/vegetables/${slug}`}>
      <div className="glass-card hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col overflow-hidden">
        <div className="w-full h-48 bg-gradient-to-br from-green-50 to-amber-50 flex items-center justify-center text-5xl">
          {getVegEmoji(vegetable.type)}
        </div>
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
          <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100 flex-wrap">
            {vegetable.storage_life_weeks && (
              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full">
                Stores: {vegetable.storage_life_weeks}w
              </span>
            )}
            {vegetable.pest_resistance && (
              <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                Pest: {vegetable.pest_resistance}
              </span>
            )}
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">{vegetable.sun}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

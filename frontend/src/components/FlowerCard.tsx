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

export default function FlowerCard({ flower }: { flower: Flower }) {
  const imgSrc = (flowerImages as Record<string, string>)[flower.common_name];
  const slug = (flower as any).slug || toSlug(flower.common_name);

  return (
    <Link href={`/flowers/${slug}`}>
      <div className="glass-card hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col overflow-hidden">
        {imgSrc ? (
          <div className="relative w-full h-48 bg-gray-100">
            <Image
              src={imgSrc}
              alt={flower.common_name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </div>
        ) : (
          <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-5xl">
            &#x1F33C;
          </div>
        )}
        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold text-lg leading-tight">{flower.common_name}</h3>
            <span className={`badge capitalize ${getTypeColorInline(flower.type)} ml-2`}>
              {flower.type}
            </span>
          </div>
          <p className="text-sm text-gray-500 italic mb-2">{flower.botanical_name}</p>
          <div className="flex gap-3 mt-auto pt-3 border-t border-gray-100">
            <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">Vase: {flower.vase_life_days}d</span>
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">{flower.sun}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function getTypeColorInline(type: string): string {
  switch (type) {
    case "annual": return "bg-green-100 text-green-800";
    case "perennial": return "bg-blue-100 text-blue-800";
    case "biennial": return "bg-amber-100 text-amber-800";
    case "corm": return "bg-purple-100 text-purple-800";
    case "bulb": return "bg-purple-100 text-purple-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

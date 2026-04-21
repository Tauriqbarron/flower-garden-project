"use client";
import { useEffect, useState } from "react";
import { useRegion } from "@/lib/region";
import { fetchFlowers, Flower } from "@/lib/api";
import FlowerCard from "@/components/FlowerCard";

export default function FlowersPage() {
  const { region } = useRegion();
  const [flowers, setFlowers] = useState<Flower[]>([]);

  useEffect(() => {
    fetchFlowers(region).then(setFlowers);
  }, [region]);

  if (flowers.length === 0) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-100 rounded w-1/3"></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-gray-100 rounded-lg"></div>)}
      </div>
    </div>;
  }

  const types = Array.from(new Set(flowers.map((f) => f.type)));
  const regionLabel = region === "christchurch" ? "Christchurch" : "Auckland";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">All Cut Flowers</h1>
        <p className="text-gray-500">{flowers.length} varieties for {regionLabel} gardens</p>
      </div>

      {types.map((type) => (
        <div key={type} className="mb-8">
          <h2 className="text-lg font-semibold capitalize mb-3 flex items-center gap-2">
            <TypeIcon type={type} />
            {type}s ({flowers.filter((f) => f.type === type).length})
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {flowers
              .filter((f) => f.type === type)
              .map((f) => (
                <FlowerCard key={f.common_name} flower={f} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    annual: "&#x1F33B;",
    perennial: "&#x1F338;",
    biennial: "&#x1F33C;",
    corm: "&#x1F9C4;",
    bulb: "&#x1F331;",
  };
  return <span dangerouslySetInnerHTML={{ __html: icons[type] || "&#x1F33A;" }} />;
}

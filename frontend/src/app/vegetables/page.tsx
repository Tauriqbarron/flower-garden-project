"use client";
import { useEffect, useState } from "react";
import { useRegion } from "@/lib/region";
import { fetchVegetables, Vegetable } from "@/lib/api";
import VegetableCard from "@/components/VegetableCard";

export default function VegetablesPage() {
  const { region } = useRegion();
  const [vegetables, setVegetables] = useState<Vegetable[]>([]);

  useEffect(() => {
    fetchVegetables(region).then(setVegetables);
  }, [region]);

  if (vegetables.length === 0) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-100 rounded w-1/3"></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-gray-100 rounded-lg"></div>)}
      </div>
    </div>;
  }

  const categories = Array.from(new Set(vegetables.map((v) => v.category)));
  const regionLabel = region === "christchurch" ? "Christchurch" : "Auckland";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">All Vegetables</h1>
        <p className="text-gray-500">{vegetables.length} varieties for {regionLabel} gardens</p>
      </div>

      {categories.map((cat) => (
        <div key={cat} className="mb-8">
          <h2 className="text-lg font-semibold capitalize mb-3 flex items-center gap-2">
            {cat === "staple" ? "🏠" : "🥬"}
            {cat === "staple" ? "Storage Staples" : "Pest-Resistant Greens"} ({vegetables.filter((v) => v.category === cat).length})
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vegetables
              .filter((v) => v.category === cat)
              .map((v) => (
                <VegetableCard key={v.common_name} vegetable={v} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

import { fetchVegetables } from "@/lib/api";
import VegetableCard from "@/components/VegetableCard";
import { Vegetable } from "@/lib/api";

export default async function VegetablesPage() {
  const vegetables: Vegetable[] = await fetchVegetables();

  const categories = Array.from(new Set(vegetables.map((v) => v.category)));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">All Vegetables</h1>
        <p className="text-gray-500">{vegetables.length} varieties for Auckland gardens</p>
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

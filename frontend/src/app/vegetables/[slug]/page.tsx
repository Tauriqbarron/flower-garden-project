import { fetchVegetableBySlug, fetchAllVegetableSlugs } from "@/lib/api";
import Link from "next/link";
import { MonthBar } from "@/components/MonthBar";

export async function generateStaticParams() {
  const slugs = await fetchAllVegetableSlugs();
  return slugs.map((s: string) => ({ slug: s }));
}

export default async function VegetableDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vegetable = await fetchVegetableBySlug(slug);

  if ((vegetable as any).error) {
    return <div className="text-center py-20">Vegetable not found</div>;
  }

  return (
    <div>
      <Link href="/vegetables" className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-block">
        &larr; Back to all vegetables
      </Link>

      <div className="glass-card overflow-hidden">
        {/* Hero placeholder */}
        <div className="w-full h-64 bg-gradient-to-br from-green-50 to-amber-50 flex items-center justify-center text-7xl">
          🥕
        </div>

        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">{vegetable.common_name}</h1>
              <p className="text-gray-500 italic text-lg">{vegetable.botanical_name}</p>
              <p className="text-sm text-gray-400 mt-1">
                {vegetable.family} · <span className="capitalize">{vegetable.type}</span> · <span className="capitalize">{vegetable.category}</span>
              </p>
            </div>
            {vegetable.storage_life_weeks && (
              <div className="text-right">
                <div className="text-3xl font-bold text-amber-600">{vegetable.storage_life_weeks}w</div>
                <div className="text-sm text-gray-500">storage life</div>
              </div>
            )}
          </div>

          {/* Growing conditions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <InfoBlock label="Sun" value={vegetable.sun} />
            <InfoBlock label="Soil pH" value={vegetable.soil_ph} />
            <InfoBlock label="Spacing" value={`${vegetable.spacing_cm}cm`} />
            {vegetable.storage_method && <InfoBlock label="Storage" value={vegetable.storage_method.split(".")[0]} />}
          </div>

          {/* Auckland Calendar */}
          <div className="mb-6">
            <h2 className="font-semibold text-lg mb-3">Auckland Growing Calendar</h2>
            <MonthBar
              months={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]}
              sowStart={vegetable.auckland_sow_start}
              sowEnd={vegetable.auckland_sow_end}
              transplantStart={vegetable.auckland_transplant_start}
              transplantEnd={vegetable.auckland_transplant_end}
              floweringStart={vegetable.harvest_start}
              floweringEnd={vegetable.harvest_end}
            />
          </div>

          {/* Details grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Growing Details</h3>
              <dl className="space-y-2 text-sm">
                <DetailRow label="Soil" value={vegetable.soil_type} />
                {vegetable.sow_depth_cm && <DetailRow label="Sow depth" value={`${vegetable.sow_depth_cm}cm`} />}
                {vegetable.germination_temp_c && <DetailRow label="Germination temp" value={`${vegetable.germination_temp_c}°C`} />}
                {vegetable.germination_days && <DetailRow label="Germination time" value={`${vegetable.germination_days} days`} />}
                {vegetable.days_to_maturity_sow && <DetailRow label="Days to harvest (sow)" value={`${vegetable.days_to_maturity_sow}`} />}
              </dl>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Resistance</h3>
              <div className="flex gap-3 mb-3">
                {vegetable.pest_resistance && (
                  <span className={`badge ${vegetable.pest_resistance === "high" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                    Pest: {vegetable.pest_resistance}
                  </span>
                )}
                {vegetable.disease_resistance && (
                  <span className={`badge ${vegetable.disease_resistance === "high" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                    Disease: {vegetable.disease_resistance}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{vegetable.growing_notes}</p>
            </div>
          </div>

          {/* Storage */}
          {vegetable.storage_life_weeks && (
            <div className="mt-6 pt-4 border-t text-sm">
              <h3 className="font-semibold mb-1">Storage</h3>
              <p className="text-gray-600">{vegetable.storage_method}</p>
            </div>
          )}

          {/* Varieties */}
          <div className="mt-4 pt-4 border-t text-sm">
            <h3 className="font-semibold mb-1">Auckland Varieties</h3>
            <p className="text-gray-600">{vegetable.auckland_varieties}</p>
          </div>

          {/* Pests */}
          <div className="mt-4 pt-4 border-t text-sm">
            <h3 className="font-semibold mb-1">Pest & Disease Notes</h3>
            <p className="text-gray-600">{vegetable.pest_disease_notes}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold text-sm">{value}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

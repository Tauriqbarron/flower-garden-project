"use client";
import { useEffect, useState } from "react";
import { useRegion } from "@/lib/region";
import { fetchNativeBySlug, Native } from "@/lib/api";
import Link from "next/link";
import GrowthCarousel from "@/components/GrowthCarousel";
import { monthName } from "@/lib/api";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold">{value}</div>
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

function MonthBadge({ month }: { month: number }) {
  return (
    <span className="inline-block bg-[var(--forest-50)] text-[var(--forest)] text-xs px-2 py-0.5 rounded-full mr-1 mb-1">
      {MONTHS[month - 1]}
    </span>
  );
}

export default function NativeDetailClient({ slug }: { slug: string }) {
  const { region } = useRegion();
  const [native, setNative] = useState<Native | null>(null);

  useEffect(() => {
    fetchNativeBySlug(slug).then(setNative);
  }, [slug]);

  if (!native) {
    return (
      <div className="animate-pulse space-y-4 py-8">
        <div className="h-8 bg-gray-100 rounded w-1/3"></div>
        <div className="h-64 bg-gray-100 rounded-lg"></div>
      </div>
    );
  }

  if (!native.common_name) {
    return <div className="text-center py-20">Native plant not found</div>;
  }

  const regionData = native.regions?.[region] || native.regions?.["auckland"] || {};
  const regionLabel = region === "christchurch" ? "Christchurch" : "Auckland";

  return (
    <div>
      <Link href="/natives" className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-block">
        &larr; Back to all natives
      </Link>

      <div className="glass-card overflow-hidden">
        <GrowthCarousel stages={native.growth_stages} plantName={native.common_name} />

        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">{native.common_name}</h1>
              <p className="text-gray-500 italic text-lg">{native.botanical_name}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-gray-400">{native.family}</p>
                <span className="text-gray-300">·</span>
                <span className="text-sm text-gray-400 capitalize">{native.life_cycle}</span>
                {native.māori_name && (
                  <>
                    <span className="text-gray-300">·</span>
                    <p className="text-sm text-[var(--forest)] font-medium">{native.māori_name}</p>
                  </>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">{native.max_height_m}m</div>
              <div className="text-sm text-gray-500">max height</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <InfoBlock label="Sun" value={native.sun} />
            <InfoBlock label="Soil pH" value={native.soil_ph} />
            <InfoBlock label="Growth Rate" value={native.growth_rate.replace("_", " ")} />
            <InfoBlock label="Lifespan" value={`${native.life_expectancy_years}y`} />
          </div>

          {/* Flowering & Fruiting */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="font-semibold mb-2">🌸 Flowering Months</h3>
              {native.flowering_months && native.flowering_months.length > 0 ? (
                <div>{native.flowering_months.map((m) => <MonthBadge key={m} month={m} />)}</div>
              ) : (
                <p className="text-sm text-gray-400">Information not available</p>
              )}
            </div>
            <div>
              <h3 className="font-semibold mb-2">🍇 Fruiting Months</h3>
              {native.fruiting_months && native.fruiting_months.length > 0 ? (
                <div>{native.fruiting_months.map((m) => <MonthBadge key={m} month={m} />)}</div>
              ) : (
                <p className="text-sm text-gray-400">Information not available</p>
              )}
            </div>
          </div>

          {/* Birds attracted */}
          {native.birds_attracted && native.birds_attracted.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">🐦 Birds Attracted</h3>
              <div className="flex flex-wrap gap-1">
                {native.birds_attracted.map((bird) => (
                  <span key={bird} className="text-xs bg-[var(--forest-50)] text-[var(--forest)] px-2 py-1 rounded-full">
                    {bird}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* NZ Growing Calendar */}
          {regionData && (
            <div className="mb-6">
              <h2 className="font-semibold text-lg mb-3">{regionLabel} Growing Calendar</h2>
              <dl className="space-y-2 text-sm">
                {regionData.sow_start && regionData.sow_end && (
                  <DetailRow
                    label="Sow"
                    value={`${monthName(regionData.sow_start)} – ${monthName(regionData.sow_end)}`}
                  />
                )}
                {regionData.varieties && (
                  <DetailRow label="Recommended varieties" value={regionData.varieties} />
                )}
              </dl>
            </div>
          )}

          {/* Propagation */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold mb-2">Propagation</h3>
              <dl className="space-y-2 text-sm">
                <DetailRow label="Method" value={native.propagation_method} />
                {native.sow_depth_cm && (
                  <DetailRow label="Sow depth" value={`${native.sow_depth_cm}cm`} />
                )}
                {native.germination_days && (
                  <DetailRow label="Germination" value={native.germination_days} />
                )}
                <DetailRow label="Time to maturity" value={`${native.time_to_maturity_years} years`} />
              </dl>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Growing Details</h3>
              <dl className="space-y-2 text-sm">
                <DetailRow label="Soil type" value={native.soil_type} />
                <DetailRow label="Max spread" value={`${native.max_spread_m}m`} />
                <DetailRow label="Deciduous" value={native.is_deciduous ? "Yes" : "No"} />
              </dl>
            </div>
          </div>

          {/* Cultural Significance */}
          {native.cultural_significance && (
            <div className="mt-4 pt-4 border-t text-sm">
              <h3 className="font-semibold mb-1">🪶 Cultural Significance</h3>
              <p className="text-gray-600">{native.cultural_significance}</p>
            </div>
          )}

          {/* Traditional Uses */}
          {native.traditional_uses && (
            <div className="mt-4 pt-4 border-t text-sm">
              <h3 className="font-semibold mb-1">🏠 Traditional Uses</h3>
              <p className="text-gray-600">{native.traditional_uses}</p>
            </div>
          )}

          {/* Coastal / Riparian notes */}
          {(native.coastal_notes || native.riparian_use) && (
            <div className="mt-4 pt-4 border-t text-sm">
              <h3 className="font-semibold mb-1">🌿 Garden Notes</h3>
              {native.coastal_notes && <p className="text-gray-600 mb-1">Coastal: {native.coastal_notes}</p>}
              {native.riparian_use && <p className="text-gray-600">Riparian: {native.riparian_use}</p>}
            </div>
          )}

          {/* Pest & Disease */}
          {native.pest_disease_notes && (
            <div className="mt-4 pt-4 border-t text-sm">
              <h3 className="font-semibold mb-1">🐛 Pest & Disease Notes</h3>
              <p className="text-gray-600">{native.pest_disease_notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

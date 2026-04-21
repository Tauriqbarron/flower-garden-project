"use client";
import { useEffect, useState } from "react";
import { useRegion } from "@/lib/region";
import { fetchFlowerBySlug, Flower } from "@/lib/api";
import Link from "next/link";
import { MonthBar } from "@/components/MonthBar";
import GrowthCarousel from "@/components/GrowthCarousel";

export default function FlowerDetailClient({ slug }: { slug: string }) {
  const { region } = useRegion();
  const [flower, setFlower] = useState<Flower | null>(null);

  useEffect(() => {
    fetchFlowerBySlug(slug).then(setFlower);
  }, [slug]);

  if (!flower) {
    return <div className="animate-pulse space-y-4 py-8">
      <div className="h-8 bg-gray-100 rounded w-1/3"></div>
      <div className="h-64 bg-gray-100 rounded-lg"></div>
    </div>;
  }

  if (!flower.common_name) {
    return <div className="text-center py-20">Flower not found</div>;
  }

  const regionData = flower.regions?.[region] || flower.regions?.["auckland"] || {};
  const regionLabel = region === "christchurch" ? "Christchurch" : "Auckland";

  return (
    <div>
      <Link href="/flowers" className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-block">
        &larr; Back to all flowers
      </Link>

      <div className="glass-card overflow-hidden">
        <GrowthCarousel stages={flower.growth_stages} plantName={flower.common_name} />

        <div className="p-6 md:p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">{flower.common_name}</h1>
            <p className="text-gray-500 italic text-lg">{flower.botanical_name}</p>
            <p className="text-sm text-gray-400 mt-1">{flower.family} &middot; <span className="capitalize">{flower.type}</span></p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-green-600">{flower.vase_life_days}d</div>
            <div className="text-sm text-gray-500">vase life</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <InfoBlock label="Sun" value={flower.sun} />
          <InfoBlock label="Soil pH" value={flower.soil_ph} />
          <InfoBlock label="Spacing" value={`${flower.spacing_cm}cm`} />
          <InfoBlock label="Stem" value={flower.stem_length_cm} />
        </div>

        <div className="mb-6">
          <h2 className="font-semibold text-lg mb-3">{regionLabel} Growing Calendar</h2>
          <MonthBar
            months={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]}
            sowStart={regionData.sow_start}
            sowEnd={regionData.sow_end}
            transplantStart={regionData.transplant_start}
            transplantEnd={regionData.transplant_end}
            floweringStart={flower.flowering_start}
            floweringEnd={flower.flowering_end}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Growing Details</h3>
            <dl className="space-y-2 text-sm">
              <DetailRow label="Soil" value={flower.soil_type} />
              {flower.sow_depth_cm && <DetailRow label="Sow depth" value={`${flower.sow_depth_cm}cm`} />}
              {flower.germination_temp_c && <DetailRow label="Germination temp" value={`${flower.germination_temp_c}°C`} />}
              {flower.germination_days && <DetailRow label="Germination time" value={`${flower.germination_days} days`} />}
              {flower.days_to_maturity_sow && <DetailRow label="Days to mature (sow)" value={`${flower.days_to_maturity_sow}`} />}
              {flower.days_to_maturity_transplant && <DetailRow label="Days to mature (transplant)" value={`${flower.days_to_maturity_transplant}`} />}
            </dl>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Care</h3>
            <div className="flex gap-3 mb-3">
              {flower.pinching && <span className="badge bg-amber-100 text-amber-800">Pinch</span>}
              {flower.staking && <span className="badge bg-blue-100 text-blue-800">Stake</span>}
              {flower.deadheading && <span className="badge bg-green-100 text-green-800">Deadhead</span>}
            </div>
            <p className="text-sm text-gray-600">{flower.cut_flower_notes}</p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t text-sm">
          <h3 className="font-semibold mb-1">{regionLabel} Varieties</h3>
          <p className="text-gray-600">{regionData.varieties || "Not yet available for this region"}</p>
        </div>

        <div className="mt-4 pt-4 border-t text-sm">
          <h3 className="font-semibold mb-1">Pest & Disease Notes</h3>
          <p className="text-gray-600">{flower.pest_disease_notes}</p>
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

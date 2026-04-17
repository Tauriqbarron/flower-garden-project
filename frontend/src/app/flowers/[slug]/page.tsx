import { fetchFlowerBySlug, fetchFlowers } from "@/lib/api";
import Image from "next/image";
import Link from "next/link";
import { MonthBar } from "@/components/MonthBar";
import flowerImages from "@/lib/flower-images.json";

export default async function FlowerDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const flower = await fetchFlowerBySlug(slug);

  if (!flower.common_name) {
    return <div className="text-center py-20">Flower not found</div>;
  }

  const imgSrc = (flowerImages as Record<string, string>)[flower.common_name];

  return (
    <div>
      <Link href="/flowers" className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-block">
        &larr; Back to all flowers
      </Link>

      <div className="glass-card overflow-hidden">
        {/* Hero Image */}
        {imgSrc ? (
          <div className="relative w-full h-64 md:h-80 bg-gray-100">
            <Image
              src={imgSrc}
              alt={flower.common_name}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        ) : (
          <div className="w-full h-64 bg-gray-100 flex items-center justify-center text-7xl">
            &#x1F33C;
          </div>
        )}

        <div className="p-6 md:p-8">
        {/* Header */}
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

        {/* Growing conditions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <InfoBlock label="Sun" value={flower.sun} />
          <InfoBlock label="Soil pH" value={flower.soil_ph} />
          <InfoBlock label="Spacing" value={`${flower.spacing_cm}cm`} />
          <InfoBlock label="Stem" value={flower.stem_length_cm} />
        </div>

        {/* Auckland Calendar */}
        <div className="mb-6">
          <h2 className="font-semibold text-lg mb-3">Auckland Growing Calendar</h2>
          <MonthBar
            months={[
              "Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
            ]}
            sowStart={flower.auckland_sow_start}
            sowEnd={flower.auckland_sow_end}
            transplantStart={flower.auckland_transplant_start}
            transplantEnd={flower.auckland_transplant_end}
            floweringStart={flower.flowering_start}
            floweringEnd={flower.flowering_end}
          />
        </div>

        {/* Details grid */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Growing Details</h3>
            <dl className="space-y-2 text-sm">
              <DetailRow label="Soil" value={flower.soil_type} />
              {flower.sow_depth_cm && <DetailRow label="Sow depth" value={`${flower.sow_depth_cm}cm`} />}
              {flower.germination_temp_c && <DetailRow label="Germination temp" value={`${flower.germination_temp_c} deg C`} />}
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

        {/* Varieties */}
        <div className="mt-6 pt-4 border-t text-sm">
          <h3 className="font-semibold mb-1">Auckland Varieties</h3>
          <p className="text-gray-600">{flower.auckland_varieties}</p>
        </div>

        {/* Pests */}
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

import Link from "next/link";
import type { VegSowNowDetail } from "@/lib/api";

export default function VegSowCard({ vegetable }: { vegetable: VegSowNowDetail }) {
  const borderColor =
    vegetable.timing_color === "green"
      ? "border-green-300 bg-green-50"
      : vegetable.timing_color === "amber"
      ? "border-amber-300 bg-amber-50"
      : "border-red-300 bg-red-50";

  const badgeColor =
    vegetable.timing_color === "green"
      ? "bg-green-100 text-green-800"
      : vegetable.timing_color === "amber"
      ? "bg-amber-100 text-amber-800"
      : "bg-red-100 text-red-800";

  return (
    <Link href={`/vegetables/${vegetable.slug || encodeURIComponent(vegetable.name)}`}>
      <div className={`rounded-lg p-4 border ${borderColor} hover:shadow-md transition cursor-pointer h-full`}>
        <div className="flex items-start justify-between mb-2">
          <span className="font-semibold text-sm">{vegetable.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>
            {vegetable.timing_label}
          </span>
        </div>
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex items-center gap-1">
            <span>🎯</span>
            <span>Optimal: <strong>{vegetable.optimal_month_name}</strong></span>
          </div>
          <div className="flex items-center gap-1">
            <span>🥕</span>
            <span>{vegetable.expected_harvest_text}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

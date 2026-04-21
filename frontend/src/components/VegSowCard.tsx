import Link from "next/link";
import type { VegSowNowDetail } from "@/lib/api";

export default function VegSowCard({ vegetable }: { vegetable: VegSowNowDetail }) {
  const borderColor =
    vegetable.timing_color === "green"
      ? "border-[var(--forest-200)] bg-[var(--forest-50)]"
      : vegetable.timing_color === "amber"
      ? "border-[var(--gold-200)] bg-[var(--gold-50)]"
      : "border-[var(--pohutukawa-200)] bg-[var(--pohutukawa-50)]";

  const badgeColor =
    vegetable.timing_color === "green"
      ? "bg-[var(--forest-100)] text-[var(--forest)]"
      : vegetable.timing_color === "amber"
      ? "bg-[var(--gold-100)] text-amber-900"
      : "bg-[var(--pohutukawa-100)] text-[var(--pohutukawa)]";

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

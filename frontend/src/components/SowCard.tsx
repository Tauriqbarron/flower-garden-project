import Link from "next/link";
import type { SowNowDetail } from "@/lib/api";

export default function SowCard({ flower }: { flower: SowNowDetail }) {
  const borderColor =
    flower.timing_color === "green"
      ? "border-[var(--forest-200)] bg-[var(--forest-50)]"
      : flower.timing_color === "amber"
      ? "border-[var(--gold-200)] bg-[var(--gold-50)]"
      : "border-[var(--pohutukawa-200)] bg-[var(--pohutukawa-50)]";

  const badgeColor =
    flower.timing_color === "green"
      ? "bg-[var(--forest-100)] text-[var(--forest)]"
      : flower.timing_color === "amber"
      ? "bg-[var(--gold-100)] text-amber-900"
      : "bg-[var(--pohutukawa-100)] text-[var(--pohutukawa)]";

  return (
    <Link href={`/flowers/${flower.slug || encodeURIComponent(flower.name)}`}>
      <div className={`rounded-lg p-4 border ${borderColor} hover:shadow-md transition cursor-pointer h-full`}>
        <div className="flex items-start justify-between mb-2">
          <span className="font-semibold text-sm">{flower.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>
            {flower.timing_label}
          </span>
        </div>
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex items-center gap-1">
            <span>🎯</span>
            <span>Optimal: <strong>{flower.optimal_month_name}</strong></span>
          </div>
          <div className="flex items-center gap-1">
            <span>🌸</span>
            <span>{flower.expected_bloom_text}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

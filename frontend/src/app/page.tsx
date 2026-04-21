import { fetchDashboard } from "@/lib/api";
import Link from "next/link";
import type { SowNowDetail } from "@/lib/api";
import ComingUpPanel from "@/components/ComingUpPanel";
import HighlightReel from "@/components/HighlightReel";

export default async function HomePage() {
  const data = await fetchDashboard();

  return (
    <div>
      {/* Season bar */}
      <div className="glass-card px-6 py-3 mb-6 flex items-center gap-3 border border-green-100">
        <span className="text-lg">🌸</span>
        <p className="text-gray-700">
          <strong>{data.current_month}</strong> · {data.current_season}
        </p>
      </div>

      {/* Highlight Reel — what's happening now */}
      <HighlightReel
        sowNow={data.sow_now_details}
        harvestNow={data.harvest_now}
        type="flowers"
      />

      {/* Sow Now — enriched with timing & bloom */}
      <div className="glass-card p-6 mb-8 border border-[#a8d1b8] bg-[#f0f7f3]/30">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🌱</span>
          <h2 className="font-bold text-xl">Sow Now</h2>
          <span className="text-sm text-gray-500 ml-auto">
            Sorted by timing — closest to optimal first
          </span>
        </div>
        {data.sow_now_details.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing to sow right now</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.sow_now_details.map((flower) => (
              <SowCard key={flower.name} flower={flower} />
            ))}
          </div>
        )}
      </div>

      {/* What's Coming Up — urgency-based lookahead */}
      <ComingUpPanel actions={data.upcoming_actions} />

      {/* Transplant Now */}
      <div className="mb-8">
        <ActionCard
          title="Transplant Now"
          emoji="🌿"
          items={data.transplant_now}
          color="blue"
          link="/flowers"
        />
      </div>

      {/* Top Vase Life */}
      <div className="glass-card p-6 mb-8">
        <h2 className="font-bold text-xl mb-4">Longest Vase Life</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {data.top_vase_life.map((f) => (
            <Link key={f.name} href={`/flowers/${encodeURIComponent(f.name)}`}>
              <div className="bg-gradient-to-br from-[var(--pohutukawa-50)] to-[var(--terracotta-50)] rounded-lg p-4 text-center border border-[var(--pohutukawa-100)] hover:shadow-md transition cursor-pointer">
                <div className="text-2xl font-bold text-[var(--pohutukawa)]">{f.vase_life}</div>
                <div className="text-sm text-gray-600 mt-1">{f.name}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function SowCard({ flower }: { flower: SowNowDetail }) {
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
      <div
        className={`rounded-lg p-4 border ${borderColor} hover:shadow-md transition cursor-pointer h-full`}
      >
        <div className="flex items-start justify-between mb-2">
          <span className="font-semibold text-sm">{flower.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>
            {flower.timing_label}
          </span>
        </div>
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex items-center gap-1">
            <span>🎯</span>
            <span>
              Optimal: <strong>{flower.optimal_month_name}</strong>
            </span>
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

function ActionCard({ title, emoji, items, color, link }: {
  title: string; emoji: string; items: string[]; color: string; link: string;
}) {
  const colorClasses: Record<string, string> = {
    green: "border-green-200 bg-green-50/50",
    blue: "border-blue-200 bg-blue-50/50",
    pink: "border-pink-200 bg-pink-50/50",
  };
  return (
    <div className={`glass-card p-5 border ${colorClasses[color] || ""}`}>
      <div className="flex items-center gap-2 mb-3">
        <span dangerouslySetInnerHTML={{ __html: emoji }} className="text-xl" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">Nothing to do right now for this category</p>
      ) : (
        <ul className="space-y-1">
          {items.slice(0, 6).map((item) => (
            <li key={item}>
              <Link href={`/flowers/${encodeURIComponent(item)}`} className="text-sm hover:underline">
                {item}
              </Link>
            </li>
          ))}
          {items.length > 6 && (
            <li className="text-sm text-gray-400">+{items.length - 6} more</li>
          )}
        </ul>
      )}
    </div>
  );
}

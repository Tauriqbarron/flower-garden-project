import { fetchDashboard } from "@/lib/api";
import Link from "next/link";
import { monthFull } from "@/lib/api";
import type { SowNowDetail } from "@/lib/api";

export default async function HomePage() {
  const data = await fetchDashboard();

  return (
    <div>
      {/* Hero */}
      <div className="glass-card p-8 mb-8 bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
        <h1 className="text-3xl font-bold mb-2">Welcome to Your Flower Garden Planner</h1>
        <p className="text-gray-600 text-lg">
          It is currently <strong>{data.current_month}</strong> ({data.current_season}) in Auckland.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Flowers" value={data.total_flowers} color="bg-green-500" />
        <StatCard label="Annuals" value={data.annuals} color="bg-emerald-500" />
        <StatCard label="Perennials" value={data.perennials} color="bg-blue-500" />
        <StatCard label="Bulbs & Corms" value={data.bulbs_corms} color="bg-purple-500" />
      </div>

      {/* Sow Now — enriched with timing & bloom */}
      <div className="glass-card p-6 mb-8 border border-green-200 bg-green-50/30">
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

      {/* Transplant & Harvest */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <ActionCard
          title="Transplant Now"
          emoji="🌿"
          items={data.transplant_now}
          color="blue"
          link="/flowers"
        />
        <ActionCard
          title="Harvest / Cut Now"
          emoji="✂️"
          items={data.harvest_now}
          color="pink"
          link="/flowers"
        />
      </div>

      {/* Top Vase Life */}
      <div className="glass-card p-6 mb-8">
        <h2 className="font-bold text-xl mb-4">Longest Vase Life</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {data.top_vase_life.map((f) => (
            <Link key={f.name} href={`/flowers/${encodeURIComponent(f.name)}`}>
              <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg p-4 text-center border border-pink-100 hover:shadow-md transition cursor-pointer">
                <div className="text-2xl font-bold text-pink-600">{f.vase_life}</div>
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
      ? "border-green-300 bg-green-50"
      : flower.timing_color === "amber"
      ? "border-amber-300 bg-amber-50"
      : "border-red-300 bg-red-50";

  const badgeColor =
    flower.timing_color === "green"
      ? "bg-green-100 text-green-800"
      : flower.timing_color === "amber"
      ? "bg-amber-100 text-amber-800"
      : "bg-red-100 text-red-800";

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

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass-card p-5">
      <div className={`w-3 h-3 rounded-full ${color} mb-2`}></div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
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

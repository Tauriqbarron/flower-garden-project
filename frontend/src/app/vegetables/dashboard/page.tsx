import { fetchVegetableDashboard } from "@/lib/api";
import Link from "next/link";
import VegSowCard from "@/components/VegSowCard";
import VegComingUpPanel from "@/components/VegComingUpPanel";
import HighlightReel from "@/components/HighlightReel";

export default async function VegetableDashboardPage() {
  const data = await fetchVegetableDashboard();

  return (
    <div>
      {/* Season bar */}
      <div className="glass-card px-6 py-3 mb-6 flex items-center gap-3 border border-amber-100">
        <span className="text-lg">🥕</span>
        <p className="text-gray-700">
          <strong>{data.current_month}</strong> · {data.current_season}
        </p>
      </div>

      {/* Highlight Reel */}
      <HighlightReel
        sowNow={data.sow_now_details}
        harvestNow={data.harvest_now}
        type="vegetables"
      />

      {/* Sow Now */}
      <div className="glass-card p-6 mb-8 border border-[#a8d1b8] bg-[#f0f7f3]/30">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🌱</span>
          <h2 className="font-bold text-xl">Sow Now</h2>
          <span className="text-sm text-gray-500 ml-auto">Sorted by timing — closest to optimal first</span>
        </div>
        {data.sow_now_details.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing to sow right now</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.sow_now_details.map((v) => (
              <VegSowCard key={v.name} vegetable={v} />
            ))}
          </div>
        )}
      </div>

      {/* What's Coming Up — urgency-based lookahead */}
      <VegComingUpPanel actions={data.upcoming_actions} />

      {/* Transplant Now */}
      <div className="mb-8">
        <ActionCard title="Transplant Now" emoji="🌿" items={data.transplant_now} color="blue" />
      </div>

      {/* Top Storage Life */}
      <div className="glass-card p-6 mb-8">
        <h2 className="font-bold text-xl mb-4">Longest Storage Life</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {data.top_storage_life.map((v) => (
            <Link key={v.name} href={`/vegetables/${encodeURIComponent(v.name)}`}>
              <div className="bg-gradient-to-br from-[var(--gold-50)] to-[var(--terracotta-50)] rounded-lg p-4 text-center border border-[var(--gold-100)] hover:shadow-md transition cursor-pointer">
                <div className="text-2xl font-bold text-[var(--terracotta)]">{v.storage_life_weeks}w</div>
                <div className="text-sm text-gray-600 mt-1">{v.name}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActionCard({ title, emoji, items, color }: {
  title: string; emoji: string; items: string[]; color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50/50",
    amber: "border-amber-200 bg-amber-50/50",
  };
  return (
    <div className={`glass-card p-5 border ${colorClasses[color] || ""}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{emoji}</span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">Nothing right now</p>
      ) : (
        <ul className="space-y-1">
          {items.slice(0, 6).map((item) => (
            <li key={item}>
              <Link href={`/vegetables/${encodeURIComponent(item)}`} className="text-sm hover:underline">{item}</Link>
            </li>
          ))}
          {items.length > 6 && <li className="text-sm text-gray-400">+{items.length - 6} more</li>}
        </ul>
      )}
    </div>
  );
}

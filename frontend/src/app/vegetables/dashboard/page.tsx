import { fetchVegetableDashboard } from "@/lib/api";
import Link from "next/link";
import VegSowCard from "@/components/VegSowCard";

export default async function VegetableDashboardPage() {
  const data = await fetchVegetableDashboard();

  return (
    <div>
      {/* Hero */}
      <div className="glass-card p-8 mb-8 bg-gradient-to-br from-amber-50 to-green-50 border-amber-100">
        <h1 className="text-3xl font-bold mb-2">Vegetable Garden</h1>
        <p className="text-gray-600 text-lg">
          It is currently <strong>{data.current_month}</strong> ({data.current_season}) in Auckland.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Varieties" value={data.total_vegetables} color="bg-green-500" />
        <StatCard label="Storage Staples" value={data.staples} color="bg-amber-500" />
        <StatCard label="Pest-Resistant Greens" value={data.greens} color="bg-emerald-500" />
      </div>

      {/* Sow Now */}
      <div className="glass-card p-6 mb-8 border border-green-200 bg-green-50/30">
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

      {/* Transplant & Harvest */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <ActionCard title="Transplant Now" emoji="🌿" items={data.transplant_now} color="blue" />
        <ActionCard title="Harvest Now" emoji="🧺" items={data.harvest_now} color="amber" />
      </div>

      {/* Top Storage Life */}
      <div className="glass-card p-6 mb-8">
        <h2 className="font-bold text-xl mb-4">Longest Storage Life</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {data.top_storage_life.map((v) => (
            <Link key={v.name} href={`/vegetables/${encodeURIComponent(v.name)}`}>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 text-center border border-amber-100 hover:shadow-md transition cursor-pointer">
                <div className="text-2xl font-bold text-amber-600">{v.storage_life_weeks}w</div>
                <div className="text-sm text-gray-600 mt-1">{v.name}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
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

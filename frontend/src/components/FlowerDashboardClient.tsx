"use client";
import { useEffect, useState } from "react";
import { useRegion } from "@/lib/region";
import { fetchDashboard, DashboardData, SowNowDetail, HarvestItem } from "@/lib/api";
import Link from "next/link";
import ComingUpPanel from "@/components/ComingUpPanel";
import HighlightReel from "@/components/HighlightReel";
import SowCard from "@/components/SowCard";

export default function FlowerDashboardClient() {
  const { region } = useRegion();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetchDashboard(region).then(setData);
  }, [region]);

  if (!data) {
    return <div className="animate-pulse space-y-4">
      <div className="h-14 bg-gray-100 rounded-lg"></div>
      <div className="h-48 bg-gray-100 rounded-lg"></div>
      <div className="h-64 bg-gray-100 rounded-lg"></div>
    </div>;
  }

  return (
    <div>
      {/* Season bar */}
      <div className="glass-card px-6 py-3 mb-6 flex items-center gap-3 border border-green-100 dark:border-[#1B4332]">
        <span className="text-lg">🌸</span>
        <p className="text-gray-700">
          <strong>{data.current_month}</strong> · {data.current_season}
        </p>
      </div>

      {/* Highlight Reel */}
      <HighlightReel
        sowNow={data.sow_now_details}
        harvestNow={data.harvest_now}
        type="flowers"
      />

      {/* Sow Now */}
      <div className="glass-card p-6 mb-8 border border-[#a8d1b8] dark:border-[#1B4332] bg-[#f0f7f3]/30 dark:bg-[#0f291e]/30">
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

      {/* What\'s Coming Up */}
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
                <div className="text-2xl font-bold text-[var(--terracotta)]">{f.vase_life}</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">{f.name}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActionCard({ title, emoji, items, color, link }: { title: string; emoji: string; items: string[]; color: string; link: string }) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{emoji}</span>
        <h2 className="font-bold text-xl">{title}</h2>
        <span className="text-sm text-gray-400 ml-auto">{items.length} varieties</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">Nothing to transplant right now</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((name) => (
            <Link key={name} href={`${link}/${encodeURIComponent(name)}`}>
              <span className="px-3 py-1.5 rounded-full text-sm bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition cursor-pointer">
                {name}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

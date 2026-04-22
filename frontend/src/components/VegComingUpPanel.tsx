import Link from "next/link";
import type { VegSowNowDetail, VegUpcomingActions } from "@/lib/api";

export default function VegComingUpPanel({ actions }: { actions: VegUpcomingActions }) {
  const sections = [
    {
      key: "closing_soon",
      title: "Act Soon — Window Closing",
      emoji: "🏃",
      description: "Sow window ends soon — don't miss this season",
      items: actions.closing_soon,
      getCountdown: (v: VegSowNowDetail) => v.weeks_until_window_ends ?? null,
      getCountdownLabel: (w: number) => `${w} week${w !== 1 ? "s" : ""} left`,
      color: "red" as const,
    },
    {
      key: "opening_soon",
      title: "Window Opening Soon",
      emoji: "🌱",
      description: "Sow window opening soon — get seeds and supplies ready",
      items: actions.opening_soon,
      getCountdown: (v: VegSowNowDetail) => v.weeks_until_window_starts ?? null,
      getCountdownLabel: (w: number) => `Opens in ${w} week${w !== 1 ? "s" : ""}`,
      color: "blue" as const,
    },
    {
      key: "peak_approaching",
      title: "Plan Ahead",
      emoji: "🎯",
      description: "Sow window coming — start thinking about seeds and bed prep",
      items: actions.peak_approaching,
      getCountdown: (v: VegSowNowDetail) => {
        if (v.window_status === "in_window") return v.weeks_until_window_ends ?? null;
        return v.weeks_until_window_starts ?? null;
      },
      getCountdownLabel: (w: number) => `${w} week${w !== 1 ? "s" : ""}`,
      color: "green" as const,
    },
  ];

  const hasAnyItems = sections.some((s) => s.items.length > 0);

  if (!hasAnyItems) {
    return (
      <div className="glass-card p-6 mb-8 border border-[var(--forest-200)] bg-[#f0f7f3]/20 dark:bg-[#0f291e]/20">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🔮</span>
          <h2 className="font-bold text-xl">What&#39;s Coming Up</h2>
        </div>
        <p className="text-sm text-gray-400">
          Nothing new coming up in the next few months — you&#39;re all caught up!
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 mb-8 border border-[var(--forest-200)] bg-[#f0f7f3]/20 dark:bg-[#0f291e]/20">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">🔮</span>
        <h2 className="font-bold text-xl">What&#39;s Coming Up</h2>
      </div>

      <div className="space-y-6">
        {sections
          .filter((s) => s.items.length > 0)
          .map((section) => (
            <div key={section.key}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{section.emoji}</span>
                <h3 className="font-semibold text-sm">{section.title}</h3>
                <span className="text-xs text-gray-400 ml-1">
                  — {section.description}
                </span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {section.items.map((veg) => (
                  <VegUpcomingCard
                    key={veg.name}
                    vegetable={veg}
                    countdown={section.getCountdown(veg)}
                    countdownLabel={section.getCountdownLabel}
                    color={section.color}
                  />
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function VegUpcomingCard({
  vegetable,
  countdown,
  countdownLabel,
  color,
}: {
  vegetable: VegSowNowDetail;
  countdown: number | null;
  countdownLabel: (w: number) => string;
  color: "red" | "green" | "blue";
}) {
  const colorMap = {
    red: {
      border: "border-[#f5a0a8] bg-[#fef2f3]/50 dark:border-[#5a2030] dark:bg-[#2a1015]/50",
      badge: "bg-[#fbd5d9] text-[#C41E3A]",
      bar: "bg-[#C41E3A]",
      barBg: "bg-[#fbd5d9]",
    },
    green: {
      border: "border-[#a8d1b8] bg-[#f0f7f3]/50 dark:border-[#1B4332] dark:bg-[#0f291e]/50",
      badge: "bg-[#d4e8dc] text-[#1B4332] dark:bg-[#153628] dark:text-[#FFF8F0]",
      bar: "bg-[#3d8f66]",
      barBg: "bg-[#d4e8dc] dark:bg-[#153628]",
    },
    blue: {
      border: "border-[#a8d1b8] bg-[#f0f7f3]/50 dark:border-[#1B4332] dark:bg-[#0f291e]/50",
      badge: "bg-[#ddefdc] text-[#5a8f52] dark:bg-[#153628] dark:text-[#FFF8F0]",
      bar: "bg-[#A7C4A0]",
      barBg: "bg-[#ddefdc] dark:bg-[#153628]",
    },
  };

  const c = colorMap[color];
  const weeks = countdown ?? 0;
  const progress = Math.max(0, Math.min(100, ((16 - weeks) / 16) * 100));

  return (
    <Link href={`/vegetables/${vegetable.slug || encodeURIComponent(vegetable.name)}`}>
      <div
        className={`rounded-lg p-4 border ${c.border} hover:shadow-md transition cursor-pointer h-full`}
      >
        <div className="flex items-start justify-between mb-2">
          <span className="font-semibold text-sm">{vegetable.name}</span>
          {countdown !== null && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.badge}`}>
              {countdownLabel(weeks)}
            </span>
          )}
        </div>

        <div className={`h-1.5 rounded-full ${c.barBg} mb-2`}>
          <div
            className={`h-full rounded-full ${c.bar} transition-all`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="text-xs text-gray-600 dark:text-[#A7C4A0] space-y-1">
          <div className="flex items-center gap-1">
            <span>🎯</span>
            <span>
              Optimal: <strong>{vegetable.optimal_month_name}</strong>
            </span>
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

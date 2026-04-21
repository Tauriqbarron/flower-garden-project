import Link from "next/link";

interface MonthData {
  month_number: number;
  name: string;
  nz_season: string;
  tasks: string[];
  sow_now: string[];
  transplant_now: string[];
  harvest_now: string[];
}

export function CalendarGrid({ months }: { months: MonthData[] }) {
  return (
    <div className="space-y-6">
      {months.map((m) => {
        const isCurrent = new Date().getMonth() + 1 === m.month_number;
        return (
          <div
            key={m.month_number}
            className={`glass-card p-5 ${isCurrent ? "ring-2 ring-[var(--forest-300)]" : ""}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">{m.name}</h2>
                <span className={`badge ${seasonBadge(m.nz_season)}`}>{m.nz_season}</span>
                {isCurrent && <span className="badge bg-green-100 text-green-800">Current</span>}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <MonthSection title="Sow" emoji="&#x1F331;" items={m.sow_now} color="green" />
              <MonthSection title="Transplant" emoji="&#x1F33F;" items={m.transplant_now} color="blue" />
              <MonthSection title="Cut / Harvest" emoji="&#x2702;&#xFE0F;" items={m.harvest_now} color="pink" />
            </div>

            {m.tasks.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                {m.tasks.map((t, i) => (
                  <p key={i} className="text-sm text-gray-600">{t}</p>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MonthSection({ title, emoji, items, color }: {
  title: string; emoji: string; items: string[]; color: string;
}) {
  const bgColors: Record<string, string> = {
    green: "bg-green-50 border-green-200",
    blue: "bg-blue-50 border-blue-200",
    pink: "bg-pink-50 border-pink-200",
  };
  const textColors: Record<string, string> = {
    green: "text-green-700",
    blue: "text-blue-700",
    pink: "text-pink-700",
  };

  return (
    <div className={`rounded-lg p-3 border ${bgColors[color]}`}>
      <h3 className={`font-semibold mb-2 ${textColors[color]} flex items-center gap-1`}>
        <span dangerouslySetInnerHTML={{ __html: emoji }} /> {title} ({items.length})
      </h3>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item}>
            <Link href={`/flowers/${encodeURIComponent(item)}`} className={`text-sm hover:underline ${textColors[color]}`}>
              {item}
            </Link>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-gray-400">Not this month</li>}
      </ul>
    </div>
  );
}

function seasonBadge(season: string): string {
  const badges: Record<string, string> = {
    Summer: "bg-orange-100 text-orange-800",
    Autumn: "bg-amber-100 text-amber-800",
    Winter: "bg-blue-100 text-blue-800",
    Spring: "bg-green-100 text-green-800",
  };
  return badges[season] || "bg-gray-100 text-gray-800";
}

"use client";
import { useEffect, useState } from "react";
import { useRegion } from "@/lib/region";
import { fetchCalendar, fetchVegetableCalendar, MonthData, VegMonthData } from "@/lib/api";
import { CalendarGrid } from "@/components/CalendarGrid";

export default function CalendarPage() {
  const { region } = useRegion();
  const [calendar, setCalendar] = useState<MonthData[]>([]);

  useEffect(() => {
    fetchCalendar(region).then(setCalendar);
  }, [region]);

  const regionLabel = region === "christchurch" ? "Christchurch" : "Auckland";

  if (calendar.length === 0) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-100 rounded w-1/3"></div>
      <div className="h-96 bg-gray-100 rounded-lg"></div>
    </div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">{regionLabel} Growing Calendar</h1>
        <p className="text-gray-500">Month-by-month guide for what to sow, transplant, and harvest</p>
      </div>

      <div className="flex gap-4 mb-6 text-sm">
        <span className="flex items-center gap-1"><span className="w-4 h-3 bg-green-400 rounded"></span> Sow window</span>
        <span className="flex items-center gap-1"><span className="w-4 h-3 bg-blue-400 rounded"></span> Transplant window</span>
        <span className="flex items-center gap-1"><span className="w-4 h-3 bg-pink-400 rounded"></span> Flowering / Harvest</span>
      </div>

      <CalendarGrid months={calendar} />
    </div>
  );
}

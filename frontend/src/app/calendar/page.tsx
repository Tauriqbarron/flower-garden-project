import { fetchCalendar } from "@/lib/api";
import { CalendarGrid } from "@/components/CalendarGrid";

export default async function CalendarPage() {
  const calendar = await fetchCalendar();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Auckland Growing Calendar</h1>
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

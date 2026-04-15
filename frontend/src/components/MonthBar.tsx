export function MonthBar({
  months,
  sowStart,
  sowEnd,
  transplantStart,
  transplantEnd,
  floweringStart,
  floweringEnd,
}: {
  months: string[];
  sowStart: number | null;
  sowEnd: number | null;
  transplantStart: number | null;
  transplantEnd: number | null;
  floweringStart: number | null;
  floweringEnd: number | null;
}) {
  function isInRange(monthIdx: number, start: number | null, end: number | null): boolean {
    if (start === null || end === null) return false;
    const m = monthIdx + 1; // 1-indexed
    if (start <= end) return m >= start && m <= end;
    return m >= start || m <= end;
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0 min-w-[600px]">
        {/* Labels */}
        <div className="w-24 flex-shrink-0">
          <div className="h-6" />
          {["Sow", "Transplant", "Flower"].map((label) => (
            <div key={label} className="h-8 flex items-center text-xs text-gray-500">{label}</div>
          ))}
        </div>
        {/* Bars */}
        <div className="flex-1">
          <div className="flex mb-1">
            {months.map((m, i) => (
              <div key={m} className="flex-1 text-center text-xs text-gray-400">{m}</div>
            ))}
          </div>
          {[
            { start: sowStart, end: sowEnd, bg: "bg-green-400" },
            { start: transplantStart, end: transplantEnd, bg: "bg-blue-400" },
            { start: floweringStart, end: floweringEnd, bg: "bg-pink-400" },
          ].map((row, idx) => (
            <div key={idx} className="flex h-8 mb-1">
              {months.map((_, i) => {
                const active = isInRange(i, row.start, row.end);
                return (
                  <div
                    key={i}
                    className={`flex-1 mx-px rounded-sm ${active ? row.bg : "bg-gray-100"}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import type { VegSowNowDetail } from "@/lib/api";
import AddToMyGardenButton from "@/components/AddToMyGardenButton";
import { Trash2 } from "lucide-react";

interface VegSowCardProps {
  vegetable: VegSowNowDetail;
  onRemove?: () => void;
  deleting?: boolean;
}

export default function VegSowCard({ vegetable, onRemove, deleting }: VegSowCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const colors = {
    green: {
      border: "border-[var(--forest-200)] bg-[var(--forest-50)] dark:bg-[#153628]/30",
      badge: "bg-[var(--forest-100)] text-[var(--forest)] dark:bg-[#153628] dark:text-[#4CAF50]",
    },
    amber: {
      border: "border-[var(--gold-200)] bg-[var(--gold-50)] dark:bg-[#2e2515]/30",
      badge: "bg-[var(--gold-100)] text-amber-900 dark:bg-[#2e2515] dark:text-[#D4A843]",
    },
    red: {
      border: "border-[var(--pohutukawa-200)] bg-[var(--pohutukawa-50)] dark:bg-[#3d1520]/30",
      badge: "bg-[var(--pohutukawa-100)] text-[var(--pohutukawa)] dark:bg-[#3d1520] dark:text-[#E05050]",
    },
    blue: {
      border: "border-blue-200 bg-blue-50/50 dark:bg-blue-900/10",
      badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    },
  };
  const c = colors[vegetable.timing_color as keyof typeof colors] ?? colors.red;

  const slug = vegetable.slug || encodeURIComponent(vegetable.name);

  return (
    <div className={`rounded-lg p-4 border ${c.border} hover:shadow-md transition h-full flex flex-col`}>
      <Link href={`/vegetables/${slug}`} className="flex-1 cursor-pointer">
        <div className="flex items-start justify-between mb-2">
          <span className="font-semibold text-sm">{vegetable.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.badge}`}>
            {vegetable.timing_label}
          </span>
        </div>
        <div className="text-xs text-gray-600 dark:text-[#A7C4A0] space-y-1">
          <div className="flex items-center gap-1">
            <span>🎯</span>
            <span>Optimal: <strong>{vegetable.optimal_month_name}</strong></span>
          </div>
          <div className="flex items-center gap-1">
            <span>🥕</span>
            <span>{vegetable.expected_harvest_text}</span>
          </div>
        </div>
      </Link>
      <div className="mt-2 pt-2 border-t border-[var(--border-soft)] dark:border-[var(--border)]">
        {onRemove ? (
          showConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-500 font-medium">Remove?</span>
              <button
                onClick={() => { onRemove(); setShowConfirm(false); }}
                disabled={deleting}
                className="px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600 transition"
              >
                Yes
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="px-2 py-1 text-xs rounded border hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              <Trash2 size={12} />
              Remove from garden
            </button>
          )
        ) : (
          <AddToMyGardenButton
            plantType="vegetable"
            plantSlug={slug}
            plantName={vegetable.name}
            sowMonth={vegetable.optimal_month}
          />
        )}
      </div>
    </div>
  );
}

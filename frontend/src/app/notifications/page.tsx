"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  timeAgo,
  type AppNotification,
} from "@/lib/api";

export default function NotificationsPage() {
  const { user, token, isLoggedIn, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn || !token) {
      router.replace("/");
      return;
    }
    loadNotifications();
  }, [isLoggedIn, token, authLoading]);

  async function loadNotifications() {
    if (!token) return;
    setLoading(true);
    const list = await fetchNotifications(token, 200);
    setItems(list);
    setLoading(false);
  }

  async function handleMarkAll() {
    if (!token) return;
    await markAllNotificationsRead(token);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function handleItemClick(n: AppNotification) {
    if (!token) return;
    if (!n.read) {
      await markNotificationRead(token, n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    if (n.link) router.push(n.link);
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-[var(--text-muted)] dark:text-[#A7C4A0]">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--forest)] dark:text-[#4CAF50]">
            Notifications
          </h1>
          <p className="text-sm text-[var(--text-muted)] dark:text-[#A7C4A0] mt-1">
            {user?.name ? `Updates for ${user.name}` : "Updates from your garden"}
          </p>
        </div>
        {items.some((n) => !n.read) && (
          <button
            type="button"
            onClick={handleMarkAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-sm font-medium text-[var(--text-muted)] dark:text-[#A7C4A0] hover:bg-[var(--forest-50)] dark:hover:bg-[#1B4332]/50 hover:text-[var(--forest)] dark:hover:text-[#4CAF50] transition"
          >
            <CheckCheck size={15} />
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-[var(--text-muted)] dark:text-[#A7C4A0]">
          Loading…
        </p>
      ) : items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-4xl mb-3">🔔</p>
          <p className="text-[var(--text-muted)] dark:text-[#A7C4A0]">
            No notifications yet
          </p>
          <p className="text-sm text-[var(--text-muted)]/70 dark:text-[#A7C4A0]/70 mt-1">
            When plants you request go live, you&apos;ll see it here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border-soft)] dark:divide-[var(--border)] border border-[var(--border-soft)] dark:border-[var(--border)] rounded-xl overflow-hidden bg-white dark:bg-[var(--card)]">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => handleItemClick(n)}
                className={`w-full text-left px-5 py-4 transition hover:bg-[var(--forest-50)] dark:hover:bg-[#1B4332]/50 ${
                  n.read ? "opacity-60" : "bg-[var(--forest-50)]/40 dark:bg-[#1B4332]/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  {!n.read && (
                    <span className="mt-1.5 w-2.5 h-2.5 shrink-0 rounded-full bg-[var(--terracotta)]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--forest)] dark:text-[#4CAF50]">
                      {n.title}
                    </p>
                    <p className="text-sm text-[var(--text-muted)] dark:text-[#A7C4A0] mt-0.5">
                      {n.body}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]/70 dark:text-[#A7C4A0]/70 mt-1.5">
                      {timeAgo(n.created_at)}
                      {n.link && " · Tap to open"}
                    </p>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

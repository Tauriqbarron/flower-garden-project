"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  timeAgo,
  type AppNotification,
} from "@/lib/api";

const POLL_MS = 30_000;

export default function NotificationBell() {
  const { token, isLoggedIn } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    if (!token) return;
    try {
      const count = await fetchUnreadCount(token);
      setUnread(count);
    } catch {
      // silent — polling failure shouldn't break the UI
    }
  }, [token]);

  // Poll unread count every 30s + on window focus
  useEffect(() => {
    if (!isLoggedIn) return;
    refreshCount();
    const id = setInterval(refreshCount, POLL_MS);
    const onFocus = () => refreshCount();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [isLoggedIn, refreshCount]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function toggle() {
    if (!token) return;
    if (!open) {
      const [count, list] = await Promise.all([
        fetchUnreadCount(token),
        fetchNotifications(token, 10),
      ]);
      setUnread(count);
      setItems(list);
    }
    setOpen((v) => !v);
  }

  async function handleMarkAll() {
    if (!token) return;
    await markAllNotificationsRead(token);
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function handleItemClick(n: AppNotification) {
    if (!token) return;
    if (!n.read) {
      await markNotificationRead(token, n.id);
      setUnread((u) => Math.max(0, u - 1));
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    if (n.link) router.push(n.link);
  }

  if (!isLoggedIn) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? "Close notifications" : "Open notifications"}
        className="relative p-2 rounded-[var(--radius-sm)] text-[var(--text-muted)] dark:text-[#A7C4A0] hover:bg-[var(--forest-50)] dark:hover:bg-[#1B4332]/50 hover:text-[var(--forest)] dark:hover:text-[#4CAF50] transition"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--terracotta)] text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed right-4 top-16 z-[60] w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-[var(--card)] border border-[var(--border-soft)] dark:border-[var(--border)] rounded-xl shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-soft)] dark:border-[var(--border)]">
            <span className="text-sm font-semibold text-[var(--forest)] dark:text-[#4CAF50]">
              Notifications
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-xs text-[var(--text-muted)] dark:text-[#A7C4A0] hover:text-[var(--forest)] dark:hover:text-[#4CAF50] transition"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)] dark:text-[#A7C4A0]">
                No notifications yet
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleItemClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-[var(--border-soft)] dark:border-[var(--border)] last:border-b-0 transition hover:bg-[var(--forest-50)] dark:hover:bg-[#1B4332]/50 ${
                    n.read ? "opacity-70" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span className="mt-1.5 w-2 h-2 shrink-0 rounded-full bg-[var(--terracotta)]" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--forest)] dark:text-[#4CAF50]">
                        {n.title}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] dark:text-[#A7C4A0] mt-0.5 line-clamp-2">
                        {n.body}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]/70 dark:text-[#A7C4A0]/70 mt-1">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <a
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block text-center text-xs font-medium text-[var(--text-muted)] dark:text-[#A7C4A0] hover:text-[var(--forest)] dark:hover:text-[#4CAF50] py-2.5 border-t border-[var(--border-soft)] dark:border-[var(--border)] transition"
          >
            View all notifications
          </a>
        </div>
      )}
    </div>
  );
}

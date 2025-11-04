"use client";

import { useEffect, useRef, useState } from "react";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  createdAt: string;
  readAt: string | null;
};

type FetchResponse = {
  notifications: NotificationItem[];
  nextCursor: string | null;
  unreadCount: number;
};

const FETCH_LIMIT = 15;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetchNotifications();
  }, []);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!open) return;
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open || !hasLoaded) return;
    const unreadIds = items.filter((item) => !item.readAt).map((item) => item.id);
    if (!unreadIds.length) return;
    void markNotificationsRead(unreadIds)
      .then(() => {
        setItems((prev) => prev.map((item) => (item.readAt ? item : { ...item, readAt: new Date().toISOString() })));
        setUnreadCount(0);
      })
      .catch(() => {});
  }, [open, hasLoaded, items]);

  async function fetchNotifications(cursor?: string | null) {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("limit", String(FETCH_LIMIT));
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/notifications?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load notifications");
      const data = (await res.json()) as FetchResponse;
      setItems((prev) => (cursor ? prev.concat(data.notifications) : data.notifications));
      setNextCursor(data.nextCursor);
      setUnreadCount(data.unreadCount);
      setHasLoaded(true);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function markNotificationsRead(ids?: string[]) {
    const res = await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) throw new Error("Failed to mark notifications");
    return res.json();
  }

  async function handleToggle() {
    setOpen((prev) => !prev);
    if (!hasLoaded && !open) await fetchNotifications();
  }

  async function handleMarkAll() {
    try {
      await markNotificationsRead();
      setItems((prev) => prev.map((item) => (item.readAt ? item : { ...item, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleLoadMore() {
    if (!nextCursor) return;
    await fetchNotifications(nextCursor);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative inline-flex items-center justify-center h-10 w-10 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        aria-label="??????"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 md:w-80 w-[calc(100vw-1.5rem)] max-h-[70vh] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl flex flex-col"
          dir="rtl"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">??????</h2>
            <button
              type="button"
              className="text-xs text-blue-600 dark:text-blue-300 hover:underline"
              onClick={handleMarkAll}
            >
              ??? ??? ?????
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && !items.length ? (
              <div className="p-4 text-sm text-gray-500 dark:text-gray-400">?????</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 dark:text-gray-400">??? ?????? ????.</div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                {items.map((item) => (
                  <li key={item.id} className={`px-3 py-3 text-sm ${item.readAt ? "bg-white dark:bg-gray-900" : "bg-blue-50/60 dark:bg-blue-900/20"}`}>
                    <a
                      href={item.href || "#"}
                      className="flex flex-col gap-1 text-right"
                      onClick={() => setOpen(false)}
                    >
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{item.title}</span>
                      {item.body && <span className="text-gray-600 dark:text-gray-300 text-xs leading-snug">{item.body}</span>}
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">{formatRelativeTime(item.createdAt)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800 p-2 text-center">
            {nextCursor ? (
              <button
                type="button"
                onClick={handleLoadMore}
                className="text-sm text-blue-600 dark:text-blue-300 hover:underline disabled:opacity-50"
                disabled={loading}
              >
                ??? ?????? ??????
              </button>
            ) : (
              <span className="text-xs text-gray-400 dark:text-gray-500">??? ??? ??????</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "????";
  if (diffMinutes < 60) return `???? ${diffMinutes} ????`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `???? ${diffHours} ????`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `???? ${diffDays} ????`;
  return date.toLocaleDateString("he-IL", { dateStyle: "short" });
}

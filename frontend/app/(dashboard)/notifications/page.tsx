"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { Notification } from "@/lib/types";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  Bell,
  TrendingDown,
  CalendarX,
  CheckCheck,
  Info,
} from "lucide-react";
import { toast } from "sonner";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/notifications?page=${page}`);
      setNotifications(res.data.data);
      setLastPage(res.data.meta.last_page);
      setTotal(res.data.meta.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page]);

  const markAsRead = async (id: number) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString().slice(0, 19).replace("T", " ") } : n))
      );
    } catch {
      toast.error("Gagal menandai notifikasi");
    }
  };

  const markAllRead = async () => {
    try {
      await api.put("/api/notifications/read-all");
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString().slice(0, 19).replace("T", " ") }))
      );
      toast.success("Semua notifikasi ditandai sudah dibaca");
    } catch {
      toast.error("Gagal menandai semua notifikasi");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "low_stock":
        return <TrendingDown className="h-4 w-4 text-status-low" strokeWidth={1.75} />;
      case "expiry":
        return <CalendarX className="h-4 w-4 text-status-expired" strokeWidth={1.75} />;
      default:
        return <Info className="h-4 w-4 text-accent" strokeWidth={1.75} />;
    }
  };

  const getBg = (type: string) => {
    switch (type) {
      case "low_stock":
        return "bg-status-low/10";
      case "expiry":
        return "bg-status-expired/10";
      default:
        return "bg-accent/10";
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Notifikasi</h1>
          <p className="text-[13px] text-ink-muted">
            {unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : "Semua notifikasi sudah dibaca"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-secondary"
          >
            <CheckCheck className="h-4 w-4" strokeWidth={1.75} />
            Tandai Semua Dibaca
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-surface">
        {loading ? (
          <div className="p-5">
            <TableSkeleton rows={6} cols={4} />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 mb-3">
              <Bell className="h-6 w-6 text-accent" strokeWidth={1.75} />
            </div>
            <p className="text-[13px] font-medium text-ink">Tidak ada notifikasi</p>
            <p className="text-[11px] text-ink-muted">Notifikasi akan muncul saat stok menipis atau mendekati kadaluarsa</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`flex items-start gap-3 p-4 transition-colors ${
                  !notif.is_read ? "bg-accent/5" : "hover:bg-secondary/50"
                }`}
              >
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${getBg(notif.type)}`}>
                  {getIcon(notif.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-ink">{notif.title}</p>
                    {!notif.is_read && (
                      <span className="h-2 w-2 rounded-full bg-accent" />
                    )}
                  </div>
                  <p className="mt-0.5 text-[12px] text-ink-muted">{notif.message}</p>
                  <p className="mt-1 text-[11px] text-ink-muted/60">{notif.created_at}</p>
                </div>
                {!notif.is_read && (
                  <button
                    onClick={() => markAsRead(notif.id)}
                    className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/10"
                  >
                    Tandai dibaca
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-ink-muted">
            {total} notifikasi
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-secondary disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <span className="flex items-center px-3 text-[12px] text-ink-muted">
              {page} / {lastPage}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              disabled={page === lastPage}
              className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-secondary disabled:opacity-40"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

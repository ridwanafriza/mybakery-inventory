"use client";

import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { downloadCsv } from "@/lib/download";
import { CardSkeleton } from "@/components/ui/skeleton";
import { EstimatedDaysLeft } from "@/components/inventory/estimated-days-left";
import type { StockPrediction } from "@/lib/types";
import {
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Download,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Clock,
  TrendingDown,
  CalendarX,
  PackageX,
  Hourglass,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";

interface DashboardData {
  total_items: number;
  low_stock: number;
  expired: number;
  out_of_stock: number;
  good_stock: number;
  by_category: { name: string; count: number; low: number; expired: number; out: number }[];
  by_branch: { name: string; total: number; low: number; expired: number; out: number }[];
  recent_movements: {
    id: number;
    item: string;
    branch: string;
    type: "in" | "out";
    quantity: number;
    unit: string;
    user: string;
    created_at: string;
  }[];
  movement_summary: {
    in: { total: number; qty: number };
    out: { total: number; qty: number };
  };
  daily_movements: {
    date: string;
    in_qty: number;
    out_qty: number;
    in_count: number;
    out_count: number;
  }[];
}

type TimeRange = "today" | "week" | "month";

export default function DashboardPage() {
  const { user } = useAuth();
  const { selectedBranchId, branches } = useBranch();
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [predictions, setPredictions] = useState<StockPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [chartType, setChartType] = useState<"bar" | "line">("bar");

  useEffect(() => {
    setLoading(true);
    const params = selectedBranchId ? `?branch_id=${selectedBranchId}` : "";
    Promise.all([
      api.get(`/api/dashboard/stats${params}`),
      api.get(`/api/stock-predictions${params}`),
    ])
      .then(([statsRes, predRes]) => {
        setStats(statsRes.data);
        setPredictions(predRes.data.data ?? []);
      })
      .finally(() => setLoading(false));
  }, [selectedBranchId]);

  const soonExpiring = useMemo(
    () =>
      predictions
        .filter(
          (p) =>
            p.estimated_days_left !== null &&
            p.estimated_days_left <= 7
        )
        .sort((a, b) => (a.estimated_days_left ?? 0) - (b.estimated_days_left ?? 0))
        .slice(0, 5),
    [predictions]
  );

  const stockPercentage =
    stats && stats.total_items > 0
      ? Math.round((stats.good_stock / stats.total_items) * 100)
      : 0;

  const statusCards = [
    {
      title: "Total Item",
      value: stats?.total_items ?? 0,
      icon: Package,
      color: "text-accent",
      bg: "bg-accent/10",
      change: null as string | null,
    },
    {
      title: "Stok Masuk (30 Hari)",
      value: stats?.movement_summary?.in?.qty ?? 0,
      icon: ArrowDownToLine,
      color: "text-status-good",
      bg: "bg-status-good/10",
      change: `${stats?.movement_summary?.in?.total ?? 0} transaksi`,
    },
    {
      title: "Stok Keluar (30 Hari)",
      value: stats?.movement_summary?.out?.qty ?? 0,
      icon: ArrowUpFromLine,
      color: "text-status-expired",
      bg: "bg-status-expired/10",
      change: `${stats?.movement_summary?.out?.total ?? 0} transaksi`,
    },
    {
      title: "Persentase Stok Baik",
      value: `${stockPercentage}%`,
      icon: BarChart3,
      color: "text-accent",
      bg: "bg-accent/10",
      change: `${stats?.good_stock ?? 0} dari ${stats?.total_items ?? 0} item`,
    },
  ];

  const movementChartConfig = {
    in_qty: { label: "Stok Masuk", color: "#0D9488" },
    out_qty: { label: "Stok Keluar", color: "#F97316" },
  } satisfies ChartConfig;

  const filteredDailyMovements =
    stats?.daily_movements?.filter((d) => {
      const date = new Date(d.date);
      const now = new Date();
      if (timeRange === "today") {
        return date.toDateString() === now.toDateString();
      }
      if (timeRange === "week") {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return date >= weekAgo;
      }
      return true;
    }) ?? [];

  const alertItems = stats
    ? [
        ...(stats.low_stock > 0
          ? [{ label: "Low Stock", count: stats.low_stock, icon: TrendingDown, color: "text-status-low", bg: "bg-status-low/10" }]
          : []),
        ...(stats.expired > 0
          ? [{ label: "Expired", count: stats.expired, icon: CalendarX, color: "text-status-expired", bg: "bg-status-expired/10" }]
          : []),
        ...(stats.out_of_stock > 0
          ? [{ label: "Out of Stock", count: stats.out_of_stock, icon: PackageX, color: "text-status-out", bg: "bg-status-out/10" }]
          : []),
      ]
    : [];

  const maxBranchTotal = Math.max(...(stats?.by_branch?.map((b) => b.total) ?? [1]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-semibold text-ink">Inventory Overview</h1>
        <p className="text-[13px] text-ink-muted">
          Snapshot of your warehouse and inventory performance at a glance.
        </p>
      </div>

      {/* Time Range Tabs + Export */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-xl border border-line bg-surface p-1">
          {(["today", "week", "month"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-[13px] font-medium transition-all duration-150",
                timeRange === range
                  ? "bg-accent text-white shadow-sm"
                  : "text-ink-muted hover:bg-secondary hover:text-ink"
              )}
            >
              {range === "today" ? "Hari Ini" : range === "week" ? "Miinggu Ini" : "Bulan Ini"}
            </button>
          ))}
        </div>
        <button
          onClick={() => downloadCsv("/api/export/dashboard", "dashboard-export.csv")}
          className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-secondary self-start sm:self-auto"
        >
          <Download className="h-4 w-4" strokeWidth={1.75} />
          Export Data
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          : statusCards.map((stat) => (
              <div
                key={stat.title}
                className="rounded-2xl border border-line bg-surface p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[12px] font-medium text-ink-muted">{stat.title}</p>
                    <p className="mt-2 text-[28px] font-bold text-ink leading-none">
                      {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
                    </p>
                    {stat.change && (
                      <p className="mt-1.5 text-[11px] text-ink-muted">{stat.change}</p>
                    )}
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} strokeWidth={1.75} />
                  </div>
                </div>
              </div>
            ))}
      </div>

      {/* Stock Flow Analysis + Stock Alerts */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Stock Flow Analysis Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-ink">Stock Flow Analysis</h2>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-ink-muted">
                Showing last {timeRange === "today" ? "1 day" : timeRange === "week" ? "7 days" : "30 days"}
              </span>
              <div className="flex gap-0.5 rounded-lg border border-line bg-secondary p-0.5">
                <button
                  onClick={() => setChartType("bar")}
                  className={cn(
                    "rounded-md p-1 transition-colors",
                    chartType === "bar" ? "bg-accent text-white shadow-sm shadow-accent/20" : "text-ink-muted hover:text-ink"
                  )}
                >
                  <BarChart3 className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
                <button
                  onClick={() => setChartType("line")}
                  className={cn(
                    "rounded-md p-1 transition-colors",
                    chartType === "line" ? "bg-accent text-white shadow-sm shadow-accent/20" : "text-ink-muted hover:text-ink"
                  )}
                >
                  <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="py-8">
              <div className="h-[280px] w-full animate-pulse rounded-xl bg-line" />
            </div>
          ) : filteredDailyMovements.length ? (
            <ChartContainer config={movementChartConfig} className="h-[280px] w-full">
              {chartType === "bar" ? (
                <BarChart data={filteredDailyMovements} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => {
                      const d = new Date(v);
                      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                      return days[d.getDay()];
                    }}
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(v) => {
                          const d = new Date(v);
                          return d.toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          });
                        }}
                      />
                    }
                  />
                  <Bar dataKey="in_qty" fill="var(--color-in_qty)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="out_qty" fill="var(--color-out_qty)" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={filteredDailyMovements} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => {
                      const d = new Date(v);
                      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                      return days[d.getDay()];
                    }}
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(v) => {
                          const d = new Date(v);
                          return d.toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          });
                        }}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="in_qty"
                    stroke="var(--color-in_qty)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "var(--color-in_qty)" }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="out_qty"
                    stroke="var(--color-out_qty)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "var(--color-out_qty)" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              )}
            </ChartContainer>
          ) : (
            <div className="py-8 text-center text-[13px] text-ink-muted">Tidak ada data</div>
          )}
        </div>

        {/* Stock Alerts */}
        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-status-low" strokeWidth={1.75} />
            <h2 className="text-[15px] font-semibold text-ink">Stock Alerts</h2>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-8 w-8 rounded-lg bg-line" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-24 rounded bg-line" />
                    <div className="h-2.5 w-16 rounded bg-line" />
                  </div>
                </div>
              ))}
            </div>
          ) : alertItems.length ? (
            <div className="space-y-3">
              {alertItems.map((alert) => (
                <div key={alert.label} className="flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${alert.bg}`}>
                    <alert.icon className={`h-4 w-4 ${alert.color}`} strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink">{alert.label}</p>
                    <p className="text-[11px] text-ink-muted">{alert.count} item terdampak</p>
                  </div>
                  <span className={`text-[18px] font-bold ${alert.color}`}>{alert.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-good/10 mb-3">
                <Package className="h-6 w-6 text-status-good" strokeWidth={1.75} />
              </div>
              <p className="text-[13px] font-medium text-ink">Semua stok aman</p>
              <p className="text-[11px] text-ink-muted">Tidak ada item yang perlu diperhatikan</p>
            </div>
          )}
        </div>
      </div>

      {/* Kartu Segera Habis (Fase 15) */}
      {(loading || soonExpiring.length > 0) && (
        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Hourglass className="h-4 w-4 text-status-low" strokeWidth={1.75} />
              <h2 className="text-[15px] font-semibold text-ink">Segera Habis</h2>
            </div>
            <Link
              href="/inventory"
              className="text-[12px] font-medium text-accent hover:underline"
            >
              Lihat semua →
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-8 w-8 rounded-lg bg-line" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-24 rounded bg-line" />
                    <div className="h-2.5 w-16 rounded bg-line" />
                  </div>
                </div>
              ))}
            </div>
          ) : soonExpiring.length ? (
            <div className="space-y-2">
              {soonExpiring.map((p) => (
                <div
                  key={`${p.branch_id}:${p.item_id}`}
                  className="flex items-center gap-3 rounded-xl border border-line/50 px-3 py-2.5 transition-colors hover:bg-secondary/50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-status-low/10">
                    <Package className="h-4 w-4 text-status-low" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink truncate">{p.item_name}</p>
                    <p className="text-[11px] text-ink-muted">
                      {p.branch_name} · sisa {p.quantity.toLocaleString()} {p.unit}
                    </p>
                  </div>
                  <EstimatedDaysLeft days={p.estimated_days_left} />
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-[13px] text-ink-muted">
              Tidak ada item yang diperkirakan habis dalam 7 hari ke depan.
            </p>
          )}
        </div>
      )}

      {/* Shipments Timeline + Warehouse Utilization */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Shipments Timeline */}
        <div className="lg:col-span-2 rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-ink">Aktivitas Terakhir</h2>
            <div className="flex items-center gap-1.5 text-[12px] text-ink-muted">
              <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
              {stats?.recent_movements?.length || 0} aktivitas
            </div>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-8 w-8 rounded-lg bg-line" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 rounded bg-line" />
                    <div className="h-2.5 w-20 rounded bg-line" />
                  </div>
                  <div className="h-3 w-16 rounded bg-line" />
                </div>
              ))}
            </div>
          ) : stats?.recent_movements?.length ? (
            <div className="space-y-2">
              {stats.recent_movements.slice(0, 6).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl border border-line/50 p-3 transition-colors hover:bg-secondary/50"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      m.type === "in"
                        ? "bg-status-good/10 text-status-good"
                        : "bg-status-expired/10 text-status-expired"
                    }`}
                  >
                    {m.type === "in" ? (
                      <ArrowDownToLine className="h-4 w-4" strokeWidth={1.75} />
                    ) : (
                      <ArrowUpFromLine className="h-4 w-4" strokeWidth={1.75} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{m.item}</p>
                    <p className="text-[11px] text-ink-muted">
                      {m.branch} &middot; {m.user}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-[13px] font-semibold ${
                        m.type === "in" ? "text-status-good" : "text-status-expired"
                      }`}
                    >
                      {m.type === "in" ? "+" : "-"}
                      {m.quantity} {m.unit}
                    </p>
                    <p className="text-[10px] text-ink-muted">{m.created_at}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-[13px] text-ink-muted">Belum ada aktivitas</div>
          )}
        </div>

        {/* Warehouse Utilization */}
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-[15px] font-semibold text-ink mb-4">Stock per Cabang</h2>
          {loading ? (
            <div className="py-8">
              <div className="h-[200px] w-full animate-pulse rounded-xl bg-line" />
            </div>
          ) : stats?.by_branch?.length ? (
            <div className="space-y-4">
              {stats.by_branch.map((branch) => {
                const width = maxBranchTotal > 0 ? (branch.total / maxBranchTotal) * 100 : 0;
                return (
                  <div key={branch.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13px] font-medium text-ink">{branch.name}</span>
                      <span className="text-[12px] font-semibold text-ink">{branch.total}</span>
                    </div>
                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-accent transition-all duration-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    {(branch.low + branch.expired + branch.out) > 0 && (
                      <div className="mt-1 flex gap-3">
                        {branch.low > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-status-low">
                            <span className="h-1.5 w-1.5 rounded-full bg-status-low" />
                            {branch.low} low
                          </span>
                        )}
                        {branch.expired > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-status-expired">
                            <span className="h-1.5 w-1.5 rounded-full bg-status-expired" />
                            {branch.expired} expired
                          </span>
                        )}
                        {branch.out > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-status-out">
                            <span className="h-1.5 w-1.5 rounded-full bg-status-out" />
                            {branch.out} habis
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-[13px] text-ink-muted">Tidak ada data</div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Store,
  FolderOpen,
  FileText,
  LogOut,
  Cake,
  Truck,
  Users,
  ChefHat,
  Wallet,
  Receipt,
  ClipboardList,
  ClipboardCheck,
  Bell,
  ArrowRightLeft,
  History,
  Calculator,
  Layers,
  Factory,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import type { UserRole } from "@/lib/types";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Menu Utama",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["super_admin", "branch_admin", "staff"],
      },
      {
        label: "Inventory",
        href: "/inventory",
        icon: Package,
        roles: ["super_admin", "branch_admin", "staff"],
      },
      {
        label: "Stock Opname",
        href: "/stock-opname",
        icon: ClipboardCheck,
        roles: ["super_admin", "branch_admin", "staff"],
      },
      {
        label: "Notifikasi",
        href: "/notifications",
        icon: Bell,
        roles: ["super_admin", "branch_admin"],
      },
      {
        label: "Transfer Stok",
        href: "/stock-transfers",
        icon: ArrowRightLeft,
        roles: ["super_admin", "branch_admin"],
      },
      {
        label: "Catat Produksi",
        href: "/production-logs",
        icon: Factory,
        roles: ["super_admin", "branch_admin", "staff"],
      },
    ],
  },
  {
    title: "Master Data",
    items: [
      {
        label: "Kategori",
        href: "/categories",
        icon: FolderOpen,
        roles: ["super_admin", "branch_admin"],
      },
      {
        label: "Master Item",
        href: "/items",
        icon: Package,
        roles: ["super_admin", "branch_admin"],
      },
      {
        label: "Cabang",
        href: "/branches",
        icon: Store,
        roles: ["super_admin"],
      },
      {
        label: "Supplier",
        href: "/suppliers",
        icon: Truck,
        roles: ["super_admin", "branch_admin"],
      },
      {
        label: "Staff / Karyawan",
        href: "/staff",
        icon: Users,
        roles: ["super_admin"],
      },
      {
        label: "Resep / BOM",
        href: "/recipes",
        icon: ChefHat,
        roles: ["super_admin", "branch_admin"],
      },
      {
        label: "Rencana Produksi",
        href: "/production-plan",
        icon: Calculator,
        roles: ["super_admin", "branch_admin"],
      },
      {
        label: "Batch Stok",
        href: "/stock-batches",
        icon: Layers,
        roles: ["super_admin", "branch_admin", "staff"],
      },
    ],
  },
  {
    title: "Keuangan",
    items: [
      {
        label: "HPP",
        href: "/hpp",
        icon: Wallet,
        roles: ["super_admin"],
      },
      {
        label: "Laporan Kerugian",
        href: "/loss-report",
        icon: Receipt,
        roles: ["super_admin"],
      },
      {
        label: "Purchase Order",
        href: "/purchase-orders",
        icon: ClipboardList,
        roles: ["super_admin", "branch_admin"],
      },
    ],
  },
  {
    title: "Lainnya",
    items: [
      {
        label: "Laporan",
        href: "/reports",
        icon: FileText,
        roles: ["super_admin", "branch_admin"],
      },
      {
        label: "Activity Log",
        href: "/activity-log",
        icon: History,
        roles: ["super_admin"],
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col rounded-2xl border border-line bg-surface m-2 mr-0 overflow-hidden shadow-sm">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white">
            <Cake className="h-5 w-5" strokeWidth={2} />
          </div>
          <span className="text-[16px] font-bold text-ink tracking-tight">
            MyBakery
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {navGroups.map((group) => {
            const filteredItems = group.items.filter(
              (item) => user && item.roles.includes(user.role)
            );
            if (filteredItems.length === 0) return null;

            return (
              <div key={group.title} className="mb-3">
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-ink-muted/50">
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {filteredItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150",
                          isActive
                            ? "bg-accent text-white shadow-sm shadow-accent/20"
                            : "text-ink-muted hover:bg-secondary hover:text-ink"
                        )}
                      >
                        <item.icon
                          className={cn("h-[18px] w-[18px]", isActive ? "text-white" : "text-ink-muted")}
                          strokeWidth={1.75}
                        />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User card + Logout */}
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
              <span className="text-[13px] font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-ink">
                {user?.name}
              </p>
              <p className="truncate text-[11px] text-ink-muted">
                {user?.role === "super_admin" ? "Super Admin" : user?.role === "branch_admin" ? "Admin Cabang" : "Staff"}
              </p>
            </div>
            <button
              onClick={() => logout()}
              className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-secondary hover:text-ink"
              title="Keluar"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-surface">
        <div className="flex items-center justify-around py-2">
          {navGroups
            .flatMap((g) => g.items)
            .filter((item) => user && item.roles.includes(user.role))
            .slice(0, 5)
            .map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium transition-colors",
                    isActive ? "text-accent" : "text-ink-muted"
                  )}
                >
                  <item.icon className="h-5 w-5" strokeWidth={1.75} />
                  {item.label}
                </Link>
              );
            })}
          <button
            onClick={() => logout()}
            className="flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium text-ink-muted"
          >
            <LogOut className="h-5 w-5" strokeWidth={1.75} />
            Keluar
          </button>
        </div>
      </nav>
    </>
  );
}

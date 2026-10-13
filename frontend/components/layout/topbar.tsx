"use client";

import { Bell, Search, ChevronDown, User, LogOut, Sun, Moon } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useBranch } from "@/contexts/branch-context";
import { useTheme } from "@/contexts/theme-context";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { Notification } from "@/lib/types";
import { toast } from "sonner";
import { TrendingDown, CalendarX, Info } from "lucide-react";

export function Topbar() {
  const { user, logout, updateProfile } = useAuth();
  const { branches, selectedBranchId, setSelectedBranchId } = useBranch();
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileData, setProfileData] = useState({ name: "", phone: "" });
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = user?.role === "super_admin";

  useEffect(() => {
    api
      .get("/api/notifications/unread-count")
      .then((res) => setUnreadCount(res.data.count))
      .catch(() => {});

    api
      .get("/api/notifications?per_page=5")
      .then((res) => setNotifications(res.data.data.slice(0, 5)))
      .catch(() => {});
  }, []);

  const selectedBranch = branches.find((b) => b.id === selectedBranchId);

  const openProfile = () => {
    setProfileData({ name: user?.name || "", phone: user?.phone || "" });
    setProfileDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile(profileData);
      toast.success("Profil berhasil diperbarui");
      setProfileDialogOpen(false);
    } catch {
      toast.error("Gagal memperbarui profil");
    } finally {
      setSaving(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "low_stock":
        return <TrendingDown className="h-3.5 w-3.5 text-status-low" strokeWidth={1.75} />;
      case "expiry":
        return <CalendarX className="h-3.5 w-3.5 text-status-expired" strokeWidth={1.75} />;
      default:
        return <Info className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />;
    }
  };

  return (
    <header className="flex h-16 items-center gap-3 border-b border-line bg-surface px-4 md:px-6">
      {/* Branch switcher for super admin */}
      {isSuperAdmin && branches.length > 0 && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger className="sm:hidden flex items-center gap-1.5 rounded-xl border border-line bg-background px-2 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-accent/5">
              {selectedBranch ? selectedBranch.name : "Semua"}
              <ChevronDown className="h-3 w-3 text-ink-muted" strokeWidth={1.75} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
              <DropdownMenuItem onClick={() => setSelectedBranchId(null)}>
                Semua Cabang
              </DropdownMenuItem>
              {branches.map((branch) => (
                <DropdownMenuItem key={branch.id} onClick={() => setSelectedBranchId(branch.id)}>
                  {branch.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger className="hidden sm:flex items-center gap-1.5 rounded-xl border border-line bg-background px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-accent/5">
              {selectedBranch ? selectedBranch.name : "Semua Cabang"}
              <ChevronDown className="h-3.5 w-3.5 text-ink-muted" strokeWidth={1.75} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[220px]">
              <DropdownMenuItem onClick={() => setSelectedBranchId(null)}>
                Semua Cabang
              </DropdownMenuItem>
              {branches.map((branch) => (
                <DropdownMenuItem key={branch.id} onClick={() => setSelectedBranchId(branch.id)}>
                  {branch.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

      {/* Search bar - hidden on very small screens */}
      <div className="flex-1 max-w-md hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted/50" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search for anything here..."
            className="w-full rounded-xl border border-line bg-background py-2 pl-9 pr-4 text-[13px] text-ink placeholder:text-ink-muted/40 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1 sm:gap-2 ml-auto">
        {/* Notification bell */}
        <DropdownMenu>
          <DropdownMenuTrigger className="relative rounded-xl p-2 transition-colors hover:bg-secondary">
            <Bell className="h-[18px] w-[18px] text-ink-muted" strokeWidth={1.75} />
            {unreadCount > 0 && (
              <Badge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 rounded-full px-1 text-[9px]">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[340px] max-h-[400px] overflow-y-auto">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Notifikasi
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={async () => {
                    await api.put("/api/notifications/read-all");
                    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
                    setUnreadCount(0);
                  }}
                  className="text-[11px] font-medium text-accent hover:underline"
                >
                  Tandai semua dibaca
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="px-3 py-4 text-center text-[13px] text-ink-muted">
                Tidak ada notifikasi
              </div>
            ) : (
              <>
                {notifications.map((notif) => (
                  <DropdownMenuItem
                    key={notif.id}
                    className={`flex items-start gap-2.5 px-3 py-2.5 ${
                      !notif.is_read ? "bg-accent/5" : ""
                    }`}
                    onClick={() => {
                      if (!notif.is_read) markAsRead(notif.id);
                      router.push("/notifications");
                    }}
                  >
                    <div className="mt-0.5 shrink-0">
                      {getNotifIcon(notif.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-ink truncate">{notif.title}</p>
                      <p className="text-[11px] text-ink-muted line-clamp-2">{notif.message}</p>
                    </div>
                    {!notif.is_read && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="justify-center text-[12px] font-medium text-accent"
                  onClick={() => router.push("/notifications")}
                >
                  Lihat Semua Notifikasi
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-secondary">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
              <span className="text-[12px] font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
            <span className="hidden md:block text-[13px] font-medium text-ink">{user?.name}</span>
            <ChevronDown className="h-3.5 w-3.5 text-ink-muted" strokeWidth={1.75} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem onClick={openProfile}>
              <User className="mr-2 h-4 w-4" strokeWidth={1.75} />
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
              {resolvedTheme === "dark" ? (
                <Sun className="mr-2 h-4 w-4" strokeWidth={1.75} />
              ) : (
                <Moon className="mr-2 h-4 w-4" strokeWidth={1.75} />
              )}
              {resolvedTheme === "dark" ? "Mode Terang" : "Mode Gelap"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" strokeWidth={1.75} />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold">
              Profil Saya
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="profile-name" className="text-[13px]">Nama</Label>
              <Input
                id="profile-name"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                placeholder="Nama Anda"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email" className="text-[13px]">Email</Label>
              <Input
                id="profile-email"
                value={user?.email || ""}
                disabled
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-phone" className="text-[13px]">Telepon</Label>
              <Input
                id="profile-phone"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                placeholder="0812-xxxx-xxxx"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px]">Role</Label>
              <Input
                value={user?.role === "super_admin" ? "Super Admin" : user?.role === "branch_admin" ? "Admin Cabang" : "Staff"}
                disabled
                className="bg-secondary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveProfile} disabled={saving} className="bg-accent hover:bg-accent/90">
              {saving ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Menyimpan...
                </span>
              ) : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}

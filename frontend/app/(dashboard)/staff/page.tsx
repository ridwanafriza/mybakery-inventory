"use client";

import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState, useMemo } from "react";
import Fuse from "fuse.js";
import api from "@/lib/api";
import type { User } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Users, Pencil, Search } from "lucide-react";

export default function StaffPage() {
  const { user } = useAuth();
  const [staffList, setStaffList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    position: "",
    hire_date: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const isSuperAdmin = user?.role === "super_admin";

  const fetchStaff = async () => {
    try {
      const res = await api.get("/api/staff");
      setStaffList(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return staffList;
    const fuse = new Fuse(staffList, { keys: ["name", "email", "position", "branch.name"], threshold: 0.4 });
    return fuse.search(searchQuery).map((r) => r.item);
  }, [staffList, searchQuery]);

  const openEdit = (staff: User) => {
    setEditingStaff(staff);
    setFormData({
      position: staff.position || "",
      hire_date: staff.hire_date || "",
      phone: staff.phone || "",
    });
    setError("");
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!editingStaff) return;
    setSubmitting(true);
    setError("");
    try {
      await api.put(`/api/staff/${editingStaff.id}`, formData);
      toast.success("Data staff berhasil diperbarui");
      setDialogOpen(false);
      fetchStaff();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">
            Staff / Karyawan
          </h1>
          <p className="text-[13px] text-ink-muted">
            Kelola data staff dan karyawan ({filteredStaff.length})
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted/50" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Cari staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 rounded-md border border-line bg-surface pl-8 pr-3 text-[13px] text-ink placeholder:text-ink-muted/40 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface">
        {loading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : filteredStaff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[13px] text-ink-muted">
            <Users className="mb-2 h-8 w-8 text-ink-muted/30" />
            Belum ada data staff
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Nama</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Email</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Role</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Cabang</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Jabatan</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Tanggal Masuk</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map((staff) => (
                <TableRow key={staff.id}>
                  <TableCell className="text-[13px] font-medium text-ink">
                    {staff.name}
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted">
                    {staff.email}
                  </TableCell>
                  <TableCell className="text-[13px]">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      staff.role === "branch_admin"
                        ? "bg-accent/10 text-accent"
                        : "bg-secondary text-ink-muted"
                    }`}>
                      {staff.role === "branch_admin" ? "Admin Cabang" : "Staff"}
                    </span>
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted">
                    {staff.branch?.name || "-"}
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted">
                    {staff.position || "-"}
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted">
                    {formatDate(staff.hire_date)}
                  </TableCell>
                  <TableCell className="text-right">
                    {isSuperAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(staff)}
                      >
                        <Pencil className="h-3.5 w-3.5 text-ink-muted" strokeWidth={1.75} />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold">
              Edit Data Staff
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {editingStaff && (
              <div className="rounded-lg bg-secondary p-3">
                <p className="text-[13px] font-medium text-ink">{editingStaff.name}</p>
                <p className="text-[11px] text-ink-muted">{editingStaff.email}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="position" className="text-[13px]">Jabatan</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="Contoh: Kepala Dapur"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hire_date" className="text-[13px]">Tanggal Masuk</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[13px]">Telepon</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0812-xxxx-xxxx"
                />
              </div>
            </div>
            {error && (
              <p className="text-[13px] text-status-expired">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-accent hover:bg-accent/90">
              {submitting ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Menyimpan...
                </span>
              ) : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

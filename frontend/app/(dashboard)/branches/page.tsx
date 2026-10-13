"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { Branch } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Store, MapPin, User } from "lucide-react";

export default function BranchesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);

  useEffect(() => {
    if (!loading && user && user.role !== "super_admin") {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === "super_admin") {
      api
        .get("/api/branches")
        .then((res) => setBranches(res.data.data))
        .finally(() => setLoadingBranches(false));
    }
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[13px] text-ink-muted">Memuat...</div>
      </div>
    );
  }

  if (user.role !== "super_admin") {
    return null;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[20px] font-semibold text-ink">
          Cabang
        </h1>
        <p className="text-[13px] text-ink-muted">
          Daftar seluruh cabang MyBakery ({branches.length})
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-surface">
        {loadingBranches ? (
          <TableSkeleton rows={5} cols={3} />
        ) : branches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[13px] text-ink-muted">
            <Store className="mb-2 h-8 w-8 text-ink-muted/30" />
            Belum ada cabang
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Nama</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Alamat</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Penanggung Jawab</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="text-[13px] font-medium text-ink">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-ink-muted" strokeWidth={1.75} />
                      {branch.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-ink-muted/50" strokeWidth={1.75} />
                      {branch.address}
                    </div>
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-ink-muted/50" strokeWidth={1.75} />
                      {branch.manager}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

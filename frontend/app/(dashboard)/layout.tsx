"use client";

import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { BranchProvider } from "@/contexts/branch-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" />
          <p className="text-[13px] text-ink-muted">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <BranchProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-5 pb-20 md:p-6 md:pb-6">{children}</main>
        </div>
      </div>
    </BranchProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider><DashboardShell>{children}</DashboardShell></AuthProvider>;
}

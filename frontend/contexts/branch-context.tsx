"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import api from "@/lib/api";
import type { Branch } from "@/lib/types";
import { useAuth } from "./auth-context";

interface BranchContextType {
  branches: Branch[];
  selectedBranchId: number | null;
  setSelectedBranchId: (id: number | null) => void;
  loading: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBranches = useCallback(async () => {
    try {
      const res = await api.get("/api/branches");
      setBranches(res.data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Auto-select for non-super_admin
  useEffect(() => {
    if (user && user.role !== "super_admin" && user.branch_id) {
      setSelectedBranchId(user.branch_id);
    }
  }, [user]);

  return (
    <BranchContext.Provider value={{ branches, selectedBranchId, setSelectedBranchId, loading }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error("useBranch must be used within a BranchProvider");
  }
  return context;
}

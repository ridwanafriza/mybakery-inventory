"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import api from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  updateProfile: (data: { name?: string; phone?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchUser(): Promise<User | null> {
  try {
    const res = await api.get("/api/user");
    return res.data as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const u = await fetchUser();
    setUser(u);
    return u;
  }, []);

  useEffect(() => {
    api.get("/sanctum/csrf-cookie").then(() => {
      fetchUser().then((u) => {
        setUser(u);
        setLoading(false);
      });
    });
  }, []);

  const login = async (email: string, password: string) => {
    await api.get("/sanctum/csrf-cookie");
    await api.post("/api/login", { email, password });
    await refreshUser();
  };

  const logout = async () => {
    await api.post("/api/logout");
    setUser(null);
  };

  const updateProfile = async (data: { name?: string; phone?: string }) => {
    const res = await api.put("/api/user/profile", data);
    setUser(res.data as User);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

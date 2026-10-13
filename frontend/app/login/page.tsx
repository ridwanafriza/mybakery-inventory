"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Cake, Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Email atau password salah";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel - Hero Image */}
      <div className="hidden relative w-[55%] overflow-hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&q=80"
          alt="Bakery"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

        <div className="relative z-10 flex h-full flex-col justify-between p-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md">
              <Cake className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <span className="text-[16px] font-bold text-white tracking-tight">
              MyBakery
            </span>
          </div>

          <div>
            <h2 className="text-[36px] font-bold leading-[1.15] text-white max-w-[420px]">
              Kelola stok bahan baku bakery Anda dengan mudah
            </h2>
            <p className="mt-4 text-[15px] text-white/70 max-w-[380px] leading-relaxed">
              Pantau stok real-time, kelola multi-cabang, dan dapatkan laporan
              otomatis dalam satu platform.
            </p>

            <div className="mt-8 flex items-center gap-8">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-md">
                  <span className="text-[13px] font-bold text-white">1</span>
                </div>
                <span className="text-[13px] font-medium text-white/80">
                  Multi-Cabang
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-md">
                  <span className="text-[13px] font-bold text-white">2</span>
                </div>
                <span className="text-[13px] font-medium text-white/80">
                  Real-time Stok
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-md">
                  <span className="text-[13px] font-bold text-white">3</span>
                </div>
                <span className="text-[13px] font-medium text-white/80">
                  Laporan Otomatis
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex flex-1 items-center justify-center p-8 lg:w-[45%]">
        <div className="w-full max-w-[400px]">
          <div className="mb-10 flex flex-col items-center lg:hidden">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-white">
              <Cake className="h-8 w-8" strokeWidth={2} />
            </div>
            <h1 className="text-[24px] font-bold text-ink tracking-tight">
              MyBakery
            </h1>
          </div>

          <div className="mb-8">
            <h1 className="text-[28px] font-bold text-ink tracking-tight">
              Welcome back
            </h1>
            <p className="mt-2 text-[14px] text-ink-muted">
              Please enter your details
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-status-expired/10 px-3 py-2.5 text-[13px] text-status-expired">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-[13px] font-medium text-ink"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="h-11 text-[14px] rounded-xl border-line/60"
                required
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-[13px] font-medium text-ink"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="h-11 pr-10 text-[14px] rounded-xl border-line/60"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted/40 hover:text-ink-muted transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-accent"
                />
                <Label
                  htmlFor="remember"
                  className="text-[13px] text-ink-muted cursor-pointer"
                >
                  Remember me
                </Label>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-xl text-[14px] font-semibold bg-accent hover:bg-accent/90 text-accent-foreground disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Masuk...
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-[13px] text-ink-muted">
            <span className="font-semibold text-ink cursor-pointer hover:underline"></span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  );
}

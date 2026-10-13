import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function LoadingSpinner({ className, size = "md", label }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-line border-t-accent",
          sizeMap[size]
        )}
      />
      {label && (
        <p className="text-[13px] text-ink-muted animate-pulse">{label}</p>
      )}
    </div>
  );
}

export function PageLoadingSpinner({ label = "Memuat data..." }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[400px] items-center justify-center">
      <LoadingSpinner size="lg" label={label} />
    </div>
  );
}

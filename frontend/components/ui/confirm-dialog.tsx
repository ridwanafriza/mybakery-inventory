"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2 } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  variant?: "danger" | "warning" | "default";
  confirmText?: string;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  variant = "danger",
  confirmText = "Hapus",
  loading = false,
}: ConfirmDialogProps) {
  const variantStyles = {
    danger: {
      icon: <Trash2 className="h-4 w-4" strokeWidth={1.75} />,
      button: "bg-status-expired hover:bg-status-expired/90 text-white",
    },
    warning: {
      icon: <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />,
      button: "bg-status-low hover:bg-status-low/90 text-white",
    },
    default: {
      icon: <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />,
      button: "bg-accent hover:bg-accent/90",
    },
  };

  const style = variantStyles[variant];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full ${
            variant === "danger" ? "bg-status-expired/10 text-status-expired" :
            variant === "warning" ? "bg-status-low/10 text-status-low" :
            "bg-accent/10 text-accent"
          }`}>
            {style.icon}
          </div>
          <DialogTitle className="text-[16px] font-semibold">
            {title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-[13px] text-ink-muted">{description}</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Batal
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={style.button}
          >
            {loading ? "Memproses..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

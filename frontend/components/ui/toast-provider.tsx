"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      duration={3000}
      toastOptions={{
        style: {
          fontSize: "13px",
          fontFamily: "var(--font-sans)",
        },
      }}
    />
  );
}

"use client";

import { Toaster as SonnerToaster } from "sonner";

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      richColors
      toastOptions={{
        classNames: {
          success: "border-emerald-200 bg-emerald-50 text-emerald-900",
          error: "border-rose-200 bg-rose-50 text-rose-900",
        },
      }}
      {...props}
    />
  );
}

import * as React from "react";

type AlertVariant = "default" | "destructive";

type AlertProps = {
  variant?: AlertVariant;
  children: React.ReactNode;
};

const variants: Record<AlertVariant, string> = {
  default: "border-slate-200 bg-slate-50 text-slate-800",
  destructive: "border-red-200 bg-red-50 text-red-700",
};

export function Alert({ variant = "default", children }: AlertProps) {
  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${variants[variant]}`} role="alert">
      {children}
    </div>
  );
}

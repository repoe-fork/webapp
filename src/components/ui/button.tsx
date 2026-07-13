import * as React from "react";

type ButtonVariant = "default" | "outline" | "secondary" | "ghost" | "primary";
type ButtonSize = "default" | "sm" | "lg" | "icon";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const baseClasses =
  "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400";

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-slate-900 text-white hover:bg-slate-800",
  outline: "border border-slate-200 bg-transparent text-slate-700 hover:bg-slate-100",
  secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
  ghost: "hover:bg-slate-100 text-slate-700",
  primary: "bg-blue-600 text-white hover:bg-blue-700",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "px-4 py-2 text-sm",
  sm: "px-2.5 py-1 text-xs",
  lg: "px-6 py-3 text-base",
  icon: "h-8 w-8",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className ?? ""}`}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

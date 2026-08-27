import { motion } from "motion/react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline" | "subtle";
type Size = "sm" | "md";

interface ButtonProps
  extends Omit<
    ComponentPropsWithoutRef<typeof motion.button>,
    "children" | "ref"
  > {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
  ref?: React.Ref<HTMLButtonElement>;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-emerald-600 text-white font-semibold hover:bg-emerald-500 shadow-[0_1px_2px_rgba(16,185,129,0.25),0_8px_20px_-8px_rgba(16,185,129,0.55)]",
  outline:
    "border border-line bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300",
  ghost: "text-slate-600 hover:bg-slate-100",
  subtle: "bg-slate-100 text-slate-700 hover:bg-slate-200/70",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 22, mass: 0.7 }}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}

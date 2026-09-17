import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-semibold tracking-tight transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-[2px] select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-contrast rounded-2xl shadow-[0_4px_0_0_var(--primary-strong)] hover:brightness-105 active:shadow-[0_1px_0_0_var(--primary-strong)]",
        secondary:
          "bg-surface text-foreground border border-line rounded-2xl hover:bg-background-soft shadow-[0_3px_0_0_var(--border)] active:shadow-none",
        accent:
          "bg-accent text-[#1c1512] rounded-2xl shadow-[0_4px_0_0_rgba(255,170,0,0.7)] hover:brightness-105 active:shadow-[0_1px_0_0_rgba(255,170,0,0.7)]",
        success:
          "bg-success text-white rounded-2xl shadow-[0_4px_0_0_rgba(18,120,60,0.9)] hover:brightness-105 active:shadow-[0_1px_0_0_rgba(18,120,60,0.9)]",
        ghost: "bg-transparent text-foreground hover:bg-background-soft rounded-2xl",
        outline: "border-2 border-primary text-primary rounded-2xl hover:bg-primary/10",
        danger:
          "bg-danger text-white rounded-2xl shadow-[0_4px_0_0_rgba(150,20,50,0.8)] hover:brightness-105 active:shadow-[0_1px_0_0_rgba(150,20,50,0.8)]",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-5 text-[15px]",
        lg: "h-14 px-7 text-base",
        xl: "h-16 px-9 text-lg",
        icon: "h-11 w-11",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, block, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, block }), className)} {...props} />;
}

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-line bg-surface p-5 shadow-[0_2px_18px_rgba(28,21,18,0.06)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-bold tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted", className)} {...props} />;
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "primary" | "success" | "accent" | "danger" | "info" }) {
  const tones: Record<string, string> = {
    neutral: "bg-background-soft text-muted border-line",
    primary: "bg-primary/12 text-primary border-primary/25",
    success: "bg-success/12 text-success border-success/25",
    accent: "bg-accent/20 text-[#8a5a00] dark:text-accent border-accent/40",
    danger: "bg-danger/12 text-danger border-danger/25",
    info: "bg-info/12 text-info border-info/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function ProgressBar({
  value,
  className,
  tone = "primary",
}: {
  value: number;
  className?: string;
  tone?: "primary" | "success" | "accent";
}) {
  const tones = { primary: "bg-primary", success: "bg-success", accent: "bg-accent" };
  return (
    <div className={cn("h-3 w-full overflow-hidden rounded-full bg-background-soft", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", tones[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/25",
        className,
      )}
      {...props}
    />
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors",
        checked ? "bg-success" : "bg-background-soft border border-line",
      )}
    >
      <span
        className={cn(
          "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all",
          checked ? "left-6" : "left-1",
        )}
      />
    </button>
  );
}

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-2xl font-extrabold tracking-tight sm:text-3xl", className)}>{children}</h2>
  );
}

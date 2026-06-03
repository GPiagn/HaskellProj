import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline";

const variants: Record<BadgeVariant, string> = {
  default:
    "bg-[var(--brand-subtle)] text-[var(--brand)]",
  success:
    "bg-[var(--success-subtle)] text-[var(--success)]",
  warning:
    "bg-[var(--warning-subtle)] text-[var(--warning-fg)]",
  danger:
    "bg-[var(--danger-subtle)] text-[var(--danger)]",
  info:
    "bg-[oklch(0.94_0.04_230)] text-[oklch(0.35_0.15_230)]",
  outline:
    "border border-[var(--border)] text-[var(--text-secondary)]",
};

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

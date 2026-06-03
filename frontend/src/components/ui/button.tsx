"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--brand)] text-[var(--brand-fg)] hover:bg-[var(--brand-hover)]",
  secondary:
    "bg-[var(--brand-subtle)] text-[var(--brand)] hover:bg-[var(--brand-subtle-hover)]",
  ghost:
    "text-[var(--text-secondary)] hover:bg-[var(--brand-subtle)] hover:text-[var(--brand)]",
  danger:
    "bg-[var(--danger-subtle)] text-[var(--danger)] hover:opacity-90",
  outline:
    "border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--brand-subtle)] hover:text-[var(--brand)] hover:border-[var(--brand)]",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-3 text-xs rounded-md gap-1.5",
  md: "h-9 px-4 text-sm rounded-lg gap-2",
  lg: "h-11 px-6 text-base rounded-xl gap-2.5",
};

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
  form?: string;
  "aria-label"?: string;
  "aria-pressed"?: boolean | "mixed";
  "aria-current"?: boolean | "page" | "step" | "location" | "date" | "time";
  tabIndex?: number;
  id?: string;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      disabled,
      children,
      onClick,
      type = "button",
      form,
      tabIndex,
      id,
      ...aria
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        type={type}
        form={form}
        id={id}
        tabIndex={tabIndex}
        disabled={isDisabled}
        onClick={onClick}
        aria-label={aria["aria-label"]}
        aria-pressed={aria["aria-pressed"]}
        aria-current={aria["aria-current"]}
        whileHover={isDisabled ? {} : { y: -1 }}
        whileTap={isDisabled ? {} : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 600, damping: 30 }}
        className={cn(
          "inline-flex items-center justify-center font-medium",
          "transition-colors duration-150 select-none",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
      >
        {loading && (
          <svg
            className="animate-spin h-3.5 w-3.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";

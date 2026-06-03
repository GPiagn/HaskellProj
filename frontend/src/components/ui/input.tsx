import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-9 w-full rounded-lg px-3 py-1 text-sm",
          "bg-[var(--surface-raised)] text-[var(--text-primary)]",
          "border border-[var(--border)]",
          "placeholder:text-[var(--text-muted)]",
          "transition-colors duration-150",
          "focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[80px] w-full rounded-lg px-3 py-2 text-sm",
          "bg-[var(--surface-raised)] text-[var(--text-primary)]",
          "border border-[var(--border)]",
          "placeholder:text-[var(--text-muted)]",
          "transition-colors duration-150 resize-none",
          "focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

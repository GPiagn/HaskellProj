"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = "md",
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal forceMount>
        <AnimatePresence>
          {open && (
            <>
              <RadixDialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
                />
              </RadixDialog.Overlay>

              <RadixDialog.Content asChild>
                <motion.div
                  /*
                   * Centering via Framer Motion style (x/y) — NÃO via CSS translate.
                   * Framer Motion controla o transform inteiro; misturar CSS translate
                   * com motion animate quebra o posicionamento.
                   */
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className={cn(
                    "fixed z-50",
                    "w-[calc(100vw-32px)] rounded-2xl p-6",
                    "flex flex-col max-h-[calc(100vh-48px)]",
                    "bg-[var(--surface-raised)] border border-[var(--border)]",
                    "focus:outline-none",
                    sizes[size]
                  )}
                  style={{
                    /* Framer Motion trata x/y como motion values — centering garantido */
                    left: "50%",
                    top: "50%",
                    x: "-50%",
                    y: "-50%",
                    boxShadow:
                      "0 24px 64px oklch(0 0 0 / 0.18), 0 2px 8px oklch(0 0 0 / 0.08)",
                  }}
                >
                  <div className="flex items-start justify-between gap-4 mb-5 flex-shrink-0">
                    <div>
                      <RadixDialog.Title className="text-base font-semibold font-display text-[var(--text-primary)]">
                        {title}
                      </RadixDialog.Title>
                      {description && (
                        <RadixDialog.Description className="text-sm text-[var(--text-secondary)] mt-0.5">
                          {description}
                        </RadixDialog.Description>
                      )}
                    </div>
                    <RadixDialog.Close
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors flex-shrink-0"
                      aria-label="Fechar"
                    >
                      <X size={16} />
                    </RadixDialog.Close>
                  </div>
                  <div className="overflow-y-auto min-h-0">{children}</div>
                </motion.div>
              </RadixDialog.Content>
            </>
          )}
        </AnimatePresence>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

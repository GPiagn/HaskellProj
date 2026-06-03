"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "warning";

type Toast = {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
};

type ToastContextValue = {
  toast: (opts: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, ...opts }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  const success = useCallback(
    (title: string, description?: string) => toast({ type: "success", title, description }),
    [toast]
  );
  const error = useCallback(
    (title: string, description?: string) => toast({ type: "error", title, description }),
    [toast]
  );
  const warning = useCallback(
    (title: string, description?: string) => toast({ type: "warning", title, description }),
    [toast]
  );

  return (
    <ToastContext.Provider value={{ toast, success, error, warning }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80"
        aria-live="polite"
        aria-atomic="false"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 size={16} className="text-[var(--success)] flex-shrink-0" />,
    error: <XCircle size={16} className="text-[var(--danger)] flex-shrink-0" />,
    warning: <AlertTriangle size={16} className="text-[var(--warning)] flex-shrink-0" />,
  };

  const borders: Record<ToastType, string> = {
    success: "var(--success)",
    error: "var(--danger)",
    warning: "var(--warning)",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.97 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "flex items-start gap-3 p-3.5 rounded-xl shadow-lg",
        "bg-[var(--surface-raised)] border border-[var(--border)]"
      )}
      style={{
        boxShadow: `0 0 0 1px ${borders[toast.type]}22, 0 8px 24px oklch(0 0 0 / 0.12)`,
      }}
      role="alert"
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] leading-tight">
          {toast.title}
        </p>
        {toast.description && (
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-snug">
            {toast.description}
          </p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="p-0.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors flex-shrink-0"
        aria-label="Fechar notificação"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

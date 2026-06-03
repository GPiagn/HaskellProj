"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountUp } from "@/lib/hooks";
import type { DashboardTotais } from "@/lib/types";

type StatRow = {
  label: string;
  key: keyof DashboardTotais;
  color: string;
  delay: number;
  suffix?: string;
};

const STATS: StatRow[] = [
  { label: "Total do acervo", key: "totalExemplares",         color: "var(--text-primary)",   delay: 0   },
  { label: "Encontrados",      key: "totalEncontrados",        color: "var(--success)",         delay: 80  },
  { label: "Não encontrados",  key: "totalNaoEncontrados",     color: "var(--danger)",          delay: 160 },
  { label: "Não inventariados",key: "totalNaoInventariados",   color: "var(--warning)",         delay: 240 },
  { label: "Atrasos",          key: "totalEmprestimosAtrasados",color: "var(--danger)",         delay: 320 },
];

function StatEntry({
  stat,
  data,
  total,
}: {
  stat: StatRow;
  data: DashboardTotais;
  total: number;
}) {
  const raw = data[stat.key];
  const value = useCountUp(raw, stat.delay);
  const pct = total > 0 && stat.key !== "totalExemplares"
    ? (raw / total) * 100
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: stat.delay / 1000 + 0.1, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="flex items-baseline justify-between gap-4 py-3"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: stat.color }}
          aria-hidden
        />
        <span
          className="text-sm truncate"
          style={{ color: "var(--text-secondary)" }}
        >
          {stat.label}
        </span>
      </div>

      <div className="flex items-baseline gap-2 flex-shrink-0">
        {pct !== null && (
          <span
            className="text-[11px] tabular-nums"
            style={{ color: "var(--text-disabled)" }}
          >
            {pct.toFixed(1)}%
          </span>
        )}
        <span
          className="text-xl font-semibold font-display tabular-nums leading-none"
          style={{ color: stat.color }}
        >
          {value.toLocaleString("pt-BR")}
        </span>
      </div>
    </motion.div>
  );
}

export function StatsCards({
  data,
  loading,
}: {
  data: DashboardTotais | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 py-3"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <div className="flex items-center gap-2">
              <Skeleton className="w-1.5 h-1.5 rounded-full" />
              <Skeleton className="h-3.5 w-32" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      {STATS.map((stat) => (
        <StatEntry
          key={stat.key}
          stat={stat}
          data={data}
          total={data.totalExemplares}
        />
      ))}
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { useCountUp } from "@/lib/hooks";

export type Segmento = { label: string; value: number; color: string };

type Props = {
  segmentos: Segmento[];
  /* % mostrado no centro (ex.: % inventariado) */
  centroPct: number;
  size?: number;
  strokeWidth?: number;
  loading?: boolean;
};

export function RadialBreakdown({
  segmentos,
  centroPct,
  size = 152,
  strokeWidth = 12,
  loading = false,
}: Props) {
  const r = (size - strokeWidth * 2) / 2;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segmentos.reduce((s, x) => s + x.value, 0);
  const animatedPct = useCountUp(centroPct, 700, 1400);

  // Arcos cumulativos: cada fatia começa onde a anterior terminou
  let acc = 0;
  const arcos = segmentos.map((s) => {
    const frac = total > 0 ? s.value / total : 0;
    const len = circ * frac;
    const start = acc;
    acc += len;
    return { ...s, len, start };
  });

  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Inventário ${centroPct}% completo`}
    >
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
        aria-hidden
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Trilho de fundo */}
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={strokeWidth}
        />

        {/* Fatias */}
        {!loading &&
          total > 0 &&
          arcos.map(
            (a, i) =>
              a.len > 0 && (
                <motion.circle
                  key={a.label}
                  cx={cx}
                  cy={cx}
                  r={r}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${a.len} ${circ - a.len}`}
                  strokeDashoffset={-a.start}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 + i * 0.12, duration: 0.4 }}
                />
              )
          )}

        {/* Spinner de carregamento */}
        {loading && (
          <motion.circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circ * 0.25} ${circ * 0.75}`}
            animate={{ rotate: 360 }}
            style={{ transformOrigin: "center" }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
          />
        )}
      </svg>

      {/* Texto central */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {loading ? (
          <div
            className="skeleton-shimmer rounded"
            style={{ width: 40, height: 28 }}
          />
        ) : (
          <>
            <motion.span
              key={animatedPct}
              className="font-bold font-display tabular-nums leading-none"
              style={{
                fontSize: size > 100 ? "2rem" : "1.25rem",
                color: "var(--brand)",
                letterSpacing: "-0.04em",
              }}
            >
              {animatedPct}
              <span
                style={{
                  fontSize: "0.5em",
                  color: "var(--text-muted)",
                  fontWeight: 400,
                }}
              >
                %
              </span>
            </motion.span>
            <span
              className="text-[9px] uppercase tracking-widest mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              completo
            </span>
          </>
        )}
      </div>
    </div>
  );
}

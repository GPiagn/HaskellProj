"use client";

import { motion } from "framer-motion";
import { useCountUp } from "@/lib/hooks";

type Props = {
  pct: number;
  size?: number;
  strokeWidth?: number;
  loading?: boolean;
};

export function RadialProgress({
  pct,
  size = 148,
  strokeWidth = 6,
  loading = false,
}: Props) {
  const r = (size - strokeWidth * 2) / 2;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);

  const animatedPct = useCountUp(pct, 700, 1400);

  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
      aria-label={`Progresso: ${pct}%`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Outer ring glow */}
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
        aria-hidden
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Track */}
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={strokeWidth}
        />

        {/* Active progress arc */}
        {!loading && (
          <motion.circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke="var(--brand)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ delay: 0.6, duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
          />
        )}

        {/* Shimmer loading arc */}
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

      {/* Center text */}
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

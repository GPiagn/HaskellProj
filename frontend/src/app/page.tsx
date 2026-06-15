"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Landmark, BookMarked, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import type { DashboardTotais } from "@/lib/types";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { InventarioChart } from "@/components/dashboard/InventarioChart";
import { RadialProgress } from "@/components/dashboard/RadialProgress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/* ─── Ambient glow — "Knowledge Flow" visual concept ─── */
function AmbientGlow() {
  return (
    <div
      className="pointer-events-none absolute overflow-hidden"
      aria-hidden="true"
      style={{ inset: 0, zIndex: 0 }}
    >
      {/* Primary glow — top right */}
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -80,
          width: 560,
          height: 560,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, oklch(0.37 0.12 150 / 0.11) 0%, oklch(0.37 0.12 150 / 0.05) 45%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      {/* Secondary glow — bottom left, warm gold */}
      <div
        style={{
          position: "absolute",
          bottom: -60,
          left: -60,
          width: 360,
          height: 360,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, oklch(0.72 0.16 80 / 0.06) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />
    </div>
  );
}

/* ─── Dashboard stat legend row ─── */
function LegendRow({
  color,
  label,
  value,
  delay = 0,
}: {
  color: string;
  label: string;
  value: number;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.2 + delay, duration: 0.3 }}
      className="flex items-center gap-2"
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs flex-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span
        className="text-xs font-semibold tabular-nums"
        style={{ color: "var(--text-secondary)" }}
      >
        {value.toLocaleString("pt-BR")}
      </span>
    </motion.div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardTotais | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function fetchData(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setData(await api.dashboard.totais());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao conectar";
      setError(msg);
      toast.error("Backend offline", msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const year = new Date().getFullYear();
  const pct =
    data && data.totalExemplares > 0
      ? Math.round(
          ((data.totalEncontrados + data.totalNaoEncontrados) /
            data.totalExemplares) *
            100
        )
      : 0;

  return (
    <div className="relative space-y-10" style={{ minHeight: "80vh" }}>
      {/* ─── Ambient Knowledge Flow glow ─── */}
      <AmbientGlow />

      {/* ─── Everything else sits above the glow ─── */}
      <div className="relative" style={{ zIndex: 1 }}>

        {/* ─── Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-3">
            <Landmark
              size={12}
              strokeWidth={2}
              style={{ color: "var(--brand)" }}
            />
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: "var(--text-muted)" }}
            >
              Universidade Federal de São Paulo
            </span>
            {data && (
              <>
                <span style={{ color: "var(--border)" }}>·</span>
                <span
                  className="flex items-center gap-1 text-[10px]"
                  style={{ color: "var(--success)" }}
                >
                  <span
                    className="w-1 h-1 rounded-full animate-pulse"
                    style={{ backgroundColor: "var(--success)" }}
                  />
                  online
                </span>
              </>
            )}
          </div>

          {/* Title + Action */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1
                className="font-display font-bold"
                style={{
                  fontSize: "clamp(1.75rem, 3.5vw, 2.8rem)",
                  letterSpacing: "-0.038em",
                  lineHeight: 1.05,
                  color: "var(--text-primary)",
                }}
              >
                Acervo Bibliográfico
                <br />
                <span style={{ color: "var(--brand)" }}>
                  Inventário {year}
                </span>
              </h1>
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={refreshing}
              onClick={() => fetchData(true)}
              className="mt-1 flex-shrink-0"
            >
              <RefreshCw size={12} strokeWidth={2} />
              Atualizar
            </Button>
          </div>
        </motion.div>

        {/* ─── Error banner ─── */}
        <AnimatePresence>
          {error && !loading && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 rounded-xl p-4 text-sm"
              style={{
                backgroundColor: "var(--danger-subtle)",
                color: "var(--danger)",
                outline: "1px solid var(--danger)",
              }}
            >
              <strong>Backend offline.</strong> Servidor Haskell em{" "}
              <code className="font-mono text-xs">localhost:4000</code> não
              está respondendo.
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Main content grid ─── */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 xl:gap-12">

          {/* ─── Left column: Radial + Legend + Stats ─── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {/* Radial progress centrado */}
            <div className="flex flex-col items-center gap-4 py-4">
              <RadialProgress pct={pct} size={152} loading={loading} />

              {/* Legend below arc */}
              {data && (
                <div className="w-full space-y-2 px-2">
                  <LegendRow
                    color="var(--success)"
                    label="Encontrados"
                    value={data.totalEncontrados}
                    delay={0}
                  />
                  <LegendRow
                    color="var(--danger)"
                    label="Não encontrados"
                    value={data.totalNaoEncontrados}
                    delay={0.06}
                  />
                  <LegendRow
                    color="var(--border)"
                    label="Pendentes"
                    value={data.totalNaoInventariados}
                    delay={0.12}
                  />
                  <LegendRow
                    color="var(--warning)"
                    label="Atrasos"
                    value={data.totalEmprestimosAtrasados}
                    delay={0.18}
                  />
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ height: 1, backgroundColor: "var(--border-subtle)" }} />

            {/* Stat list com count-up */}
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.12em] mb-3"
                style={{ color: "var(--text-muted)" }}
              >
                Números do acervo
              </p>
              <StatsCards data={data} loading={loading} />
            </div>

            {/* CTA para catálogo */}
            {!loading && data && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => {
                    window.location.href = "/catalogo";
                  }}
                >
                  <span className="flex items-center gap-2">
                    <BookMarked size={13} />
                    Ver catálogo completo
                  </span>
                  <ArrowRight size={12} />
                </Button>
              </motion.div>
            )}
          </motion.div>

          {/* ─── Right column: Charts ─── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <InventarioChart totais={data} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

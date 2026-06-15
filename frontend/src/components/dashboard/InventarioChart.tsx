"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "next-themes";
import { api } from "@/lib/api";
import type { DashboardTotais, Exemplar } from "@/lib/types";

/* Cores semânticas alinhadas com a legenda do dashboard */
const STATUS_COLORS = {
  encontrados: "oklch(0.50 0.13 163)", // verde / encontrados
  naoEncontrados: "oklch(0.52 0.20 18)", // vermelho / não encontrados
  naoInventariados: "oklch(0.70 0.02 260)", // cinza / não inventariados
  atrasados: "oklch(0.70 0.15 75)", // âmbar / atrasos
};

function ChartTooltipStyle({ textColor }: { textColor: string }) {
  return (
    <style>{`
      .recharts-tooltip-wrapper .recharts-default-tooltip {
        border-radius: 8px !important;
        border: 1px solid var(--border) !important;
        background: var(--surface-raised) !important;
        color: ${textColor} !important;
        font-size: 12px !important;
        box-shadow: 0 4px 16px oklch(0 0 0 / 0.12) !important;
      }
    `}</style>
  );
}

export function InventarioChart({ totais }: { totais: DashboardTotais | null }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const gridColor = isDark ? "oklch(0.27 0.022 262)" : "oklch(0.87 0.013 262)";
  const axisColor = isDark ? "oklch(0.50 0.012 260)" : "oklch(0.60 0.010 262)";
  const textColor = isDark ? "oklch(0.95 0.006 260)" : "oklch(0.15 0.025 262)";

  const tooltipStyle = {
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--surface-raised)",
    color: textColor,
    fontSize: 12,
  };

  /* ─── Gráfico 2: lista real de exemplares (para agrupar por situação) ─── */
  const [exemplares, setExemplares] = useState<Exemplar[] | null>(null);

  useEffect(() => {
    api.exemplares
      .list()
      .then(setExemplares)
      .catch(() => setExemplares([]));
  }, []);

  /* ─── Gráfico 1: situação do inventário (vem dos totais reais) ─── */
  const statusData = totais
    ? [
        {
          situacao: "Encontrados",
          qtd: totais.totalEncontrados,
          cor: STATUS_COLORS.encontrados,
        },
        {
          situacao: "Não encontrados",
          qtd: totais.totalNaoEncontrados,
          cor: STATUS_COLORS.naoEncontrados,
        },
        {
          situacao: "Não inventariados",
          qtd: totais.totalNaoInventariados,
          cor: STATUS_COLORS.naoInventariados,
        },
        {
          situacao: "Atrasados",
          qtd: totais.totalEmprestimosAtrasados,
          cor: STATUS_COLORS.atrasados,
        },
      ]
    : [];

  /* ─── Gráfico 2: agrupamento por situacaoSistema (Normal, Processamento…) ─── */
  const situacaoData = (() => {
    if (!exemplares) return [];
    const contagem = new Map<string, number>();
    for (const ex of exemplares) {
      const chave = ex.situacaoSistema?.trim() || "Não informado";
      contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
    }
    return Array.from(contagem, ([situacao, qtd]) => ({ situacao, qtd })).sort(
      (a, b) => b.qtd - a.qtd
    );
  })();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartTooltipStyle textColor={textColor} />

      {/* Situação do inventário */}
      <div className="card p-5">
        <div className="mb-4">
          <h3
            className="text-sm font-semibold font-display"
            style={{ color: "var(--text-primary)" }}
          >
            Situação do inventário
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Exemplares por resultado do inventário
          </p>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={statusData} margin={{ left: 0, right: 12 }}>
            <CartesianGrid vertical={false} stroke={gridColor} strokeWidth={1} />
            <XAxis
              dataKey="situacao"
              tick={{ fontSize: 11, fill: axisColor }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: axisColor }}
              axisLine={false}
              tickLine={false}
              width={40}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "oklch(0.32 0.12 150 / 0.06)" }}
              contentStyle={tooltipStyle}
            />
            <Bar
              dataKey="qtd"
              name="Exemplares"
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
            >
              {statusData.map((d) => (
                <Cell key={d.situacao} fill={d.cor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Situação do exemplar */}
      <div className="card p-5">
        <div className="mb-4">
          <h3
            className="text-sm font-semibold font-display"
            style={{ color: "var(--text-primary)" }}
          >
            Situação do exemplar
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Exemplares por situação no sistema
          </p>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={situacaoData}
            layout="vertical"
            margin={{ left: 0, right: 12 }}
          >
            <CartesianGrid
              horizontal={false}
              stroke={gridColor}
              strokeWidth={1}
            />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: axisColor }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="situacao"
              tick={{ fontSize: 10, fill: axisColor }}
              axisLine={false}
              tickLine={false}
              width={100}
            />
            <Tooltip
              cursor={{ fill: "oklch(0.32 0.12 150 / 0.06)" }}
              contentStyle={tooltipStyle}
            />
            <Bar
              dataKey="qtd"
              name="Exemplares"
              fill="oklch(0.32 0.12 150)"
              radius={[0, 4, 4, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
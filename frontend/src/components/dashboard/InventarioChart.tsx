"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { useTheme } from "next-themes";

const MONTHLY_DATA = [
  { mes: "Jan", encontrados: 1820, naoEncontrados: 45 },
  { mes: "Fev", encontrados: 2100, naoEncontrados: 38 },
  { mes: "Mar", encontrados: 1950, naoEncontrados: 52 },
  { mes: "Abr", encontrados: 2350, naoEncontrados: 29 },
  { mes: "Mai", encontrados: 2180, naoEncontrados: 41 },
  { mes: "Jun", encontrados: 2400, naoEncontrados: 35 },
];

const CATEGORY_DATA = [
  { categoria: "Ciências da Saúde", exemplares: 4200 },
  { categoria: "Ciências Exatas", exemplares: 3100 },
  { categoria: "Humanidades", exemplares: 2800 },
  { categoria: "Tecnologia", exemplares: 2200 },
  { categoria: "Literatura", exemplares: 1800 },
  { categoria: "Outros", exemplares: 1400 },
];

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

export function InventarioChart() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const gridColor = isDark ? "oklch(0.27 0.022 262)" : "oklch(0.87 0.013 262)";
  const axisColor = isDark ? "oklch(0.50 0.012 260)" : "oklch(0.60 0.010 262)";
  const textColor = isDark ? "oklch(0.95 0.006 260)" : "oklch(0.15 0.025 262)";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartTooltipStyle textColor={textColor} />

      {/* Inventário por mês */}
      <div className="card p-5">
        <div className="mb-4">
          <h3
            className="text-sm font-semibold font-display"
            style={{ color: "var(--text-primary)" }}
          >
            Inventário por mês
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Exemplares verificados nos últimos 6 meses
          </p>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={MONTHLY_DATA} barGap={4}>
            <CartesianGrid vertical={false} stroke={gridColor} strokeWidth={1} />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 11, fill: axisColor }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: axisColor }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              cursor={{ fill: "oklch(0.32 0.12 150 / 0.06)" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface-raised)",
                color: textColor,
                fontSize: 12,
              }}
            />
            <Bar
              dataKey="encontrados"
              name="Encontrados"
              fill="oklch(0.50 0.13 163)"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="naoEncontrados"
              name="Não encontrados"
              fill="oklch(0.52 0.20 18)"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Distribuição por categoria */}
      <div className="card p-5">
        <div className="mb-4">
          <h3
            className="text-sm font-semibold font-display"
            style={{ color: "var(--text-primary)" }}
          >
            Distribuição por categoria
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Exemplares cadastrados por área do conhecimento
          </p>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={CATEGORY_DATA}
            layout="vertical"
            margin={{ left: 0, right: 12 }}
          >
            <CartesianGrid horizontal={false} stroke={gridColor} strokeWidth={1} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: axisColor }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="categoria"
              tick={{ fontSize: 10, fill: axisColor }}
              axisLine={false}
              tickLine={false}
              width={100}
            />
            <Tooltip
              cursor={{ fill: "oklch(0.32 0.12 150 / 0.06)" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface-raised)",
                color: textColor,
                fontSize: 12,
              }}
            />
            <Bar
              dataKey="exemplares"
              name="Exemplares"
              fill="oklch(0.32 0.12 150)"
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[10px] mt-2 text-center" style={{ color: "var(--text-disabled)" }}>
          Dados mockados — visualização ilustrativa
        </p>
      </div>
    </div>
  );
}

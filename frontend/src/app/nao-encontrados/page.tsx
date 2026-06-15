"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  RefreshCw,
  BookOpen,
  Clock,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { ExemplarNaoEncontrado, MotivoNaoEncontrado } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";

function MotivoDisplay({ motivo }: { motivo: MotivoNaoEncontrado }) {
  if (motivo.tag === "OutroMotivo") {
    return (
      <div className="flex items-start gap-2">
        <MessageSquare
          size={14}
          className="mt-0.5 flex-shrink-0"
          style={{ color: "var(--text-muted)" }}
        />
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {motivo.descricao}
        </p>
      </div>
    );
  }

  const atrasado =
    motivo.situacao.tag === "Atrasado" ? motivo.situacao.diasAtraso : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={atrasado ? "danger" : "warning"}>
          {atrasado ? (
            <>
              <Clock size={10} />
              {atrasado} {atrasado === 1 ? "dia" : "dias"} em atraso
            </>
          ) : (
            <>
              <CheckCircle2 size={10} />
              Em dia
            </>
          )}
        </Badge>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Emprestado para
        </span>
        <span
          className="text-xs font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {motivo.nomePessoa}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
        <span>
          Retirada:{" "}
          <span style={{ color: "var(--text-secondary)" }}>
            {formatDate(motivo.dataEmprestimo)}
          </span>
        </span>
        <ArrowRight size={11} />
        <span>
          Devolução prevista:{" "}
          <span
            style={{ color: atrasado ? "var(--danger)" : "var(--text-secondary)" }}
          >
            {formatDate(motivo.dataPrevista)}
          </span>
        </span>
      </div>
    </div>
  );
}

export default function NaoEncontradosPage() {
  const [items, setItems] = useState<ExemplarNaoEncontrado[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState<"emprestados" | "atraso" | null>(null);
  const toast = useToast();

  async function load(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setItems(await api.inventario.naoEncontrados());
    } catch {
      toast.error("Erro ao carregar não encontrados");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const emprestados = items.filter((i) => i.neMotivo.tag === "Emprestado");
  const atrasados = items.filter(
    (i) =>
      i.neMotivo.tag === "Emprestado" &&
      i.neMotivo.situacao.tag === "Atrasado"
  );
  const outroMotivo = items.filter((i) => i.neMotivo.tag === "OutroMotivo");

  // Seções visíveis conforme o filtro ativo
  const showAtraso =
    filtro === null || filtro === "atraso" || filtro === "emprestados";
  const showEmDia = filtro === null || filtro === "emprestados";
  const showOutros = filtro === null;
  const emDiaCount = emprestados.length - atrasados.length;
  const nadaVisivel =
    !(showAtraso && atrasados.length > 0) &&
    !(showEmDia && emDiaCount > 0) &&
    !(showOutros && outroMotivo.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold font-display"
            style={{ color: "var(--text-primary)" }}
          >
            Não Encontrados
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {loading
              ? "Carregando…"
              : `${items.length} exemplar${items.length !== 1 ? "es" : ""} ausente${items.length !== 1 ? "s" : ""} no inventário atual`}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          loading={refreshing}
          onClick={() => load(true)}
        >
          <RefreshCw size={13} />
          Atualizar
        </Button>
      </div>

      {/* Summary strip (cards clicáveis = filtro) */}
      {!loading && items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3"
        >
          {(
            [
              {
                key: null,
                label: "Total ausentes",
                value: items.length,
                color: "var(--text-primary)",
                bg: "var(--surface)",
                ring: "var(--text-muted)",
              },
              {
                key: "emprestados",
                label: "Emprestados",
                value: emprestados.length,
                color: "var(--warning)",
                bg: "var(--warning-subtle)",
                ring: "var(--warning)",
              },
              {
                key: "atraso",
                label: "Com atraso",
                value: atrasados.length,
                color: "var(--danger)",
                bg: "var(--danger-subtle)",
                ring: "var(--danger)",
              },
            ] as const
          ).map((s) => {
            const ativo = filtro === s.key;
            return (
              <button
                key={s.label}
                type="button"
                aria-pressed={ativo}
                onClick={() =>
                  setFiltro(
                    s.key === null ? null : filtro === s.key ? null : s.key
                  )
                }
                className="rounded-xl p-3 text-center transition-all cursor-pointer"
                style={{
                  backgroundColor: s.bg,
                  border: `1px solid ${ativo ? s.ring : "var(--border-subtle)"}`,
                  outline: ativo ? `2px solid ${s.ring}` : "2px solid transparent",
                  outlineOffset: 1,
                }}
              >
                <p
                  className="text-2xl font-bold font-display tabular-nums"
                  style={{ color: s.color }}
                >
                  {s.value}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {s.label}
                </p>
              </button>
            );
          })}
        </motion.div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="card divide-y divide-[var(--border-subtle)]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-10" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
              <Skeleton className="h-3 w-2/3 ml-11" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card p-14 text-center"
        >
          <CheckCircle2
            size={44}
            strokeWidth={1}
            className="mx-auto mb-4"
            style={{ color: "var(--success)" }}
          />
          <p
            className="text-sm font-semibold font-display"
            style={{ color: "var(--text-primary)" }}
          >
            Nenhum exemplar ausente
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Todos os exemplares inventariados foram encontrados.
          </p>
        </motion.div>
      )}

      {/* Items list */}
      {!loading && items.length > 0 && (
        <div className="card overflow-hidden">
          {/* Atrasados first */}
          {showAtraso && atrasados.length > 0 && (
            <div>
              <div
                className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2"
                style={{
                  backgroundColor: "var(--danger-subtle)",
                  borderBottom: "1px solid var(--border-subtle)",
                  color: "var(--danger)",
                }}
              >
                <AlertTriangle size={11} />
                Em atraso ({atrasados.length})
              </div>
              {atrasados.map((item, i) => (
                <NaoEncontradoRow key={item.neExemplarId} item={item} index={i} />
              ))}
            </div>
          )}

          {/* Emprestados (em dia) */}
          {showEmDia && emDiaCount > 0 && (
            <div>
              <div
                className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2"
                style={{
                  backgroundColor: "var(--warning-subtle)",
                  borderBottom: "1px solid var(--border-subtle)",
                  borderTop: atrasados.length > 0 ? "1px solid var(--border)" : "none",
                  color: "var(--warning)",
                }}
              >
                <Clock size={11} />
                Emprestados — em dia ({emDiaCount})
              </div>
              {emprestados
                .filter((i) => i.neMotivo.tag === "Emprestado" && i.neMotivo.situacao.tag !== "Atrasado")
                .map((item, i) => (
                  <NaoEncontradoRow key={item.neExemplarId} item={item} index={i} />
                ))}
            </div>
          )}

          {/* Outro motivo */}
          {showOutros && outroMotivo.length > 0 && (
            <div>
              <div
                className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest"
                style={{
                  backgroundColor: "var(--surface)",
                  borderBottom: "1px solid var(--border-subtle)",
                  borderTop:
                    emprestados.length > 0 ? "1px solid var(--border)" : "none",
                  color: "var(--text-muted)",
                }}
              >
                Outros motivos ({outroMotivo.length})
              </div>
              {outroMotivo.map((item, i) => (
                <NaoEncontradoRow key={item.neExemplarId} item={item} index={i} />
              ))}
            </div>
          )}

          {/* Filtro sem resultados */}
          {nadaVisivel && (
            <div className="p-8 text-center">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Nenhum item nesta categoria.
              </p>
              <button
                type="button"
                onClick={() => setFiltro(null)}
                className="text-xs underline underline-offset-2 mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                ver todos
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NaoEncontradoRow({
  item,
  index,
}: {
  item: ExemplarNaoEncontrado;
  index: number;
}) {
  const isAtrasado =
    item.neMotivo.tag === "Emprestado" &&
    item.neMotivo.situacao.tag === "Atrasado";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-start gap-4 px-4 py-4 table-row-hover"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      {/* Book icon */}
      <div
        className="w-9 h-11 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          backgroundColor: isAtrasado
            ? "var(--danger-subtle)"
            : "var(--surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <BookOpen
          size={15}
          strokeWidth={1.5}
          style={{ color: isAtrasado ? "var(--danger)" : "var(--text-muted)" }}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start gap-2 flex-wrap">
          <p
            className="text-sm font-semibold font-display leading-snug"
            style={{ color: "var(--text-primary)" }}
          >
            {item.neTitulo}
          </p>
          <span
            className="text-[10px] font-mono mt-0.5 flex-shrink-0"
            style={{ color: "var(--text-muted)" }}
          >
            #{item.neExemplarId} · {item.neCodigo}
          </span>
        </div>
        <MotivoDisplay motivo={item.neMotivo} />
      </div>
    </motion.div>
  );
}
